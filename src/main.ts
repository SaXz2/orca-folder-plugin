import { setupL10N, t } from "./libs/l10n";
import zhCN from "./translations/zhCN";
import { FolderTreeCore, type DirectoryNode } from "./folder-tree-core";
import { showDirectoryPickerDialog } from "./directory-picker";
// @ts-ignore
import { injectFolderTreeShell, cleanupFolderTreeShell } from "./folder-tree-container.js";
import "./folder-tree-renderer";

// 导入样式
import "./styles/folder-tree.css";

let pluginName: string;
let core: FolderTreeCore | null = null;
let renderer: any = null;

/**
 * 插件加载
 */
export async function load(_name: string) {
  pluginName = _name;

  console.log(`=== ${pluginName} 加载中 ===`);

  try {
    // 设置国际化
    setupL10N(orca.state.locale, { "zh-CN": zhCN });

    // 注入样式 - 使用Orca的CSS注入方法
    orca.themes.injectCSSResource(`${pluginName}/dist/style.css`, pluginName);

    // 初始化核心模块
    core = new FolderTreeCore();
    const initialized = await core.initialize();
    if (!initialized) {
      throw new Error("核心模块初始化失败");
    }

    // 注入UI容器
    const shell = await injectFolderTreeShell();
    if (!shell) {
      throw new Error("UI容器注入失败");
    }

    // 初始化渲染器
    renderer = new window.FolderTreeRenderer(core);
    await renderer.initialize(shell.folderTreeContentEl);

    // 注册块菜单命令
    registerBlockMenuCommands();

    console.log(`${pluginName} 加载成功`);
    orca.notify("success", "文档树插件加载成功");

  } catch (error) {
    console.error(`[${pluginName}] 加载失败:`, error);
    orca.notify("error", `文档树插件加载失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 注册块菜单命令
 */
function registerBlockMenuCommands() {
  const React = (window as any).React;

  // 核心添加块处理逻辑，包含防重与结果提示
  const handleAddBlocksToTarget = async (
    targetBlockIds: string[],
    targetDirId: string,
    targetDirName: string,
    closeMenu?: () => void
  ) => {
    if (closeMenu) closeMenu();
    if (!core) {
      orca.notify("error", "文档树插件未初始化");
      return;
    }

    const uniqueBlockIds = Array.from(new Set(targetBlockIds.filter(id => Boolean(id))));
    if (uniqueBlockIds.length === 0) return;

    // 检查目标目录下已存在的块（防重）
    const existingChildren = core.getItemChildren(targetDirId);
    const existingBlockIds = new Set(
      existingChildren.filter(item => item.blockId).map(item => item.blockId!)
    );

    const toAdd = uniqueBlockIds.filter(id => !existingBlockIds.has(id));
    const duplicates = uniqueBlockIds.filter(id => existingBlockIds.has(id));

    if (toAdd.length === 0) {
      const msg = uniqueBlockIds.length === 1
        ? `该块已存在于「${targetDirName}」中，无需重复添加`
        : `所选 ${uniqueBlockIds.length} 个块均已存在于「${targetDirName}」中，无需重复添加`;
      orca.notify("info", msg);
      if (renderer) {
        if (typeof renderer.expandItemAndParents === 'function') {
          await renderer.expandItemAndParents(targetDirId);
        }
        if (typeof renderer.render === 'function') {
          renderer.render();
        }
      }
      return;
    }

    let successCount = 0;
    for (const bId of toAdd) {
      const res = await core.addDocumentToDirectory(bId, targetDirId);
      if (res && (res.success || res.item)) {
        successCount++;
      }
    }

    if (successCount > 0) {
      let msg = "";
      if (duplicates.length > 0) {
        msg = `已添加 ${successCount} 个块到「${targetDirName}」（跳过 ${duplicates.length} 个已存在块）`;
      } else {
        msg = successCount === 1
          ? `已添加到「${targetDirName}」`
          : `已添加 ${successCount} 个块到「${targetDirName}」`;
      }
      orca.notify("success", msg);

      if (renderer) {
        if (typeof renderer.expandItemAndParents === 'function') {
          await renderer.expandItemAndParents(targetDirId);
        }
        if (typeof renderer.render === 'function') {
          renderer.render();
        }
      }
    } else {
      orca.notify("error", "添加失败");
    }
  };

  // 递归构建目录菜单
  const buildDirectorySubmenu = (
    dir: DirectoryNode,
    targetBlockIds: string[],
    closeMenu: () => void
  ): any => {
    const hasChildren = dir.children && dir.children.length > 0;

    if (!hasChildren) {
      return React.createElement(orca.components.MenuText, {
        key: dir.id,
        title: dir.name,
        preIcon: dir.icon || (dir.type === 'notebook' ? 'ti ti-notebook' : 'ti ti-folder'),
        onClick: () => handleAddBlocksToTarget(targetBlockIds, dir.id, dir.name, closeMenu)
      });
    }

    const subItems: any[] = [];

    // 添加到当前目录自身
    subItems.push(
      React.createElement(orca.components.MenuText, {
        key: `${dir.id}_self`,
        title: `添加到「${dir.name}」`,
        preIcon: "ti ti-folder-plus",
        onClick: () => handleAddBlocksToTarget(targetBlockIds, dir.id, dir.name, closeMenu)
      })
    );

    subItems.push(
      React.createElement(orca.components.MenuSeparator, { key: `${dir.id}_sep` })
    );

    // 子文件夹
    dir.children.forEach(child => {
      subItems.push(buildDirectorySubmenu(child, targetBlockIds, closeMenu));
    });

    return React.createElement(orca.components.MenuText, {
      key: dir.id,
      title: dir.name,
      preIcon: dir.icon || (dir.type === 'notebook' ? 'ti ti-notebook' : 'ti ti-folder'),
      children: React.createElement(orca.components.Menu, null, subItems)
    });
  };

  // 渲染菜单命令入口
  const renderFolderTreeMenu = (
    targetBlockIds: string[],
    commandTitle: string,
    closeMenu: () => void
  ) => {
    if (!core) return null;

    const directories = core.getDirectoryHierarchy();

    // 如果 Orca 没有 components.Menu / MenuText，则回退到弹窗方案
    if (!orca?.components?.MenuText || !orca?.components?.Menu) {
      return React.createElement('div', {
        onClick: () => {
          closeMenu();
          showDirectoryPickerDialog({
            blockIds: targetBlockIds,
            core: core!,
            onSelect: (targetId, targetName) => {
              handleAddBlocksToTarget(targetBlockIds, targetId, targetName);
            }
          });
        },
        style: { cursor: "pointer", padding: "8px" }
      }, React.createElement('span', null, '📋'), ` ${commandTitle}`);
    }

    if (directories.length === 0) {
      return React.createElement(orca.components.MenuText, {
        title: `${commandTitle} (请先创建笔记本)`,
        preIcon: "ti ti-folder-plus",
        disabled: true
      });
    }

    const menuItems: any[] = [];

    // 目录树
    directories.forEach(dir => {
      menuItems.push(buildDirectorySubmenu(dir, targetBlockIds, closeMenu));
    });

    // 分隔线与弹窗选择器入口
    menuItems.push(React.createElement(orca.components.MenuSeparator, { key: "sep_picker" }));
    menuItems.push(
      React.createElement(orca.components.MenuText, {
        key: "open_picker",
        title: "选择目标目录...",
        preIcon: "ti ti-search",
        onClick: () => {
          closeMenu();
          showDirectoryPickerDialog({
            blockIds: targetBlockIds,
            core: core!,
            onSelect: (targetId, targetName) => {
              handleAddBlocksToTarget(targetBlockIds, targetId, targetName);
            }
          });
        }
      })
    );

    return React.createElement(orca.components.MenuText, {
      title: commandTitle,
      preIcon: "ti ti-folder-plus",
      children: React.createElement(orca.components.Menu, null, menuItems)
    });
  };

  // 注册单个块命令
  orca.blockMenuCommands.registerBlockMenuCommand("folder-tree-add-block", {
    worksOnMultipleBlocks: false,
    render: (blockId: number, rootBlockId: number, close: () => void) => {
      return renderFolderTreeMenu([blockId.toString()], "添加到文档树", close);
    },
  });

  // 注册多个块命令
  orca.blockMenuCommands.registerBlockMenuCommand("folder-tree-add-blocks", {
    worksOnMultipleBlocks: true,
    render: (blockIds: number[], rootBlockId: number, close: () => void) => {
      return renderFolderTreeMenu(
        blockIds.map(id => id.toString()),
        `添加 ${blockIds.length} 个块到文档树`,
        close
      );
    },
  });
}

/**
 * 插件卸载
 */
export async function unload() {
  console.log(`=== ${pluginName} 卸载中 ===`);

  try {
    // 清理块菜单命令
    try {
      orca.blockMenuCommands.unregisterBlockMenuCommand("folder-tree-add-block");
      orca.blockMenuCommands.unregisterBlockMenuCommand("folder-tree-add-blocks");
    } catch (error) {
      console.log('清理块菜单命令时出错:', error);
    }

    // 清理渲染器
    renderer = null;

    // 清理UI容器
    cleanupFolderTreeShell();

    // 清理核心模块
    core = null;

    // Orca会自动管理样式清理，无需手动移除

    console.log(`${pluginName} 卸载成功`);
    orca.notify("info", "文档树插件已卸载");

  } catch (error) {
    console.error(`[${pluginName}] 卸载失败:`, error);
  }
}
