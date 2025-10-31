/**
 * 文档树插件 - UI容器模块
 * 负责创建和注入文档树管理器的UI外壳到Orca侧边栏中
 */

let folderTreeShell = null;

/**
 * 创建并注入可隐藏容器到目标元素
 * @param {Element} targetElement - 目标容器元素
 * @returns {Element} 返回注入的可隐藏容器DOM元素
 */
function injectHideableContainer(targetElement) {
  // 创建 .orca-hideable 容器，添加特定类名以便CSS精确控制
  const hideableContainer = document.createElement('div');
  hideableContainer.className = 'orca-hideable plugin-folder-tree-hideable';

  // 创建 .plugin-folder-tree-container 元素
  // 借用orca-favorites-list样式，性质是相同的
  const folderTreeContainer = document.createElement('div');
  folderTreeContainer.className = 'plugin-folder-tree-container orca-favorites-list';

  // 创建 .plugin-folder-tree-content 元素
  // 借用orca-favorites-items样式，性质是相同的
  const folderTreeContent = document.createElement('div');
  folderTreeContent.className = 'plugin-folder-tree-content orca-favorites-items';

  // 组装结构
  folderTreeContainer.appendChild(folderTreeContent);
  hideableContainer.appendChild(folderTreeContainer);

  // 注入到.orca-sidebar-tabs
  targetElement.insertBefore(hideableContainer, targetElement.firstChild);

  // 返回带有子元素引用的对象，链式调用
  return {
    element: hideableContainer,
    folderTreeContainer: {
      element: folderTreeContainer,
      folderTreeContent: {
        element: folderTreeContent
      }
    }
  };
}

/**
 * 注入文档树管理器外壳，包括创建和注入基本UI外壳
 * @returns {Promise<Object|null>} 返回外壳对象或null
 */
async function injectFolderTreeShell() {
  try {
    const sidebarTabsEl = document.querySelector('.orca-sidebar-tabs');
    const sidebarTabOptionsEl = document.querySelector('.orca-sidebar-tab-options');

    if (!sidebarTabsEl || !sidebarTabOptionsEl) {
      console.error('[Folder Tree] 无法找到侧边栏元素');
      return null;
    }

    // 注入侧边栏内容外壳和tab-option
    const hideableContainer = injectHideableContainer(sidebarTabsEl);
    const tabOptionEl = document.createElement('div');
    tabOptionEl.className = 'orca-segmented-item plugin-folder-tree-tab-option';
    tabOptionEl.textContent = '文档树';
    sidebarTabOptionsEl.appendChild(tabOptionEl);

    // 监听点击tab-option事件
    sidebarTabOptionsEl.addEventListener('click', (e) => {
      // 如果点击的是文档树tab-option
      if (e.target.classList.contains('plugin-folder-tree-tab-option')) {
        if (!sidebarTabOptionsEl.classList.contains('plugin-folder-tree-selected')) {
          // 移除其他插件的选中标记（让CSS来控制显示/隐藏）
          hideOtherPlugins(sidebarTabOptionsEl, 'plugin-folder-tree-selected');
          // 设置选中状态（CSS会自动处理显示/隐藏）
          sidebarTabOptionsEl.classList.add('plugin-folder-tree-selected');
          tabOptionEl.classList.add('orca-selected');
        } else {
          // 取消选中状态
          sidebarTabOptionsEl.classList.remove('plugin-folder-tree-selected');
          tabOptionEl.classList.remove('orca-selected');
        }
      } else {
        // 点击其他tab时，取消文档树的选中状态
        if (sidebarTabOptionsEl.classList.contains('plugin-folder-tree-selected')) {
          sidebarTabOptionsEl.classList.remove('plugin-folder-tree-selected');
          tabOptionEl.classList.remove('orca-selected');
        }
      }
    });

    // 保存完整的外壳对象到全局变量并返回
    folderTreeShell = {
      parentElement: sidebarTabOptionsEl,
      tabOptionEl: tabOptionEl,
      hideableContainerEl: hideableContainer.element,
      folderTreeContainerEl: hideableContainer.folderTreeContainer.element,
      folderTreeContentEl: hideableContainer.folderTreeContainer.folderTreeContent.element,
    };

    // 初始隐藏（由CSS控制，不需要直接设置）

    console.log('[Folder Tree] 外壳注入成功');

  } catch (error) {
    console.error('[Folder Tree] 外壳注入失败:', error);
  }

  return folderTreeShell;
}

