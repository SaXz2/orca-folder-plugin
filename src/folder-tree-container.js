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
  // 创建 .orca-hideable 容器
  const hideableContainer = document.createElement('div');
  hideableContainer.className = 'orca-hideable';

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
          // 设置选中状态
          sidebarTabOptionsEl.classList.add('plugin-folder-tree-selected');
          tabOptionEl.classList.add('orca-selected');
          hideableContainer.element.style.display = 'block';
        } else {
          // 取消选中状态
          sidebarTabOptionsEl.classList.remove('plugin-folder-tree-selected');
          tabOptionEl.classList.remove('orca-selected');
          hideableContainer.element.style.display = 'none';
        }
      } else {
        // 点击其他tab时，取消文档树的选中状态
        if (sidebarTabOptionsEl.classList.contains('plugin-folder-tree-selected')) {
          sidebarTabOptionsEl.classList.remove('plugin-folder-tree-selected');
          tabOptionEl.classList.remove('orca-selected');
          hideableContainer.element.style.display = 'none';
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

    // 初始隐藏
    hideableContainer.element.style.display = 'none';

    console.log('[Folder Tree] 外壳注入成功');

  } catch (error) {
    console.error('[Folder Tree] 外壳注入失败:', error);
  }

  return folderTreeShell;
}

/**
 * 隐藏其他插件内容
 * @param {Element} sidebarTabOptionsEl - 侧边栏选项容器
 * @param {string} selectedClass - 选中的CSS类名
 */
function hideOtherPlugins(sidebarTabOptionsEl, selectedClass) {
  // 只隐藏其他插件的 .orca-hideable 容器，保留Orca默认内容
  document.querySelectorAll('.orca-hideable').forEach(el => {
    // 检查是否是其他插件的容器（通过检查是否包含插件的特定类名）
    const isOtherPlugin = el.querySelector('.plugin-tabsman-container, .plugin-folder-tree-container') &&
                         !el.querySelector('.plugin-folder-tree-container');
    if (isOtherPlugin) {
      el.style.display = 'none';
    }
  });

  // 移除所有其他插件的选中状态
  sidebarTabOptionsEl.querySelectorAll('.orca-segmented-item').forEach(el => {
    if (!el.classList.contains('plugin-folder-tree-tab-option')) {
      el.classList.remove('orca-selected');
    }
  });

  // 移除所有其他插件的选中标记
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
  return folderTreeShell?.hideableContainerEl?.style.display !== 'none';
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
      folderTreeShell.hideableContainerEl.style.display = 'block';
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
    }
    folderTreeShell.hideableContainerEl.style.display = 'none';
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