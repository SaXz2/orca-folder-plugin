/**
 * 文档树插件 - 渲染器模块
 * 负责渲染文档树的UI界面
 */

import { FolderTreeCore } from "./folder-tree-core";

declare global {
  interface Window {
    FolderTreeRenderer: any;
  }
}

class FolderTreeRenderer {
  private core: FolderTreeCore;
  private container: HTMLElement | null = null;
  private data: any = null;
  private expandedItems: Set<string> = new Set();
  private selectedItems: Set<string> = new Set();
  private currentDraggedBlockId: string | null = null;
  private currentDraggedItem: { id: string; type: string } | null = null;
  private updatingIcons: Set<string> = new Set(); // 正在更新图标的项目ID集合

  constructor(core: FolderTreeCore) {
    this.core = core;
    this.setupGlobalDragListener();
  }

  /**
   * 设置全局拖拽监听器，捕获从 Orca 块拖拽的事件
   */
  private setupGlobalDragListener(): void {
    document.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      
      // 检查是否是拖拽块的手柄
      if (target.classList.contains('orca-block-handle') || target.closest('.orca-block-handle')) {
        const handleElement = target.classList.contains('orca-block-handle') 
          ? target 
          : target.closest('.orca-block-handle');
        
        if (handleElement) {
          // 查找父元素 .orca-block.orca-container
          let blockContainer = handleElement.parentElement;
          
          while (blockContainer && !blockContainer.classList.contains('orca-block')) {
            blockContainer = blockContainer.parentElement;
          }
          
          if (blockContainer && blockContainer.classList.contains('orca-container')) {
            const blockId = blockContainer.getAttribute('data-id');
            
            if (blockId && /^\d+$/.test(blockId)) {
              console.log('[Folder Tree] Captured dragging block ID:', blockId);
              this.currentDraggedBlockId = blockId;
              
              // 设置拖拽数据
              if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', blockId);
              }
            }
          }
        }
      }
    }, true);

    // 拖拽结束时清除
    document.addEventListener('dragend', () => {
      this.currentDraggedBlockId = null;
    }, true);
  }

  async initialize(container: HTMLElement): Promise<void> {
    this.container = container;
    this.data = this.core.getData();
    this.expandedItems = new Set(this.core.getExpandedItems());
    this.selectedItems = new Set(this.core.getSelectedItems());

    this.core.addChangeListener(() => {
      this.update();
    });

    this.render();
  }

  render(): void {
    if (!this.container) return;
    this.data = this.core.getData();
    this.container.innerHTML = '';

    const content = this.createContent();
    this.container.appendChild(content);

    const footer = this.createFooter();
    this.container.appendChild(footer);
  }

  update(): void {
    this.render();
  }

  private createFooter(): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'folder-tree-actions';

    const createNotebookBtn = this.createButton('创建笔记本', this.createNotebookIcon(), () => this.showCreateNotebookInput());

    actions.appendChild(createNotebookBtn);

    return actions;
  }

  private createButton(title: string, svg: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'folder-tree-btn';
    btn.innerHTML = svg;
    btn.title = title;
    btn.onclick = onClick;
    return btn;
  }

  private createPlusIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
  }

  private createNotebookIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="12 2 12 8 18 8"/></svg>';
  }

  private createDocumentIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  }

  
  private createFolderIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6M9 14h6"/></svg>';
  }

  
  private createContent(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'plugin-folder-tree-content orca-favorites-items';

    // 设置内容区域的拖拽处理
    this.setupContentDropZone(content);

    // 获取所有根级项目（包括笔记本和文档）
    const rootItems = this.core.getRootItems();

    if (rootItems.length === 0) {
      content.appendChild(this.createEmptyState());
    } else {
      // 渲染所有根级项目
      rootItems.forEach(item => {
        const itemEl = this.createItemElement(item, 0);
        content.appendChild(itemEl);
      });
    }

    return content;
  }

  private createEmptyState(): HTMLElement {
    const empty = document.createElement('div');
    empty.className = 'folder-tree-empty';
    empty.innerHTML = `
      <div class="folder-tree-empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
        </svg>
      </div>
      <div>暂无笔记本</div>
      <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">
        拖拽块到此处或点击 + 按钮创建
      </div>
    `;
    return empty;
  }

  /**
   * 创建统一的项目元素（笔记本、文件夹或文档）
   */
  private createItemElement(item: any, level: number): HTMLElement {
    const itemEl = document.createElement('div');
    
    // 根据类型添加对应的class
    if (item.type === 'notebook') {
      itemEl.className = 'folder-tree-notebook';
    } else if (item.type === 'folder') {
      itemEl.className = 'folder-tree-folder';
    } else {
      itemEl.className = 'folder-tree-document';
    }

    const isExpanded = this.expandedItems.has(item.id);
    // 通过 core 获取真实的子项数量，而不是依赖 item.children（可能不存在）
    const childrenCount = (item.type === 'notebook' || item.type === 'folder')
      ? this.core.getItemChildren(item.id).length
      : 0;
    const hasChildren = childrenCount > 0;
    const isSelected = this.selectedItems.has(item.id);

    // 创建项目头部
    const headerEl = this.createItemHeader(item, isExpanded, isSelected, level, hasChildren);
    itemEl.appendChild(headerEl);

    // 如果是展开的容器类型，添加子元素
    if (isExpanded && hasChildren) {
      const childrenEl = this.createChildrenElement(item.id, level + 1);
      itemEl.appendChild(childrenEl);
    }

    return itemEl;
  }

  /**
   * 创建项目头部元素
   */
  private createItemHeader(item: any, isExpanded: boolean, isSelected: boolean, level: number, hasChildren: boolean): HTMLElement {
    const isContainer = item.type === 'notebook' || item.type === 'folder';

    // 统一使用 folder-tree-item 类，为不同类型添加特殊标识
    const isRoot = item.parentId === null;
    const isParent = hasChildren;
    const notebookClass = item.type === 'notebook' ? ' is-notebook' : '';
    const rootClass = isRoot ? ' is-root' : '';
    const parentClass = isParent ? ' is-parent' : ' is-child';
    const selectedClass = isSelected ? ' selected' : '';
    const header = document.createElement('div');
    header.className = `folder-tree-item${notebookClass}${rootClass}${parentClass}${selectedClass}`.trim();
    header.setAttribute('data-id', item.id);
    header.setAttribute('data-level', level.toString());
    // 缩进由 CSS 控制，不设置内联样式

    // 展开/折叠图标
    const expandIcon = hasChildren
      ? `<i class="ti ti-chevron-right folder-tree-expand-icon ${isExpanded ? 'expanded' : ''}"></i>`
      : '<span style="width: 14px; display: inline-block;"></span>';

    // 项目图标（已经包含了完整的HTML结构）
    const itemIcon = this.getItemIcon(item);

    // 构建HTML - 统一使用 folder-tree-item-* 类
    header.innerHTML = `
      ${expandIcon}
      ${itemIcon}
      <span class="folder-tree-item-name">${this.escapeHtml(item.name)}</span>
      <div class="folder-tree-item-actions">
        <button class="folder-tree-btn" title="重命名">
          <i class="ti ti-pencil"></i>
        </button>
      </div>
    `;

    // 设置事件处理
    this.setupItemEvents(header, item);

    return header;
  }

  /**
   * 获取项目图标
   */
  private getItemIcon(item: any): string {
    // 根据类型和保存的图标信息生成图标
    let iconHtml: string;
    const isRootItem = item.parentId === null; // 根级项目判断

    if (item.type === 'notebook') {
      iconHtml = `<i class="ti ti-notebook"></i>`;
    } else if (item.type === 'folder' && !item.blockId) {
      // 纯文件夹（无 blockId）使用文件夹图标
      iconHtml = `<i class="ti ti-folder"></i>`;
    } else if (item.icon) {
      // 使用保存的图标（可能是 Tabler 或 emoji）
      if (item.icon.startsWith('ti ')) {
        iconHtml = `<i class="${item.icon}"></i>`;
      } else {
        iconHtml = item.icon;
      }
    } else if (item.blockId && item.type === 'document') {
      // 如果有 blockId 但没有保存的图标，异步获取块信息并更新图标
      this.updateIconForItemAsync(item);
      // 先显示默认图标，等异步更新完成后再刷新
      iconHtml = `<i class="ti ti-cube"></i>`;
    } else {
      // 默认使用立方体图标（文档）
      iconHtml = `<i class="ti ti-cube"></i>`;
    }

    // 处理颜色：
    // 1. 如果有 item.color（从 _color 属性读取），应用到图标的 color 属性
    // 2. 背景色逻辑保持不变：根级项目不应用颜色，非根级项目应用默认颜色 #d6d6d6
    const hasCustomColor = !!item.color;
    const shouldApplyBgColor = !isRootItem;
    
    let iconStyle = '';
    const styleParts: string[] = [];
    
    // 应用自定义颜色到 color 属性
    if (item.color) {
      styleParts.push(`color: ${item.color}`);
    }
    
    // 应用背景色（非根级项目的默认背景色）
    if (shouldApplyBgColor) {
      const bgColor = item.color || '#d6d6d6';
      styleParts.push(`background-color: oklch(from ${bgColor} calc(1.2 * l) c h / 25%)`);
    }
    
    if (styleParts.length > 0) {
      iconStyle = ` style="${styleParts.join('; ')};"`;
    }

    if (item.color || item.icon) {
      console.log('[Folder Tree] 渲染 - 图标:', item.icon, '颜色:', item.color || '(无颜色)', '项目:', item.name, '是否根级:', isRootItem);
    }

    const isTabler = /<i\s+class=\"ti\s+/i.test(iconHtml);
    const iconClass = `folder-tree-item-icon${isTabler ? ' is-tabler' : ''}${shouldApplyBgColor ? ' has-color' : ''}`;

    return `<span class="${iconClass}"${iconStyle}>${iconHtml}</span>`;
  }

  /**
   * 异步更新项目的图标（如果有 blockId 但没有保存的图标）
   */
  private async updateIconForItemAsync(item: any): Promise<void> {
    // 避免重复更新
    if (!item.blockId || item.icon || this.updatingIcons.has(item.id)) {
      return;
    }

    // 标记为正在更新
    this.updatingIcons.add(item.id);

    try {
      const block = await (window as any).orca.invokeBackend('get-block', item.blockId);
      if (!block) {
        return;
      }

      // 获取块属性
      const iconProp = this.findProperty(block, '_icon');
      const reprProp = this.findProperty(block, '_repr');

      let iconClass = 'ti ti-cube';

      // 优先使用 _icon 属性
      if (iconProp && iconProp.type === 1 && iconProp.value && iconProp.value.trim()) {
        iconClass = iconProp.value;
      } else if (block.aliases && block.aliases.length > 0) {
        // 别名块：判断是页面还是标签
        const hideProp = this.findProperty(block, '_hide');
        iconClass = hideProp && hideProp.value ? 'ti ti-file' : 'ti ti-hash';
      } else if (reprProp && reprProp.value && reprProp.value.type) {
        // 根据 _repr 类型推断图标
        iconClass = this.getIconByBlockType(reprProp.value.type, reprProp.value);
      }

      // 更新文档的图标
      if (iconClass !== 'ti ti-cube' || item.icon !== iconClass) {
        await this.core.updateDocumentIcon(item.id, iconClass);
        // 重新渲染该项目
        this.updateItemIconInDOM(item.id, iconClass);
      }
    } catch (error) {
      console.error('[Folder Tree] 更新图标失败:', error, 'item:', item.id);
    } finally {
      // 移除更新标记
      this.updatingIcons.delete(item.id);
    }
  }

  /**
   * 更新 DOM 中的图标显示（局部更新）
   */
  private updateItemIconInDOM(itemId: string, iconClass: string): void {
    const itemEl = this.container?.querySelector(`[data-id="${itemId}"]`) as HTMLElement | null;
    if (!itemEl) return;

    const iconEl = itemEl.querySelector('.folder-tree-item-icon') as HTMLElement | null;
    if (!iconEl) return;

    // 获取原图标的样式（保留颜色等）
    const originalStyle = iconEl.getAttribute('style') || '';
    
    // 更新图标 HTML
    const iconHtml = `<i class="${iconClass}"></i>`;
    const isTabler = iconClass.startsWith('ti ');
    const wrapperClass = `folder-tree-item-icon${isTabler ? ' is-tabler' : ''}${iconEl.classList.contains('has-color') ? ' has-color' : ''}`;
    
    // 保留原有样式
    iconEl.outerHTML = `<span class="${wrapperClass}"${originalStyle ? ` style="${originalStyle}"` : ''}>${iconHtml}</span>`;
  }

  /**
   * 根据块类型获取图标（参考 tabsman 的逻辑）
   * @param blockType - 块类型（从 _repr 属性读取）
   * @param reprValue - _repr 属性的值，可能包含额外信息（如 heading 的 level）
   * @returns 图标类名
   */
  private getIconByBlockType(blockType: string, reprValue?: any): string {
    switch (blockType) {
      case 'journal':
        return 'ti ti-calendar-smile';
      case 'heading':
        // 根据标题级别选择不同的图标
        const headingLevel = reprValue?.level || 1;
        switch (headingLevel) {
          case 1: return 'ti ti-h-1';
          case 2: return 'ti ti-h-2';
          case 3: return 'ti ti-h-3';
          case 4: return 'ti ti-h-4';
          default: return 'ti ti-h-1';
        }
      case 'text':
        return 'ti ti-cube';
      case 'ul':
        return 'ti ti-list';
      case 'ol':
        return 'ti ti-list-numbers';
      case 'task':
        return 'ti ti-checkbox';
      case 'code':
        return 'ti ti-code';
      case 'quote2':
        return 'ti ti-blockquote';
      case 'image':
        return 'ti ti-photo';
      default:
        return 'ti ti-cube';
    }
  }

  /**
   * 设置项目事件处理
   */
  private setupItemEvents(header: HTMLElement, item: any): void {
    const expandIcon = header.querySelector('.folder-tree-expand-icon') as HTMLElement;

    // 如果有展开图标，设置点击事件
    if (expandIcon) {
    expandIcon.onclick = (e) => {
      e.stopPropagation();
        this.toggleItem(item.id);
      };
    }

    // 整个条目点击事件
    header.onclick = (e) => {
      // 先选中
      this.selectItem(item.id);

      // 特殊处理：文档嵌套文档的父块（folder 且有 blockId）应该跳转而不是展开
      if (item.type === 'folder' && item.blockId) {
        // 有子项的文档：跳转
        this.goToBlockWithAlias(item.blockId);
        return;
      }

      // 判断是容器类型且可以展开/折叠
      const isContainer = item.type === 'notebook' || (item.type === 'folder' && expandIcon);
      if (isContainer) {
        // 容器类型：展开/折叠
        this.toggleItem(item.id);
      } else if (item.blockId) {
        // 有 blockId 的文档：跳转
        this.goToBlockWithAlias(item.blockId);
      }
    };

    // 中键点击：仅切换展开/折叠
    header.addEventListener('auxclick', (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        // 笔记本、文件夹（包括查询块）都可以折叠，即使没有子项
        if (item.type === 'notebook' || item.type === 'folder') {
          this.toggleItem(item.id);
        }
      }
    });

    // 添加右键菜单
    header.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e, item.id, item.type);
    };

    // 重命名按钮事件
    const renameBtn = header.querySelector('.folder-tree-item-actions button') as HTMLElement;
    if (renameBtn) {
      renameBtn.onclick = (e) => {
      e.stopPropagation();
        this.renameItem(item.id, item.type);
    };
    }

    // 设置拖拽
    this.setupDragDrop(header, item.id, item.type);
  }

  private setupContentDropZone(content: HTMLElement): void {
    // 设置整个内容区域为拖拽接收区
    content.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    // 使用捕获阶段处理，允许拖到根级空白区域创建根级文档
    content.addEventListener('drop', async (e) => {
      const target = e.target as HTMLElement;
      
      // 检查是否真的拖到了根级空白区域（不是任何项目或子区域）
      const clickedOnItem = target.closest('.folder-tree-item');
      const clickedOnChildrenArea = target.closest('.folder-tree-items');
      
      // 如果拖到了具体项目或子区域，不处理（让子元素处理）
      if (clickedOnItem || clickedOnChildrenArea) {
        return;
      }

      // 确认拖到的是 content 区域内的空白区域
      if (!content.contains(target) && target !== content) {
        return;
      }

      // 获取拖拽数据
      const draggedData = e.dataTransfer!.getData('text/plain');
      const blockId = this.currentDraggedBlockId || (draggedData && /^\d+$/.test(draggedData) ? draggedData : null);
      
      // 如果从编辑区拖拽块到根级空白区域，创建根级文档
      if (blockId && /^\d+$/.test(blockId)) {
        e.preventDefault();
        e.stopPropagation(); // 阻止子元素处理
        console.log('[Folder Tree] Dropping block to root level, creating root document:', blockId);
        await this.createDocumentFromBlock(blockId, null);
        this.currentDraggedBlockId = null;
        return;
      }

      // 如果是文档ID（document_ 开头），允许移动到根级（用于提升文档层级）
      if (draggedData && (draggedData.startsWith('document_') || draggedData.startsWith('folder_'))) {
        const draggedDoc = this.core.getDocumentById(draggedData);
        if (draggedDoc && draggedDoc.parentId !== null) {
          e.preventDefault();
          e.stopPropagation(); // 阻止子元素处理
          const success = await this.core.moveItem(draggedData, null);
          if (success) {
            (window as any).orca.notify('success', '移动到根级成功');
            this.render();
          } else {
            (window as any).orca.notify('error', '移动失败');
          }
          return;
        }
      }
    }, true); // 使用捕获阶段

    // 添加右键菜单支持在根级别创建文档
    content.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showRootContextMenu(e);
    };
  }

  private setupDragDrop(element: HTMLElement, targetId: string, targetType: string): void {
    element.draggable = true;

    element.ondragstart = (e) => {
      e.dataTransfer!.setData('text/plain', targetId);
      e.dataTransfer!.effectAllowed = 'move';
      element.classList.add('dragging');
      
      // 记录当前拖拽的项目
      this.currentDraggedItem = { id: targetId, type: targetType };
    };

    element.ondragend = async (e) => {
      element.classList.remove('dragging');
      
      // 检查是否拖出了容器
      if (this.currentDraggedItem && targetType !== 'notebook') {
        const containerRect = this.container?.getBoundingClientRect();
        if (containerRect) {
          const isOutside = e.clientX < containerRect.left || 
                           e.clientX > containerRect.right || 
                           e.clientY < containerRect.top || 
                           e.clientY > containerRect.bottom;
          
          if (isOutside) {
            // 拖出容器，删除该文档
            await this.deleteDocument(targetId);
          }
        }
      }
      
      this.currentDraggedItem = null;
      (element as any).dataset.insertIntent = '';
    };

    element.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add('drag-over');

      // 扩大判定范围：顶部/底部各占约35%的高度作为排序插入区
      const rect = element.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const topBand = rect.height * 0.35;
      const bottomBand = rect.height * 0.65; // 下边界起点

      const isBefore = y <= topBand;
      const isAfter = y >= bottomBand;
      const isEmbed = !isBefore && !isAfter;

      element.classList.toggle('drag-insert-before', isBefore);
      element.classList.toggle('drag-insert-after', isAfter);
      element.classList.toggle('drag-embed', isEmbed);
      if (isBefore || isAfter) {
        (element as any).dataset.insertIntent = isBefore ? 'before' : 'after';
      } else {
        (element as any).dataset.insertIntent = '';
      }
    };

    element.ondragleave = () => {
      element.classList.remove('drag-over');
      element.classList.remove('drag-insert-before');
      element.classList.remove('drag-insert-after');
      element.classList.remove('drag-embed');
      (element as any).dataset.insertIntent = '';
    };

    element.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');
      element.classList.remove('drag-insert-before');
      element.classList.remove('drag-insert-after');
      element.classList.remove('drag-embed');
      const intent = ((element as any).dataset.insertIntent || '') as ('before'|'after'|'');
      (element as any).dataset.insertIntent = '';
      this.handleDrop(e, targetId, targetType, intent === '' ? undefined : intent);
    };
  }

  private createDocumentsElement(notebookId: string): HTMLElement {
    const documentsEl = document.createElement('div');
    documentsEl.className = 'folder-tree-items';

    const documents = this.core.getNotebookDocuments(notebookId);
    documents.forEach(doc => {
      const docEl = this.createDocumentElement(doc, 1);
      documentsEl.appendChild(docEl);
    });

    return documentsEl;
  }

  private createDocumentElement(doc: any, level: number): HTMLElement {
    const docEl = window.document.createElement('div');

    const isExpanded = this.expandedItems.has(doc.id);
    const childrenCount = doc.type === 'folder' ? this.core.getDocumentChildren(doc.id).length : 0;
    const hasChildren = doc.type === 'folder' && childrenCount > 0;
    const isSelected = this.selectedItems.has(doc.id);

    const itemEl = window.document.createElement('div');
    itemEl.className = `folder-tree-item ${isSelected ? 'selected' : ''}`;
    itemEl.setAttribute('data-id', doc.id);

    // 构建 HTML 字符串
    const expandIcon = (doc.type === 'folder' && hasChildren)
      ? `<i class="ti ti-chevron-right folder-tree-expand-icon ${isExpanded ? 'expanded' : ''}"></i>`
      : '<span style="width: 14px; display: inline-block;"></span>';

    // 根据类型和保存的图标信息生成图标
    let iconHtml: string;
    if (doc.type === 'folder' && !doc.blockId) {
      // 纯文件夹（无 blockId）使用文件夹图标
      iconHtml = `<i class="ti ti-folder"></i>`;
    } else if (doc.icon) {
      // 使用保存的图标（可能是 Tabler 或 emoji）
      if (doc.icon.startsWith('ti ')) {
        iconHtml = `<i class="${doc.icon}"></i>`;
      } else {
        iconHtml = doc.icon;
      }
    } else {
      // 默认使用立方体图标（文档）
      iconHtml = `<i class="ti ti-cube"></i>`;
    }

    // 处理颜色：如果有 doc.color，应用到 color 属性，同时保留背景色
    let iconStyle = '';
    const styleParts: string[] = [];
    
    // 应用自定义颜色到 color 属性
    if (doc.color) {
      styleParts.push(`color: ${doc.color}`);
    }
    
    // 应用背景色
    const bgColor = doc.color || '#d6d6d6';
    styleParts.push(`background-color: oklch(from ${bgColor} calc(1.2 * l) c h / 25%)`);
    
    if (styleParts.length > 0) {
      iconStyle = ` style="${styleParts.join('; ')};"`;
    }
    
    if (doc.color || doc.icon) {
      console.log('[Folder Tree] 渲染 - 图标:', doc.icon, '颜色:', doc.color, '文档:', doc.name);
    }

    const isTabler = /<i\s+class=\"ti\s+/i.test(iconHtml);
    const html = [
      expandIcon,
      `<span class="folder-tree-item-icon${isTabler ? ' is-tabler' : ''}${doc.color ? ' has-color' : ''}"${iconStyle}>${iconHtml}</span>`,
      '<span class="folder-tree-item-name">' + this.escapeHtml(doc.name) + '</span>',
      '<div class="folder-tree-item-actions">',
      '<button class="folder-tree-btn" title="重命名">' +
        '<i class="ti ti-pencil"></i>' +
      '</button>',
      '</div>'
    ];

    itemEl.innerHTML = html.join('');

    this.setupDocumentEvents(itemEl, doc);

    docEl.appendChild(itemEl);

    if (doc.type === 'folder' && isExpanded) {
      const childrenEl = this.createChildrenElement(doc.id, level + 1);
      docEl.appendChild(childrenEl);
    }

    return docEl;
  }

  private setupDocumentEvents(itemEl: HTMLElement, document: any): void {
    if (document.type === 'folder') {
      const expandIcon = itemEl.querySelector('.folder-tree-expand-icon') as HTMLElement | null;
      if (expandIcon) {
      expandIcon.onclick = (e) => {
        e.stopPropagation();
          this.toggleItem(document.id);
          this.selectItem(document.id);
        };

        // 中键点击：仅切换展开/折叠
        itemEl.addEventListener('auxclick', (e: MouseEvent) => {
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleItem(document.id);
          }
        });
      }
    }

    itemEl.onclick = () => {
      // 整个条目可点击
      if (document.type === 'folder') {
        // 如果是由文档转成的“父文档”（有 blockId），点击应跳转而不是折叠
        if (document.blockId) {
          this.selectItem(document.id);
          this.goToBlockWithAlias(document.blockId);
        } else {
          this.toggleItem(document.id);
          this.selectItem(document.id);
        }
        return;
      }
      this.selectItem(document.id);
      if (document.blockId) {
        this.goToBlockWithAlias(document.blockId);
      }
    };

    // 添加右键菜单
    itemEl.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e, document.id, document.type);
    };

    const renameBtn = itemEl.querySelector('.folder-tree-item-actions button') as HTMLElement;
    if (renameBtn) {
      renameBtn.onclick = (e) => {
      e.stopPropagation();
        this.renameDocument(document.id);
    };
    }

    this.setupDragDrop(itemEl, document.id, document.type);
  }


  private createChildrenElement(parentId: string, level: number): HTMLElement {
    const childrenEl = document.createElement('div');
    childrenEl.className = 'folder-tree-items';
    childrenEl.setAttribute('data-parent-id', parentId);

    // 允许把文档拖到该父级的空白区域，以便“提升/移动到上一级”
    childrenEl.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { e.dataTransfer!.dropEffect = 'move'; } catch {}
    };

    childrenEl.ondrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dataText = e.dataTransfer!.getData('text/plain');
      if (!dataText) {
        // 支持从 Orca 拖入块到该父级
        if (this.currentDraggedBlockId) {
          await this.createDocumentFromBlock(this.currentDraggedBlockId, parentId);
          this.currentDraggedBlockId = null;
        }
        return;
      }
      // 文档拖入到该父级（用于从子文件夹拖回上一级）
      if (dataText.startsWith('document_')) {
        const draggedDoc = this.core.getDocumentById(dataText);
        if (draggedDoc && draggedDoc.parentId !== parentId) {
          const ok = await this.core.moveDocument(dataText, parentId);
          if (ok) {
            (window as any).orca.notify('success', '移动成功');
            // 若目标父级是 folder/notebook，确保其展开
            if (!this.expandedItems.has(parentId)) {
              this.expandedItems.add(parentId);
            }
            // 局部刷新当前父级的子列表
            const wrapper = childrenEl.parentElement as HTMLElement;
            const existing = wrapper.querySelector(':scope > .folder-tree-items');
            if (existing) existing.remove();
            const fresh = this.createChildrenElement(parentId, level);
            wrapper.appendChild(fresh);
          } else {
            (window as any).orca.notify('error', '移动失败');
          }
        }
      }
    };

    const children = this.core.getItemChildren(parentId);
    // 过滤掉笔记本（笔记本只能在根级显示）
    const filteredChildren = children.filter(child => child.type !== 'notebook');
    filteredChildren.forEach(child => {
      const childEl = this.createItemElement(child, level);
      childrenEl.appendChild(childEl);
    });

    return childrenEl;
  }

  /**
   * 切换项目展开/折叠状态
   */
  private async toggleItem(itemId: string): Promise<void> {
    const willExpand = !this.expandedItems.has(itemId);
    const item = this.core.getItemById(itemId);
    const isQueryBlock = item && (item as any).isQueryBlock;
    
    if (willExpand) {
      this.expandedItems.add(itemId);
      
      // 如果是查询块，展开时更新子项
      if (isQueryBlock && (item as any).queryBlockId) {
        const queryBlockId = (item as any).queryBlockId;
        const queryBlock = await (window as any).orca.invokeBackend('get-block', queryBlockId);
        if (queryBlock) {
          const reprProp = this.findProperty(queryBlock, '_repr');
          let queryBlockRepr = reprProp?.value;
          
          // 如果 value 是字符串，尝试解析它（这通常不应该发生，但为了健壮性）
          if (typeof queryBlockRepr === 'string') {
            try {
              queryBlockRepr = JSON.parse(queryBlockRepr);
            } catch (e) {
              console.error('[Folder Tree] 无法解析 _repr.value:', e);
            }
          }
          
          if (queryBlockRepr && queryBlockRepr.type === 'query') {
            // 更新查询结果的子项
            await this.updateQueryBlockChildren(itemId, queryBlockRepr);
          }
        }
      }
    } else {
      this.expandedItems.delete(itemId);
    }

    await this.core.setExpandedState(Array.from(this.expandedItems));

    // 对于查询块，展开时 updateQueryBlockChildren 内部已触发 render()，折叠时需要手动 render()
    // 对于普通文件夹/笔记本，使用局部更新以避免闪烁
    if (!isQueryBlock) {
      // 局部更新以避免闪烁
      const itemEl = this.container?.querySelector(`[data-id="${itemId}"]`) as HTMLElement | null;
      if (itemEl) {
        const chevron = itemEl.querySelector('.folder-tree-expand-icon') as HTMLElement;
        if (chevron) {
          chevron.classList.toggle('expanded', willExpand);
        }

        // 查找父容器
        const wrapper = itemEl.parentElement as HTMLElement;
        const existing = wrapper.querySelector(':scope > .folder-tree-items') as HTMLElement | null;

        if (willExpand) {
          // 添加子节点
          if (!existing) {
            const children = this.createChildrenElement(itemId, 1);
            wrapper.appendChild(children);
          }
        } else {
          // 移除子节点
          if (existing) {
            existing.remove();
          }
        }
      }
    } else if (!willExpand) {
      // 查询块折叠时需要手动触发 render()
      this.render();
    }
  }

  /**
   * 重命名项目
   */
  private async renameItem(itemId: string, itemType: string): Promise<void> {
    const item = this.core.getItemById(itemId);
    if (!item) return;

    const typeText = itemType === 'notebook' ? '笔记本' :
                    itemType === 'folder' ? '文件夹' : '文档';

    const dialog = this.createInputDialog(
      `重命名${typeText}`,
      `请输入新的${typeText}名称:`,
      item.name
    );
    dialog.show(async (newName: string) => {
      if (newName && newName.trim() && newName !== item.name) {
        const success = await this.core.renameItem(itemId, newName.trim());
        if (success) {
          (window as any).orca.notify('success', '重命名成功');
        } else {
          (window as any).orca.notify('error', '重命名失败');
        }
      }
    });
  }

  /**
   * 重新排序项目（统一处理所有类型）
   */
  private async reorderItems(draggedId: string, targetId: string, insertIntent?: 'before' | 'after'): Promise<boolean> {
    try {
      const draggedItem = this.core.getItemById(draggedId);
      const targetItem = this.core.getItemById(targetId);

      if (!draggedItem || !targetItem) return false;

      // 防止笔记本嵌套：笔记本只能在根级（parentId === null）
      if (draggedItem.type === 'notebook') {
        const targetParentId = targetItem.parentId;
        if (targetParentId !== null) {
          // 尝试将笔记本移动到非根级，拒绝操作
          (window as any).orca.notify('error', '笔记本只能在根级，不能嵌套');
          return false;
        }
      }

      // 确定父级
      const targetParentId = targetItem.parentId;

      // 防止循环引用
      if (this.isAncestor(draggedId, targetId)) {
        (window as any).orca.notify('error', '不能移动到自身的子项中');
        return false;
      }

      if (insertIntent) {
        // 有插入意图，在目标同级排序
        const parentForOrder = targetParentId;

        // 如果不同父级，先移动到目标父级
        if (draggedItem.parentId !== targetParentId) {
          const moved = await this.core.moveItem(draggedId, targetParentId);
          if (!moved) return false;
        }

        // 在同级重新排序
        if (parentForOrder !== null) {
          return await this.reorderItemsInParent(draggedId, targetId, parentForOrder);
        } else {
          // 根级项目排序
          return await this.reorderRootItems(draggedId, targetId, insertIntent);
        }
      } else {
        // 无插入意图，移动到目标内部
        // 防止笔记本嵌套：笔记本不能被移动到任何容器内部
        if (draggedItem.type === 'notebook') {
          (window as any).orca.notify('error', '笔记本只能在根级，不能放入容器内部');
          return false;
        }
        if (targetItem.type === 'document') {
          await this.core.ensureFolder(targetId);
        }
        return await this.core.moveItem(draggedId, targetId);
      }
    } catch (error) {
      console.error('[Folder Tree] 重新排序项目失败:', error);
      return false;
    }
  }

  /**
   * 在指定父级中重新排序项目
   */
  private async reorderItemsInParent(draggedId: string, targetId: string, parentId: string): Promise<boolean> {
    const parent = this.core.getItemById(parentId);
    if (!parent || !parent.children) return false;

    const siblingIds = [...parent.children];
    const draggedIndex = siblingIds.indexOf(draggedId);
    const targetIndex = siblingIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return false;

    // 移动到目标位置
    const [movedId] = siblingIds.splice(draggedIndex, 1);
    siblingIds.splice(targetIndex, 0, movedId);

    return await this.core.reorderItems(parentId, siblingIds);
  }

  /**
   * 重新排序根级项目
   */
  private async reorderRootItems(draggedId: string, targetId: string, insertIntent: 'before' | 'after'): Promise<boolean> {
    const rootItems = this.core.getRootItems();
    const rootIds = rootItems.map(item => item.id);

    const draggedIndex = rootIds.indexOf(draggedId);
    const targetIndex = rootIds.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return false;

    // 移动到目标位置
    const [movedId] = rootIds.splice(draggedIndex, 1);
    const insertIndex = insertIntent === 'before' ? targetIndex : targetIndex + 1;
    rootIds.splice(insertIndex, 0, movedId);

    return await this.core.reorderItems(null, rootIds);
  }

  /**
   * 检查 ancestorId 是否为 nodeId 的祖先
   */
  private isAncestor(ancestorId: string, nodeId: string): boolean {
    if (ancestorId === nodeId) return true;
    let current: any = this.core.getItemById(nodeId);
    const visited = new Set<string>();
    while (current && current.parentId && !visited.has(current.parentId)) {
      if (current.parentId === ancestorId) return true;
      visited.add(current.parentId);
      current = this.core.getItemById(current.parentId);
    }
    return false;
  }

  private async selectItem(itemId: string): Promise<void> {
    // 更新内存状态
    this.selectedItems.clear();
    this.selectedItems.add(itemId);
    await this.core.setSelectedItems(Array.from(this.selectedItems));

    // 最小化更新：仅在DOM中切换选中样式，避免整树重渲染导致样式闪烁
    try {
      // 清除现有选中样式
      const prevSelected = this.container?.querySelectorAll('.folder-tree-item.selected');
      prevSelected?.forEach(el => el.classList.remove('selected'));

      // 给当前项添加选中样式
      const currentItem = this.container?.querySelector(`[data-id="${itemId}"]`);
      if (currentItem) {
        currentItem.classList.add('selected');
      }
    } catch {}
  }

  private showCreateNotebookInput(): void {
    const dialog = this.createInputDialog('创建笔记本', '请输入笔记本名称:', '');
    dialog.show((name: string) => {
      if (name && name.trim()) {
        this.createNotebook(name.trim());
      }
    });
  }

  private async createNotebook(name: string): Promise<void> {
    const notebook = await this.core.createNotebook(name);
    if (notebook) {
      (window as any).orca.notify('success', '笔记本创建成功');
      this.expandedItems.add(notebook.id);
      await this.core.setExpandedState(Array.from(this.expandedItems));
    } else {
      (window as any).orca.notify('error', '笔记本创建失败');
    }
  }

  private showCreateFolderInput(): void {
    // 检查是否有笔记本
    const notebooks = this.core.getRootNotebooks();
    if (notebooks.length === 0) {
      (window as any).orca.notify('error', '请先创建笔记本');
      return;
    }

    // 如果只有一个笔记本，直接在该笔记本中创建
    if (notebooks.length === 1) {
      this.showCreateFolderInNotebook(notebooks[0]);
      return;
    }

    // 如果有选中的笔记本，在选中的笔记本中创建
    const selectedNotebook = Array.from(this.selectedItems)
      .map(id => this.core.getNotebookById(id))
      .find(nb => nb !== null);
    
    if (selectedNotebook) {
      this.showCreateFolderInNotebook(selectedNotebook);
      return;
    }

    // 默认在第一个笔记本中创建
    this.showCreateFolderInNotebook(notebooks[0]);
  }

  private showCreateFolderInNotebook(notebook: any): void {
    const dialog = this.createInputDialog('新建文件夹', `在"${notebook.name}"中创建文件夹:`, '');
    dialog.show((name: string) => {
      if (name && name.trim()) {
        this.createFolder(name.trim(), notebook.id);
      }
    });
  }

  private async createFolder(name: string, notebookId: string): Promise<void> {
    const folder = await this.core.createDocument(name, null, notebookId, 'folder');
    if (folder) {
      (window as any).orca.notify('success', '文件夹创建成功');
      // 确保笔记本展开
      if (!this.expandedItems.has(notebookId)) {
        this.expandedItems.add(notebookId);
      }
      // 展开新创建的文件夹
      this.expandedItems.add(folder.id);
      await this.core.setExpandedState(Array.from(this.expandedItems));
      // 立即重新渲染UI
      this.render();
    } else {
      (window as any).orca.notify('error', '文件夹创建失败');
    }
  }

  private async renameNotebook(notebookId: string): Promise<void> {
    const notebook = this.core.getNotebookById(notebookId);
    if (!notebook) return;

    const dialog = this.createInputDialog('重命名笔记本', '请输入新的笔记本名称:', notebook.name);
    dialog.show(async (newName: string) => {
      if (newName && newName.trim() && newName !== notebook.name) {
        const success = await this.core.renameNotebook(notebookId, newName.trim());
        if (success) {
          (window as any).orca.notify('success', '笔记本重命名成功');
        } else {
          (window as any).orca.notify('error', '笔记本重命名失败');
        }
      }
    });
  }

  private async deleteNotebook(notebookId: string): Promise<void> {
    const notebook = this.core.getNotebookById(notebookId);
    if (!notebook) return;

    if (confirm(`确定要删除笔记本"${notebook.name}"吗？此操作将删除该笔记本下的所有文档。`)) {
      const success = await this.core.deleteNotebook(notebookId);
      if (success) {
        (window as any).orca.notify('success', '笔记本删除成功');
      } else {
        (window as any).orca.notify('error', '笔记本删除失败');
      }
    }
  }

  private async renameDocument(documentId: string): Promise<void> {
    const document = this.core.getDocumentById(documentId);
    if (!document) return;

    const dialog = this.createInputDialog(
      `重命名${document.type === 'folder' ? '文件夹' : '文档'}`,
      `请输入新的${document.type === 'folder' ? '文件夹' : '文档'}名称:`,
      document.name
    );
    dialog.show(async (newName: string) => {
      if (newName && newName.trim() && newName !== document.name) {
        const success = await this.core.renameDocument(documentId, newName.trim());
        if (success) {
          (window as any).orca.notify('success', '重命名成功');
        } else {
          (window as any).orca.notify('error', '重命名失败');
        }
      }
    });
  }

  private async deleteDocument(documentId: string): Promise<void> {
    const document = this.core.getDocumentById(documentId);
    if (!document) return;

    // 直接删除，不提示
      const success = await this.core.deleteDocument(documentId);
      if (success) {
        (window as any).orca.notify('success', '删除成功');
      } else {
        (window as any).orca.notify('error', '删除失败');
    }
  }

  private async handleDrop(
    e: DragEvent,
    targetId: string,
    targetType: string,
    insertIntent?: 'before' | 'after'
  ): Promise<void> {
    // 优先使用捕获的块ID
    let draggedId = this.currentDraggedBlockId || e.dataTransfer!.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;

    console.log('[Folder Tree] handleDrop START - draggedId:', draggedId, 'targetId:', targetId, 'targetType:', targetType, 'insertIntent:', insertIntent);

    // 处理项目排序（统一处理所有类型）
    if (draggedId.startsWith('notebook_') || draggedId.startsWith('document_') || draggedId.startsWith('folder_')) {
      console.log('[Folder Tree] Reordering items');
      const success = await this.reorderItems(draggedId, targetId, insertIntent);
      if (success) {
        (window as any).orca.notify('success', '项目排序成功');
      } else {
        (window as any).orca.notify('error', '项目排序失败');
      }
      this.currentDraggedBlockId = null;
      return;
    }

    // 检查是否是从 Orca 拖拽的块（纯数字ID）
    if (/^\d+$/.test(draggedId)) {
      console.log('[Folder Tree] Creating document from Orca block:', draggedId, 'targetType:', targetType, 'insertIntent:', insertIntent);
      // 有插入意图：在目标同级创建并排序
      if (insertIntent) {
        console.log('[Folder Tree] Block drop with insertIntent - targetType:', targetType);
        const targetDoc = this.core.getDocumentById(targetId);
        console.log('[Folder Tree] targetDoc:', targetDoc);
        
        // 如果是拖到笔记本上，直接创建在笔记本中并排序到首/尾
        if (targetType === 'notebook') {
          console.log('[Folder Tree] Dropping block onto notebook with insertIntent');
          
          const newDocId = await this.createDocumentFromBlock(draggedId, targetId);
          console.log('[Folder Tree] Created document:', newDocId);
          
          if (newDocId) {
            // createDocument 后数据已重新加载，需要重新获取 notebook
            const notebook = this.core.getNotebookById(targetId);
            console.log('[Folder Tree] notebook after create:', notebook);
            
            // 根据 insertIntent 决定插入位置
            const insertIndex = insertIntent === 'before' ? 0 : notebook?.children?.length || 0;
            console.log('[Folder Tree] Moving document to index:', insertIndex, 'current notebook.children:', notebook?.children);
            
            // 文档已经被 createDocument 添加到列表末尾了，需要重新排序
            // 先从列表中移除（如果存在）
            const currentIndex = notebook?.children?.indexOf(newDocId) ?? -1;
            console.log('[Folder Tree] Current index in notebook.children:', currentIndex);
            
            if (notebook && notebook.children && currentIndex !== -1) {
              notebook.children.splice(currentIndex, 1);
            }

            // 插入到指定位置
            if (notebook && notebook.children) {
              notebook.children.splice(insertIndex, 0, newDocId);
              console.log('[Folder Tree] After reordering, notebook.children:', notebook.children);

              // 使用 reorderDocuments 来保存排序（它会更新 order 字段并保存）
              const success = await this.core.reorderDocuments(targetId, notebook.children);
              console.log('[Folder Tree] Reorder result:', success);
              
              if (success) {
                (window as any).orca.notify('success', '移动成功');
                this.render();
    } else {
                (window as any).orca.notify('error', '文档排序失败');
              }
            }
          }
          this.currentDraggedBlockId = null;
          return;
        }
        
        // 拖到文档上的情况
        const parentForNew = targetType === 'document' ? (targetDoc?.parentId || '') : targetId;
        console.log('[Folder Tree] parentForNew:', parentForNew);
        if (!parentForNew) {
          console.log('[Folder Tree] No parentForNew, returning');
          return;
        }
        const newDocId = await this.createDocumentFromBlock(draggedId, parentForNew);
        console.log('[Folder Tree] Created document in parent:', newDocId);
        if (newDocId) {
          const parentForOrder = targetDoc?.parentId || parentForNew;
          console.log('[Folder Tree] Reordering - newDocId:', newDocId, 'targetId:', targetId, 'parentForOrder:', parentForOrder);
          await this.reorderDocuments(newDocId, targetId, parentForOrder);
          this.render();
        }
      } else {
        // 无插入意图：嵌入目标项内部
        console.log('[Folder Tree] Block drop without insertIntent - embedding');
        if (targetType === 'document') {
          await this.core.ensureFolder(targetId);
        }
        await this.createDocumentFromBlock(draggedId, targetId);
      }
      this.currentDraggedBlockId = null;
      return;
    }

    // 检查是否是文档ID（document_开头）
      const draggedDoc = this.core.getDocumentById(draggedId);
    
    if (draggedDoc) {
      const targetDoc = this.core.getDocumentById(targetId);
      // 读取指示线意图（优先采用 setupDragDrop 计算的 insertIntent）
      const dropTargetEl = (e.target as HTMLElement)?.closest('.folder-tree-item') as HTMLElement | null;
      const wantInsertBefore = insertIntent ? insertIntent === 'before' : (!!dropTargetEl && dropTargetEl.classList.contains('drag-insert-before'));
      const wantInsertAfter  = insertIntent ? insertIntent === 'after'  : (!!dropTargetEl && dropTargetEl.classList.contains('drag-insert-after'));

      // 如果明确显示了插入指示线，则优先进行“排序/插入到同级前后”的逻辑
      if (wantInsertBefore || wantInsertAfter) {
        // 在笔记本头上的插入：移动到该笔记本，并放到首/尾
        if (targetType === 'notebook') {
          const nb = this.core.getNotebookById(targetId);
          const insertIndex = wantInsertBefore ? 0 : (nb ? nb.children?.length : undefined);
          const moved = await this.core.moveDocument(draggedId, targetId, insertIndex);
          if (moved) {
            (window as any).orca.notify('success', '移动成功');
            this.render();
          } else {
            (window as any).orca.notify('error', '文档排序失败');
          }
          return;
        }
        const targetParentId = targetDoc ? (targetDoc.parentId || '') : '';
        // 防止把父文件夹移动到其后代的父级下，造成循环
        if (targetParentId && this.isAncestor(draggedId, targetParentId)) {
          (window as any).orca.notify('error', '不能移动到自身的子项中');
          return;
        }
        // 如果不同父级，则先移动到目标父级
        if (targetParentId && draggedDoc.parentId !== targetParentId) {
          const moved = await this.core.moveDocument(draggedId, targetParentId);
          if (!moved) {
            (window as any).orca.notify('error', '移动失败');
            return;
          }
        }
        // 再在同级排序：以 targetId 作为参照
        const parentForOrder = targetDoc?.parentId || draggedDoc.parentId;
        if (parentForOrder) {
          const success = await this.reorderDocuments(draggedId, targetId, parentForOrder);
          if (success) {
            (window as any).orca.notify('success', '文档排序成功');
            this.render();
          } else {
            (window as any).orca.notify('error', '文档排序失败');
          }
        }
      } else if (targetType === 'folder' || (targetDoc && targetDoc.type === 'folder')) {
        // 防止把父文件夹移动到其后代中
        if (this.isAncestor(draggedId, targetId)) {
          (window as any).orca.notify('error', '不能移动到自身的子项中');
          return;
        }
        const success = await this.core.moveDocument(draggedId, targetId);
        if (success) {
          (window as any).orca.notify('success', '移动成功');
          this.render();
        } else {
          (window as any).orca.notify('error', '移动失败');
        }
      } else if ((wantInsertBefore || wantInsertAfter) && targetDoc && draggedDoc.parentId === targetDoc.parentId && draggedDoc.parentId) {
        // 否则仅在同级文档之间进行排序
        const success = await this.reorderDocuments(draggedId, targetId, draggedDoc.parentId);
        if (success) {
          (window as any).orca.notify('success', '文档排序成功');
          this.render();
        } else {
          (window as any).orca.notify('error', '文档排序失败');
        }
      } else {
        // 移动到不同父级；若目标为文档，先转换目标为文件夹
        if (targetType === 'document') {
          await this.core.ensureFolder(targetId);
        }
        // 防止把父文件夹移动到其后代中
        if (this.isAncestor(draggedId, targetId)) {
          (window as any).orca.notify('error', '不能移动到自身的子项中');
          return;
        }
        const success = await this.core.moveDocument(draggedId, targetId);
        if (success) {
          (window as any).orca.notify('success', '移动成功');
          this.render();
        } else {
          (window as any).orca.notify('error', '移动失败');
        }
      }
    } else {
      console.warn('[Folder Tree] Unknown dragged item:', draggedId);
      (window as any).orca.notify('warning', '无法识别拖拽的项目');
    }
    
    this.currentDraggedBlockId = null;
  }

  private async handleOrcaDrop(e: DragEvent): Promise<void> {
    try {
      console.log('[Folder Tree] Handle Orca drop called');

      // 检查是否有笔记本
      const notebooks = this.core.getRootNotebooks();
      if (notebooks.length === 0) {
          (window as any).orca.notify('warning', '请先创建笔记本');
          return;
        }

      // 方法1：优先使用全局监听器捕获的块ID
      if (this.currentDraggedBlockId) {
        console.log('[Folder Tree] Using captured block ID:', this.currentDraggedBlockId);
        await this.createDocumentFromBlock(this.currentDraggedBlockId, notebooks[0].id);
        this.currentDraggedBlockId = null;
        return;
      }

      // 方法2：从 dataTransfer 获取块ID
      const dataText = e.dataTransfer!.getData('text/plain');
      console.log('[Folder Tree] Drag data from dataTransfer:', dataText);

      if (dataText && /^\d+$/.test(dataText)) {
        // 如果是纯数字的块ID
        console.log('[Folder Tree] Found block ID from dataTransfer:', dataText);
        await this.createDocumentFromBlock(dataText, notebooks[0].id);
        return;
      }

      // 方法3：从当前选中的块获取ID
      const selectedBlocks = document.querySelectorAll('.orca-block.orca-container.orca-selected');
      if (selectedBlocks.length > 0) {
        const blockId = selectedBlocks[0].getAttribute('data-id');
        if (blockId && /^\d+$/.test(blockId)) {
          console.log('[Folder Tree] Found block ID from selected block:', blockId);
          await this.createDocumentFromBlock(blockId, notebooks[0].id);
              return;
            }
          }

      // 如果都没有获取到，显示提示
      console.log('[Folder Tree] No block ID found');
      (window as any).orca.notify('info', '请拖拽块的拖拽手柄（左侧图标）到文档树');

    } catch (error) {
      console.error('[Folder Tree] Handle Orca drop error:', error);
      (window as any).orca.notify('error', '拖拽处理失败');
    }
  }

  private async createDocumentFromBlock(blockId: string, targetId: string | null): Promise<string | null> {
    try {
      console.log('[Folder Tree] 正在通过API获取块信息:', blockId);

      // 使用 Orca API 获取块信息，确保能正确处理别名块
      const block = await (window as any).orca.invokeBackend('get-block', blockId);
      if (!block) {
        console.error('[Folder Tree] 无法获取块信息，blockId:', blockId);
        (window as any).orca.notify('error', `无法获取块信息 (ID: ${blockId})`);
        return null;
      }

      console.log('[Folder Tree] 成功获取块信息:', {
        id: block.id,
        text: block.text?.substring(0, 50) + '...',
        aliases: block.aliases,
        isAlias: !!(block.aliases && block.aliases.length > 0)
      });

      // 检测是否是查询块
      const reprProp = this.findProperty(block, '_repr');
      let queryBlockRepr = reprProp?.value;
      
      // 如果 value 是字符串，尝试解析它（这通常不应该发生，但为了健壮性）
      if (typeof queryBlockRepr === 'string') {
        try {
          queryBlockRepr = JSON.parse(queryBlockRepr);
        } catch (e) {
          console.error('[Folder Tree] 无法解析 _repr.value:', e);
        }
      }
      
      const isQueryBlock = queryBlockRepr && queryBlockRepr.type === 'query';
      
      // 调试日志
      if (isQueryBlock) {
        console.log('[Folder Tree] 查询块 _repr:', {
          reprPropType: reprProp?.type,
          reprPropValueType: typeof reprProp?.value,
          queryBlockReprKeys: queryBlockRepr ? Object.keys(queryBlockRepr) : null,
          hasQ: !!queryBlockRepr?.q,
          hasView: !!queryBlockRepr?.view,
          hasViewOpts: !!queryBlockRepr?.viewOpts
        });
      }

      if (isQueryBlock) {
        console.log('[Folder Tree] 检测到查询块，开始处理查询:', blockId);
        return await this.createDocumentFromQueryBlock(blockId, targetId, queryBlockRepr);
      }

      // 优化别名块的名称显示
      let blockName = '未命名文档';
      if (block.aliases && block.aliases.length > 0) {
        // 别名块：使用第一个别名作为名称
        blockName = block.aliases[0];
        console.log('[Folder Tree] 使用别名作为文档名称:', blockName);
      } else if (block.text) {
        // 普通块：使用文本内容
        blockName = block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text;
        console.log('[Folder Tree] 使用块文本作为文档名称:', blockName);
      }

      // 获取块的图标和颜色
      let iconClass = 'ti ti-cube'; // 默认
      let color = '';

      // 获取自定义属性
      const iconProp = this.findProperty(block, '_icon');
      const colorProp = this.findProperty(block, '_color');

      // 读取颜色
      if (colorProp && colorProp.type === 1) {
        color = colorProp.value;
        console.log('[Folder Tree] 读取到颜色:', color, '块ID:', blockId);
      }

      // 读取图标：优先使用 _icon 属性，否则根据 _repr 类型推断
      if (iconProp && iconProp.type === 1 && iconProp.value && iconProp.value.trim()) {
        iconClass = iconProp.value;
        console.log('[Folder Tree] 读取到自定义图标:', iconClass, '块ID:', blockId);
      } else if (block.aliases && block.aliases.length > 0) {
        // 别名块：判断是页面还是标签
        const hideProp = this.findProperty(block, '_hide');
        iconClass = hideProp && hideProp.value ? 'ti ti-file' : 'ti ti-hash';
        console.log('[Folder Tree] 别名块图标:', iconClass, 'hasHide:', !!hideProp, '块ID:', blockId);
      } else if (reprProp && reprProp.value && reprProp.value.type) {
        // 根据 _repr 类型推断图标（参考 tabsman 的逻辑）
        const blockType = reprProp.value.type;
        iconClass = this.getIconByBlockType(blockType, reprProp.value);
        console.log('[Folder Tree] 根据块类型推断图标:', iconClass, '类型:', blockType, '块ID:', blockId);
      } else {
        // 普通块，默认立方体图标
        console.log('[Folder Tree] 普通块，使用默认图标:', iconClass, '块ID:', blockId);
      }

      console.log('[Folder Tree] 最终保存 - 图标:', iconClass, '颜色:', color, '块ID:', blockId, 'targetId:', targetId, '文档名称:', blockName);

      // 创建普通文档（非查询块）
      const document = await this.core.createDocument(blockName, blockId, targetId, 'document', iconClass, color);
      if (document) {
        (window as any).orca.notify('success', '文档导入成功');

        if (targetId && targetId.startsWith('notebook_')) {
          if (!this.expandedItems.has(targetId)) {
            this.expandedItems.add(targetId);
            await this.core.setExpandedState( Array.from(this.expandedItems));
          }
        } else if (targetId) {
          if (!this.expandedItems.has(targetId)) {
            this.expandedItems.add(targetId);
            await this.core.setExpandedState( Array.from(this.expandedItems));
          }
        }
        // 如果 targetId 为 null，表示根级文档，不需要展开任何父级

        // 强制重新渲染UI以确保显示新添加的文档
        setTimeout(() => {
          this.render();
        }, 100);
        return document.id;
      } else {
        (window as any).orca.notify('error', '文档导入失败');
        return null;
      }
    } catch (error) {
      console.error('[Folder Tree] 导入块失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      (window as any).orca.notify('error', `文档导入失败: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 从查询块创建文档并填充查询结果
   */
  private async createDocumentFromQueryBlock(
    queryBlockId: string,
    targetId: string | null,
    queryBlockRepr: any
  ): Promise<string | null> {
    try {
      // 获取查询块信息
      const block = await (window as any).orca.invokeBackend('get-block', queryBlockId);
      if (!block) {
        (window as any).orca.notify('error', `无法获取查询块信息 (ID: ${queryBlockId})`);
        return null;
      }

      // 获取查询块的名称
      let queryName = '查询结果';
      if (block.aliases && block.aliases.length > 0) {
        queryName = block.aliases[0];
      } else if (block.text) {
        queryName = block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text;
      }

      // 获取图标和颜色
      const iconProp = this.findProperty(block, '_icon');
      const colorProp = this.findProperty(block, '_color');
      let iconClass = 'ti ti-search'; // 查询块默认图标
      let color = '';

      if (iconProp && iconProp.type === 1 && iconProp.value && iconProp.value.trim()) {
        iconClass = iconProp.value;
      }

      if (colorProp && colorProp.type === 1) {
        color = colorProp.value;
      }

      // 创建查询块的父文件夹
      const queryFolder = await this.core.createItem(
        queryName,
        'folder',
        queryBlockId,
        targetId,
        iconClass,
        color
      );

      if (!queryFolder) {
        (window as any).orca.notify('error', '创建查询文件夹失败');
        return null;
      }

      // 标记为查询块
      await this.markItemAsQueryBlock(queryFolder.id, queryBlockId);

      // 执行查询并创建动态条目
      await this.updateQueryBlockChildren(queryFolder.id, queryBlockRepr);

      // 展开父级
      if (targetId) {
        if (!this.expandedItems.has(targetId)) {
          this.expandedItems.add(targetId);
          await this.core.setExpandedState(Array.from(this.expandedItems));
        }
      }
      
      // 展开查询文件夹
      if (!this.expandedItems.has(queryFolder.id)) {
        this.expandedItems.add(queryFolder.id);
        await this.core.setExpandedState(Array.from(this.expandedItems));
      }

      (window as any).orca.notify('success', '查询块导入成功');
      
      // 重新渲染
      setTimeout(() => {
        this.render();
      }, 100);

      return queryFolder.id;
    } catch (error) {
      console.error('[Folder Tree] 处理查询块失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      (window as any).orca.notify('error', `查询块处理失败: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 标记项目为查询块
   */
  private async markItemAsQueryBlock(itemId: string, queryBlockId: string): Promise<void> {
    const item = this.core.getItemById(itemId);
    if (!item) return;

    // 直接通过 persistence 更新数据中的查询块标识
    const persistence = (this.core as any).persistence;
    const data = await persistence.loadData();
    const dataItem = data.items.find((i: any) => i.id === itemId);
    if (dataItem) {
      (dataItem as any).isQueryBlock = true;
      (dataItem as any).queryBlockId = queryBlockId;
      await persistence.saveData(data);
    }
  }

  /**
   * 更新查询块的子项（动态文档列表）
   */
  private async updateQueryBlockChildren(queryFolderId: string, queryBlockRepr: any): Promise<void> {
    try {
      // 获取当前查询块的子项
      const existingChildren = this.core.getItemChildren(queryFolderId);
      const existingBlockIds = new Set(
        existingChildren
          .filter(child => child.blockId)
          .map(child => child.blockId!)
      );

      // 执行查询
      // queryBlockRepr 的结构是 {"type":"query", "q": QueryDescription}
      // queryBlockRepr.q 才是完整的查询描述对象（包含 q、sort、page、pageSize 等）
      if (!queryBlockRepr.q) {
        console.error('[Folder Tree] 查询块缺少查询配置');
        return;
      }

      // queryBlockRepr 的结构：
      // {
      //   type: "query",
      //   q: { q: QueryGroup, sort?, ... },  // 查询描述对象（完整的 QueryDescription）
      //   view: "list" | "table" | "card" | "calendar",
      //   viewOpts: {
      //     list: { sort: [...], tagName?: ... },
      //     table: { sort: [...], tagName?: ..., columns: [...] },
      //     ...
      //   },
      //   sfold: boolean
      // }
      
      // 直接使用 queryBlockRepr.q 作为查询参数，它已经是完整的 QueryDescription 对象
      // 包含所有属性：q, sort, page, pageSize, excludeId, tagName, groupBy, group, stats, asTable, asCalendar 等
      const query: any = {
        ...queryBlockRepr.q  // 原封不动展开所有配置
      };

      // 从 viewOpts 中读取排序配置（根据当前 view），如果存在则覆盖
      const view = queryBlockRepr.view || 'list';
      const viewOpts = queryBlockRepr.viewOpts || {};
      const currentViewOpts = viewOpts[view];
      
      if (currentViewOpts && currentViewOpts.sort && Array.isArray(currentViewOpts.sort) && currentViewOpts.sort.length > 0) {
        // 使用当前视图的排序配置（覆盖 queryBlockRepr.q.sort 如果存在）
        query.sort = currentViewOpts.sort;
        console.log('[Folder Tree] 使用视图排序配置:', view, currentViewOpts.sort);
      } else if (query.sort && query.sort.length > 0) {
        // 使用查询描述对象中的排序配置（来自 queryBlockRepr.q.sort）
        console.log('[Folder Tree] 使用查询描述中的排序配置:', query.sort);
      }
      // 如果都没有，不传递 sort 参数，让查询API使用其默认行为

      // 覆盖分页设置，确保加载足够的条目
      query.page = 1;
      query.pageSize = 500;

      console.log('[Folder Tree] 查询配置:', {
        view: view,
        hasSort: !!query.sort,
        sort: query.sort,
        hasQ: !!query.q,
        viewOptsKeys: Object.keys(viewOpts),
        queryBlockRepr_structure: { 
          type: queryBlockRepr.type, 
          hasQ: !!queryBlockRepr.q,
          hasView: !!queryBlockRepr.view,
          hasViewOpts: !!queryBlockRepr.viewOpts
        }
      });

      console.log('[Folder Tree] 执行查询，参数:', JSON.stringify(query, null, 2));
      
      let results: any;
      try {
        results = await (window as any).orca.invokeBackend('query', query);
      } catch (error) {
        console.error('[Folder Tree] 查询执行失败:', error);
        (window as any).orca.notify('error', `查询执行失败: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      
      if (!results || results.length === 0) {
        console.log('[Folder Tree] 查询结果为空');
        // 删除所有不再存在的子项
        for (const child of existingChildren) {
          if (child.blockId) {
            await this.core.deleteItem(child.id);
          }
        }
        // 即使结果为空，也触发渲染以更新UI
        this.render();
        return;
      }

      console.log('[Folder Tree] 查询结果数量:', results.length, '结果:', results);

      // 查询API返回的是块对象数组，不是ID数组
      // 提取块ID列表
      const resultBlocks = Array.isArray(results) ? results : [];
      const resultBlockIds = new Set(
        resultBlocks.map((block: any) => {
          // 如果返回的是块对象，取 id 属性；如果是ID，直接使用
          const id = typeof block === 'object' && block !== null && 'id' in block 
            ? block.id 
            : block;
          return id.toString();
        })
      );
      
      console.log('[Folder Tree] 提取到的块ID:', Array.from(resultBlockIds));
      
      // 删除不再存在的条目
      for (const child of existingChildren) {
        if (child.blockId && !resultBlockIds.has(child.blockId)) {
          await this.core.deleteItem(child.id);
        }
      }

      // 添加新的查询结果条目
      for (let i = 0; i < resultBlocks.length; i++) {
        const resultItem = resultBlocks[i];
        // 处理返回的块对象或ID
        const block = typeof resultItem === 'object' && resultItem !== null && 'id' in resultItem
          ? resultItem  // 如果已经是块对象，直接使用
          : await (window as any).orca.invokeBackend('get-block', resultItem);  // 如果是ID，获取块对象
        
        if (!block || !block.id) {
          console.warn('[Folder Tree] 无法获取块信息:', resultItem);
          continue;
        }

        const blockId = block.id.toString();
        
        // 检查是否已存在
        const existing = existingChildren.find(child => child.blockId === blockId);
        if (existing) {
          // 已存在，跳过创建
          continue;
        }

        // 获取块名称
        let blockName = `文档 ${blockId}`;
        if (block.aliases && block.aliases.length > 0) {
          blockName = block.aliases[0];
        } else if (block.text) {
          blockName = block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text;
        }

        // 获取图标和颜色
        const iconProp = this.findProperty(block, '_icon');
        const colorProp = this.findProperty(block, '_color');
        let iconClass = 'ti ti-cube';
        let color = '';

        if (iconProp && iconProp.type === 1 && iconProp.value && iconProp.value.trim()) {
          iconClass = iconProp.value;
        } else if (block.aliases && block.aliases.length > 0) {
          const hideProp = this.findProperty(block, '_hide');
          iconClass = hideProp && hideProp.value ? 'ti ti-file' : 'ti ti-hash';
        }

        if (colorProp && colorProp.type === 1) {
          color = colorProp.value;
        }

        // 创建文档条目
        console.log('[Folder Tree] 创建查询结果子项:', blockName, blockId);
        const created = await this.core.createDocument(
          blockName,
          blockId,
          queryFolderId,
          'document',
          iconClass,
          color
        );
        
        if (created) {
          console.log('[Folder Tree] 子项创建成功:', created.id);
        } else {
          console.error('[Folder Tree] 子项创建失败:', blockName, blockId);
        }
      }

      // 重新排序以匹配查询结果顺序
      const updatedChildren = this.core.getItemChildren(queryFolderId);
      const orderedIds = resultBlocks.map((resultItem: any) => {
        // 提取块ID
        const blockId = typeof resultItem === 'object' && resultItem !== null && 'id' in resultItem
          ? resultItem.id.toString()
          : resultItem.toString();
        const child = updatedChildren.find(c => c.blockId === blockId);
        return child?.id;
      }).filter(Boolean) as string[];

      if (orderedIds.length > 0) {
        await this.core.reorderItems(queryFolderId, orderedIds);
      }

      // 触发渲染以显示新创建的子项
      this.render();

      console.log('[Folder Tree] 查询块子项更新完成，已创建', orderedIds.length, '个子项');

    } catch (error) {
      console.error('[Folder Tree] 更新查询块子项失败:', error);
      (window as any).orca.notify('error', `更新查询结果失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  
  
  private createInputDialog(title: string, label: string, defaultValue: string): any {
    const dialog = document.createElement('div') as any;
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      max-width: 500px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // 暗色主题适配
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      content.style.background = '#1a1a1a';
      content.style.borderColor = '#404040';
    }

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0 0 16px 0;
      color: ${isDark ? '#ffffff' : '#212529'};
      font-size: 16px;
      font-weight: 600;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    input.placeholder = label;
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
      border-radius: 4px;
      background: ${isDark ? '#2d2d2d' : '#ffffff'};
      color: ${isDark ? '#ffffff' : '#212529'};
      font-size: 14px;
      margin-bottom: 16px;
      box-sizing: border-box;
    `;
    
    // 阻止事件冒泡，确保输入框可以正常接收输入
    input.onclick = (e) => e.stopPropagation();
    input.onmousedown = (e) => e.stopPropagation();
    input.onmouseup = (e) => e.stopPropagation();

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
      border-radius: 4px;
      background: ${isDark ? '#2d2d2d' : '#ffffff'};
      color: ${isDark ? '#ffffff' : '#212529'};
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid ${isDark ? '#3d8bfd' : '#0d6efd'};
      border-radius: 4px;
      background: ${isDark ? '#3d8bfd' : '#0d6efd'};
      color: white;
      cursor: pointer;
      font-size: 14px;
    `;
    confirmBtn.onclick = () => {
      document.body.removeChild(dialog);
      if (dialog.callback) {
        dialog.callback(input.value);
      }
    };

    // Enter 键确认，Escape 键取消
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    };

    // 自动聚焦输入框并选中文本
    setTimeout(() => {
      input.focus();
      if (defaultValue) {
        input.select();
      }
    }, 150);

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);

    content.appendChild(titleEl);
    content.appendChild(input);
    content.appendChild(buttonContainer);

    dialog.appendChild(content);
    dialog.callback = null;

    // 点击背景关闭
    dialog.onclick = (e: MouseEvent) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    };
    
    // 阻止内容区域的点击事件冒泡到背景
    content.onclick = (e: MouseEvent) => e.stopPropagation();

    return {
      show: (callback: (value: string) => void) => {
        dialog.callback = callback;
        document.body.appendChild(dialog);
      }
    };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 跳转到块（使用原生 API，避免重复打开）
   */
  private goToBlockWithAlias(blockId: string | number): void {
    const blockIdNum = typeof blockId === 'number' ? blockId : parseInt(String(blockId), 10);
    if (isNaN(blockIdNum)) return;

    const orca = (window as any).orca;
    
    // 递归查找已打开该块的面板
    const findPanelWithBlock = (node: any): string | null => {
      if (!node) return null;
      
      // 如果是视图面板且显示的是该块
      if (node.type === 'view' && 
          node.view === 'block' && 
          node.viewArgs && 
          node.viewArgs.blockId === blockIdNum) {
        return node.id;
      }
      
      // 递归查找子节点
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = findPanelWithBlock(child);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // 查找已存在的面板
    const existingPanelId = findPanelWithBlock(orca.state.panels);
    
    if (existingPanelId) {
      // 如果已存在，切换到该面板，避免重复打开
      orca.nav.switchFocusTo(existingPanelId);
    } else {
      // 如果不存在，使用原生方式打开
      orca.nav.goTo('block', { blockId: blockIdNum });
    }
  }


  private findProperty(block: any, propertyName: string): any {
    if (!block.properties || !Array.isArray(block.properties)) {
      return null;
    }
    return block.properties.find((prop: any) => prop.name === propertyName);
  }

  private getDocumentParent(documentId: string): string | null {
    const doc = this.core.getDocumentById(documentId);
    return doc ? doc.parentId : null;
  }

  private async reorderNotebooks(draggedId: string, targetId: string): Promise<boolean> {
    try {
      // 获取当前笔记本顺序
      const notebooks = this.core.getRootNotebooks().sort((a, b) => a.order - b.order);
      const draggedIndex = notebooks.findIndex((nb) => nb.id === draggedId);
      const targetIndex = notebooks.findIndex((nb) => nb.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        console.error('无法找到笔记本进行排序');
        return false;
      }

      // 移动被拖拽的笔记本到目标位置
      const [draggedNotebook] = notebooks.splice(draggedIndex, 1);
      notebooks.splice(targetIndex, 0, draggedNotebook);

      // 重新分配order值
      const reorderedNotebooks = notebooks.map((notebook, index) => ({
        ...notebook,
        order: index
      }));

      // 保存排序
      const success = await this.core.reorderNotebooks(reorderedNotebooks.map((nb) => nb.id));

      if (success) {
        // 强制重新渲染
        this.render();
      }

      return success;
    } catch (error) {
      console.error('笔记本排序失败:', error);
      return false;
    }
  }

  private async reorderDocuments(draggedId: string, targetId: string, targetParent: string): Promise<boolean> {
    try {
      // 确定父级和子文档列表
      let parentId: string;
      let siblingIds: string[];

      if (targetParent.startsWith('notebook_')) {
        // 在笔记本级别
        parentId = targetParent;
        const notebook = this.core.getItemById(parentId);
        siblingIds = notebook && notebook.children ? [...notebook.children] : [];
      } else {
        // 在文件夹级别
        parentId = targetParent;
        const parentDoc = this.core.getItemById(parentId);
        siblingIds = parentDoc && parentDoc.children ? [...parentDoc.children] : [];
      }

      // 获取当前排序
      const draggedIndex = siblingIds.indexOf(draggedId);
      const targetIndex = siblingIds.indexOf(targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        console.error('无法找到文档进行排序');
        return false;
      }

      // 移动被拖拽的文档到目标位置
      const [movedId] = siblingIds.splice(draggedIndex, 1);
      siblingIds.splice(targetIndex, 0, movedId);

      // 保存排序
      const success = await this.core.reorderDocuments(parentId, siblingIds);

      if (success) {
        // 强制重新渲染
        this.render();
      }

      return success;
    } catch (error) {
      console.error('文档排序失败:', error);
      return false;
    }
  }

  /**
   * 显示根级别右键菜单
   */
  private showRootContextMenu(e: MouseEvent): void {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.folder-tree-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'folder-tree-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.zIndex = '10000';

    const menuItems: Array<{ label: string; icon: string; action: () => void; className?: string }> = [
      {
        label: '创建笔记本',
        icon: '📓',
        action: () => this.showCreateNotebookInput()
      }
    ];

    // 创建菜单项
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = `folder-tree-context-menu-item ${item.className || ''}`;
      menuItem.innerHTML = `${item.icon} ${item.label}`;
      menuItem.onclick = () => {
        item.action();
        menu.remove();
      };
      menu.appendChild(menuItem);
    });

    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    const closeMenu = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);

    // 确保菜单不会超出屏幕
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
    }
  }

  /**
   * 显示右键菜单
   */
  private showContextMenu(e: MouseEvent, itemId: string, itemType: 'notebook' | 'folder' | 'document'): void {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.folder-tree-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'folder-tree-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.zIndex = '10000';

    const menuItems: Array<{ label: string; icon: string; action: () => void; className?: string }> = [];

    // 笔记本和文件夹可以创建子文件夹
    if (itemType === 'notebook' || itemType === 'folder') {
      menuItems.push({
        label: '新建文件夹',
        icon: '📂',
        action: () => {
          if (itemType === 'notebook') {
            const notebook = this.core.getNotebookById(itemId);
            if (notebook) {
              this.showCreateFolderInNotebook(notebook);
            }
          } else {
            // 在文件夹中创建子文件夹
            const dialog = this.createInputDialog('新建文件夹', '请输入文件夹名称:', '');
            dialog.show(async (name: string) => {
              if (name && name.trim()) {
                const folder = await this.core.createDocument(name.trim(), null, itemId, 'folder');
                if (folder) {
                  (window as any).orca.notify('success', '文件夹创建成功');
                  // 展开父文件夹
                  if (!this.expandedItems.has(itemId)) {
                    this.expandedItems.add(itemId);
                    await this.core.setExpandedState( Array.from(this.expandedItems));
                  }
                  // 展开新创建的文件夹
                  this.expandedItems.add(folder.id);
                  await this.core.setExpandedState( Array.from(this.expandedItems));
                  this.render();
                } else {
                  (window as any).orca.notify('error', '文件夹创建失败');
                }
              }
            });
          }
        }
      });
    }

    // 重命名选项
    menuItems.push({
      label: '重命名',
      icon: '✏️',
      action: () => {
        if (itemType === 'notebook') {
          this.renameNotebook(itemId);
        } else {
          this.renameDocument(itemId);
        }
      }
    });

    // 删除选项
    menuItems.push({
      label: '删除',
      icon: '🗑️',
      action: () => {
        if (itemType === 'notebook') {
          this.deleteNotebook(itemId);
        } else {
          this.deleteDocument(itemId);
        }
      },
      className: 'danger'
    });

    // 创建菜单项
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = `folder-tree-context-menu-item ${item.className || ''}`;
      menuItem.innerHTML = `${item.icon} ${item.label}`;
      menuItem.onclick = () => {
        item.action();
        menu.remove();
      };
      menu.appendChild(menuItem);
    });

    document.body.appendChild(menu);

    // 检查是否是包含于块（有 backRefs）并添加菜单项（异步检查，动态添加）
    const item = this.core.getItemById(itemId);
    if (item && item.blockId) {
      // 异步检查是否有 backRefs，然后动态添加菜单项
      this.checkAndAddContainedInMenu(menuItems, item.blockId, menu);
    }

    // 点击其他地方关闭菜单
    const closeMenu = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);

    // 确保菜单不会超出屏幕
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - menuRect.height - 10}px`;
    }
  }

  /**
   * 检查并添加包含于菜单项
   */
  private async checkAndAddContainedInMenu(
    menuItems: Array<{ label: string; icon: string; action: () => void; className?: string }>,
    blockId: string,
    menu: HTMLElement
  ): Promise<void> {
    try {
      const block = await (window as any).orca.invokeBackend('get-block', blockId);
      if (block && block.backRefs && block.backRefs.length > 0) {
        const menuItem = {
          label: '显示包含于列表',
          icon: '🔗',
          action: () => {
            this.showContainedInList(blockId);
          }
        };
        menuItems.push(menuItem);
        
        // 动态添加菜单项到已显示的菜单中
        const menuItemEl = document.createElement('div');
        menuItemEl.className = 'folder-tree-context-menu-item';
        menuItemEl.innerHTML = `${menuItem.icon} ${menuItem.label}`;
        menuItemEl.onclick = () => {
          menuItem.action();
          menu.remove();
        };
        // 插入到删除选项之前
        const deleteItem = menu.querySelector('.danger');
        if (deleteItem) {
          menu.insertBefore(menuItemEl, deleteItem);
        } else {
          menu.appendChild(menuItemEl);
        }
      }
    } catch (error) {
      console.error('[Folder Tree] 检查包含于块失败:', error);
    }
  }

  /**
   * 显示包含于列表
   */
  private async showContainedInList(blockId: string): Promise<void> {
    try {
      const block = await (window as any).orca.invokeBackend('get-block', blockId);
      if (!block || !block.backRefs || block.backRefs.length === 0) {
        (window as any).orca.notify('info', '该块没有被其他块包含');
        return;
      }

      // 获取所有包含于块的ID
      const containedInBlockIds = block.backRefs.map((ref: any) => ref.from).filter((id: any) => id != null);
      
      if (containedInBlockIds.length === 0) {
        (window as any).orca.notify('info', '该块没有被其他块包含');
        return;
      }

      // 批量获取块信息
      const blocks = await (window as any).orca.invokeBackend('get-blocks', containedInBlockIds);
      if (!blocks || blocks.length === 0) {
        (window as any).orca.notify('info', '无法获取包含于块信息');
        return;
      }

      // 创建对话框显示包含于列表
      this.showContainedInDialog(blocks);
    } catch (error) {
      console.error('[Folder Tree] 显示包含于列表失败:', error);
      (window as any).orca.notify('error', '显示包含于列表失败');
    }
  }

  /**
   * 显示包含于列表对话框
   */
  private showContainedInDialog(blocks: any[]): void {
    // 移除已存在的对话框
    const existingDialog = document.querySelector('.folder-tree-contained-in-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.className = 'folder-tree-contained-in-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: ${isDark ? '#1a1a1a' : '#ffffff'};
      border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
      border-radius: 8px;
      padding: 20px;
      min-width: 400px;
      max-width: 600px;
      max-height: 70vh;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
    `;

    const title = document.createElement('h3');
    title.textContent = '包含于列表';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: ${isDark ? '#ffffff' : '#212529'};
      font-size: 16px;
      font-weight: 600;
    `;

    const list = document.createElement('div');
    list.style.cssText = `
      flex: 1;
      overflow-y: auto;
      max-height: 50vh;
    `;

    // 渲染块列表
    blocks.forEach(block => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        background: ${isDark ? '#2d2d2d' : '#f8f9fa'};
        color: ${isDark ? '#ffffff' : '#212529'};
      `;

      item.onmouseenter = () => {
        item.style.background = isDark ? '#404040' : '#e9ecef';
      };

      item.onmouseleave = () => {
        item.style.background = isDark ? '#2d2d2d' : '#f8f9fa';
      };

      // 获取块名称
      let blockName = `块 ${block.id}`;
      if (block.aliases && block.aliases.length > 0) {
        blockName = block.aliases[0];
      } else if (block.text) {
        blockName = block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text;
      }

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="ti ti-cube" style="font-size: 16px;"></i>
          <span style="flex: 1;">${this.escapeHtml(blockName)}</span>
        </div>
      `;

      // 点击跳转到块
      item.onclick = () => {
        this.goToBlockWithAlias(block.id);
        dialog.remove();
      };

      list.appendChild(item);
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid ${isDark ? '#404040' : '#dee2e6'};
      border-radius: 4px;
      background: ${isDark ? '#2d2d2d' : '#ffffff'};
      color: ${isDark ? '#ffffff' : '#212529'};
      cursor: pointer;
      font-size: 14px;
      margin-top: 16px;
      align-self: flex-end;
    `;

    closeBtn.onclick = () => {
      dialog.remove();
    };

    content.appendChild(title);
    content.appendChild(list);
    content.appendChild(closeBtn);
    dialog.appendChild(content);

    // 点击背景关闭
    dialog.onclick = (e: MouseEvent) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    };

    document.body.appendChild(dialog);
  }
}

// Export the class globally
window.FolderTreeRenderer = FolderTreeRenderer;