/**
 * 移除其他插件的选中标记（让CSS来控制显示/隐藏，不直接操作DOM）
 * @param {Element} sidebarTabOptionsEl - 侧边栏选项容器
 * @param {string} selectedClass - 选中的CSS类名
 */
function hideOtherPlugins(sidebarTabOptionsEl, selectedClass) {
  // 只移除其他插件的选中标记类，让每个插件的CSS规则自己控制显示/隐藏
  // 不直接操作其他插件容器的 display 属性，避免与 tabsman 等插件冲突
  sidebarTabOptionsEl.classList.forEach(className => {
    if (className.includes('-selected') && className !== selectedClass) {
      sidebarTabOptionsEl.classList.remove(className);
    }
  });
}

/**
 * 清理所有注入的文档树管理器外壳
 */
function cleanupFolderTreeShell() {
  if (folderTreeShell) {
    try {
      // 移除tab-option
      if (folderTreeShell.tabOptionEl && folderTreeShell.parentElement) {
        folderTreeShell.parentElement.removeChild(folderTreeShell.tabOptionEl);
      }

      // 移除hideable容器
      if (folderTreeShell.hideableContainerEl && folderTreeShell.hideableContainerEl.parentNode) {
        folderTreeShell.hideableContainerEl.parentNode.removeChild(folderTreeShell.hideableContainerEl);
      }

      console.log('[Folder Tree] 外壳清理完成');
    } catch (error) {
      console.error('[Folder Tree] 外壳清理失败:', error);
    }

    folderTreeShell = null;
  }
}

/**
 * 获取文档树容器元素
 * @returns {Element|null} 文档树容器元素
 */
function getFolderTreeContainer() {
  return folderTreeShell?.folderTreeContentEl || null;
}

/**
 * 检查文档树是否显示
 * @returns {boolean} 是否显示
 */
function isFolderTreeVisible() {
  if (!folderTreeShell?.hideableContainerEl) return false;
  // 检查是否被选中（CSS会控制显示/隐藏）
  const sidebarTabOptionsEl = document.querySelector('.orca-sidebar-tab-options');
  return sidebarTabOptionsEl?.classList.contains('plugin-folder-tree-selected') || false;
}

/**
 * 显示文档树
 */
function showFolderTree() {
  if (folderTreeShell) {
    const sidebarTabOptionsEl = document.querySelector('.orca-sidebar-tab-options');
    if (sidebarTabOptionsEl) {
      hideOtherPlugins(sidebarTabOptionsEl, 'plugin-folder-tree-selected');
      sidebarTabOptionsEl.classList.add('plugin-folder-tree-selected');
      folderTreeShell.tabOptionEl.classList.add('orca-selected');
      // CSS会自动处理显示，不需要直接设置 display
    }
  }
}

/**
 * 隐藏文档树
 */
function hideFolderTree() {
  if (folderTreeShell) {
    const sidebarTabOptionsEl = document.querySelector('.orca-sidebar-tab-options');
    if (sidebarTabOptionsEl) {
      sidebarTabOptionsEl.classList.remove('plugin-folder-tree-selected');
      folderTreeShell.tabOptionEl.classList.remove('orca-selected');
      // CSS会自动处理隐藏，不需要直接设置 display
    }
  }
}

export {
  injectFolderTreeShell,
  cleanupFolderTreeShell,
  getFolderTreeContainer,
  isFolderTreeVisible,
  showFolderTree,
  hideFolderTree
};