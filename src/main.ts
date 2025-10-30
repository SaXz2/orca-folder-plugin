import { setupL10N, t } from "./libs/l10n";
import zhCN from "./translations/zhCN";
import { FolderTreeCore } from "./folder-tree-core";
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
  // 注册单个块命令
  orca.blockMenuCommands.registerBlockMenuCommand("folder-tree-add-block", {
    worksOnMultipleBlocks: false,
    render: (blockId: number, rootBlockId: number, close: () => void) => {
      const handleAddToFolderTree = async () => {
        try {
          if (!core) {
            orca.notify("error", "文档树插件未初始化");
            close();
            return;
          }

          // 获取所有笔记本
          const notebooks = core.getData().notebooks;
          if (notebooks.length === 0) {
            orca.notify("error", "请先创建笔记本");
            close();
            return;
          }

          // 添加到第一个笔记本
          const success = await core.addDocumentToNotebook(blockId.toString(), notebooks[0].id);
          if (success) {
            orca.notify("success", "已添加到文档树");
          } else {
            orca.notify("error", "添加失败");
          }
          close();
        } catch (error) {
          console.error("Add to folder tree error:", error);
          orca.notify("error", "添加到文档树失败");
          close();
        }
      };

      return window.React.createElement('div', {
        onClick: handleAddToFolderTree,
        style: { cursor: "pointer", padding: "8px" }
      }, window.React.createElement('span', null, '📋'), ' 添加到文档树');
    },
  });

  // 注册多个块命令
  orca.blockMenuCommands.registerBlockMenuCommand("folder-tree-add-blocks", {
    worksOnMultipleBlocks: true,
    render: (blockIds: number[], rootBlockId: number, close: () => void) => {
      const handleAddMultipleToFolderTree = async () => {
        try {
          if (!core) {
            orca.notify("error", "文档树插件未初始化");
            close();
            return;
          }

          const notebooks = core.getData().notebooks;
          if (notebooks.length === 0) {
            orca.notify("error", "请先创建笔记本");
            close();
            return;
          }

          // 批量添加块
          let successCount = 0;
          for (const blockId of blockIds) {
            const success = await core.addDocumentToNotebook(blockId.toString(), notebooks[0].id);
            if (success) successCount++;
          }

          if (successCount > 0) {
            orca.notify("success", `已添加 ${successCount} 个块到文档树`);
          } else {
            orca.notify("error", "添加失败");
          }
          close();
        } catch (error) {
          console.error("Add multiple to folder tree error:", error);
          orca.notify("error", "批量添加到文档树失败");
          close();
        }
      };

      return window.React.createElement('div', {
        onClick: handleAddMultipleToFolderTree,
        style: { cursor: "pointer", padding: "8px" }
      }, window.React.createElement('span', null, '📋'), ` 添加 ${blockIds.length} 个块到文档树`);
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
