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
  private expandedNotebooks: Set<string> = new Set();
  private expandedFolders: Set<string> = new Set();
  private selectedItems: Set<string> = new Set();
  private currentDraggedBlockId: string | null = null;
  private currentDraggedItem: { id: string; type: string } | null = null;

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
    this.expandedNotebooks = new Set(this.core.getExpandedNotebooks());
    this.expandedFolders = new Set(this.core.getExpandedFolders());
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

    const createBtn = this.createButton('创建笔记本', this.createPlusIcon(), () => this.showCreateNotebookInput());

    actions.appendChild(createBtn);

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

  
  private createFolderIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6M9 14h6"/></svg>';
  }

  
  private createContent(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'folder-tree-content';

    // 设置内容区域的拖拽处理
    this.setupContentDropZone(content);

    if (this.data.notebooks.length === 0) {
      content.appendChild(this.createEmptyState());
    } else {
      // 创建根级项目（笔记本）
      const rootItems = this.data.notebooks
        .sort((a: any, b: any) => a.order - b.order)
        .map((notebook: any) => this.createNotebookItem(notebook));
      rootItems.forEach((el: HTMLElement) => content.appendChild(el));
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

  private createNotebookItem(notebook: any): HTMLElement {
    const notebookEl = document.createElement('div');
    notebookEl.className = 'folder-tree-notebook';

    const isExpanded = this.expandedNotebooks.has(notebook.id);
    const isSelected = this.selectedItems.has(notebook.id);

    const header = document.createElement('div');
    header.className = `folder-tree-notebook-header ${isSelected ? 'active' : ''}`;
    header.setAttribute('data-id', notebook.id);
    header.innerHTML = `
      <i class="ti ti-chevron-right folder-tree-expand-icon ${isExpanded ? 'expanded' : ''}"></i>
      <span class="folder-tree-notebook-icon">
        <i class="ti ti-notebook"></i>
      </span>
      <span class="folder-tree-notebook-name">${this.escapeHtml(notebook.name)}</span>
      <div class="folder-tree-notebook-actions">
        <button class="folder-tree-btn" title="重命名">
          <i class="ti ti-pencil"></i>
        </button>
      </div>
    `;

    this.setupNotebookEvents(header, notebook);

    notebookEl.appendChild(header);

    if (isExpanded) {
      const documentsEl = this.createDocumentsElement(notebook.id);
      notebookEl.appendChild(documentsEl);
    }

    return notebookEl;
  }

  private setupNotebookEvents(header: HTMLElement, notebook: any): void {
    const expandIcon = header.querySelector('.folder-tree-expand-icon') as HTMLElement;
    expandIcon.onclick = (e) => {
      e.stopPropagation();
      this.toggleNotebook(notebook.id);
    };

    header.onclick = (e) => {
      // 整个条目可点击：切换展开并选中
      this.toggleNotebook(notebook.id);
      this.selectItem(notebook.id);
    };

    // 中键点击（鼠标中键）仅切换展开/折叠
    header.addEventListener('auxclick', (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleNotebook(notebook.id);
      }
    });

    // 添加右键菜单
    header.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e, notebook.id, 'notebook');
    };

    const renameBtn = header.querySelector('.folder-tree-notebook-actions button') as HTMLElement;
    if (renameBtn) {
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        this.renameNotebook(notebook.id);
      };
    }

    this.setupDragDrop(header, notebook.id, 'notebook');
  }

  private setupContentDropZone(content: HTMLElement): void {
    // 设置整个内容区域为拖拽接收区
    content.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    content.ondrop = (e) => {
      e.preventDefault();

      // 获取拖拽数据
      const draggedData = e.dataTransfer!.getData('text/plain');

      if (!draggedData) {
        // 尝试从Orca获取拖拽数据
        this.handleOrcaDrop(e);
        return;
      }

      // 如果有笔记本，则拖拽到第一个笔记本
      if (this.data.notebooks.length > 0) {
        const firstNotebook = this.data.notebooks[0];
        this.handleDrop(e, firstNotebook.id, 'notebook');
      } else {
        // 没有笔记本时，提示创建笔记本
        (window as any).orca.notify('warning', '请先创建笔记本');
      }
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
    };

    element.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add('drag-over');
    };

    element.ondragleave = () => {
      element.classList.remove('drag-over');
    };

    element.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');
      this.handleDrop(e, targetId, targetType);
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
    docEl.className = 'folder-tree-doc';
    docEl.setAttribute('data-id', doc.id);

    const isExpanded = this.expandedFolders.has(doc.id);
    const isSelected = this.selectedItems.has(doc.id);

    const itemEl = window.document.createElement('div');
    itemEl.className = `folder-tree-item ${isSelected ? 'selected' : ''}`;
    itemEl.setAttribute('data-id', doc.id);

    // 构建 HTML 字符串
    const expandIcon = doc.type === 'folder'
      ? `<i class="ti ti-chevron-right folder-tree-expand-icon ${isExpanded ? 'expanded' : ''}"></i>`
      : '<span style="width: 14px; display: inline-block;"></span>';

    // 根据类型和保存的图标信息生成图标
    let iconHtml: string;
    if (doc.type === 'folder') {
      // 文件夹使用 Tabler Icons
      iconHtml = `<i class="ti ti-folder"></i>`;
    } else if (doc.icon) {
      // 判断是 emoji 还是图标类名
      if (doc.icon.startsWith('ti ')) {
        // Tabler Icons - 完整类名
        iconHtml = `<i class="${doc.icon}"></i>`;
      } else {
        // Emoji 或其他文本
        iconHtml = doc.icon;
      }
    } else {
      // 默认使用立方体图标
      iconHtml = `<i class="ti ti-cube"></i>`;
    }

    // 处理自定义颜色
    const iconBgStyle = doc.color ? ` style="background-color: oklch(from ${doc.color} calc(1.2 * l) c h / 25%);"` : '';
    
    if (doc.color || doc.icon) {
      console.log('[Folder Tree] 渲染 - 图标:', doc.icon, '颜色:', doc.color, '文档:', doc.name);
    }

    const isTabler = /<i\s+class=\"ti\s+/i.test(iconHtml);
    const html = [
      expandIcon,
      `<span class="folder-tree-item-icon${isTabler ? ' is-tabler' : ''}${doc.color ? ' has-color' : ''}"${iconBgStyle}>${iconHtml}</span>`,
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
      const expandIcon = itemEl.querySelector('.folder-tree-expand-icon') as HTMLElement;
      expandIcon.onclick = (e) => {
        e.stopPropagation();
        this.toggleFolder(document.id);
        this.selectItem(document.id);
      };

      // 中键点击（鼠标中键）在整行上切换展开/折叠
      itemEl.addEventListener('auxclick', (e: MouseEvent) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleFolder(document.id);
        }
      });
    }

    itemEl.onclick = () => {
      // 整个条目点击：
      // - 如果是“变成文件夹的文档”（有 blockId），左键仍然跳转
      // - 纯文件夹则切换展开
      if (document.type === 'folder') {
        if (document.blockId) {
          this.selectItem(document.id);
          (window as any).orca.nav.goTo('block', { blockId: document.blockId });
        } else {
          this.toggleFolder(document.id);
          this.selectItem(document.id);
        }
        return;
      }
      this.selectItem(document.id);
      if (document.blockId) {
        (window as any).orca.nav.goTo('block', { blockId: document.blockId });
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

    const children = this.core.getDocumentChildren(parentId);
    children.forEach(child => {
      const childEl = this.createDocumentElement(child, level);
      childrenEl.appendChild(childEl);
    });

    return childrenEl;
  }

  private async toggleNotebook(notebookId: string): Promise<void> {
    const willExpand = !this.expandedNotebooks.has(notebookId);
    if (willExpand) this.expandedNotebooks.add(notebookId); else this.expandedNotebooks.delete(notebookId);
    await this.core.setExpandedState('notebooks', Array.from(this.expandedNotebooks));

    // 局部更新以避免闪烁（锁定到目标笔记本）
    const header = this.container?.querySelector(`.folder-tree-notebook-header[data-id="${notebookId}"]`);
    if (header) {
      const chevron = header.querySelector('.folder-tree-expand-icon') as HTMLElement;
      chevron && chevron.classList.toggle('expanded', willExpand);
      const existing = header.nextElementSibling;
      if (willExpand) {
        // 添加子节点
        if (!existing || !existing.classList.contains('folder-tree-items')) {
          const docsEl = this.createDocumentsElement(notebookId);
          header.parentElement?.insertBefore(docsEl, existing || null);
        }
      } else {
        // 移除子节点
        if (existing && existing.classList.contains('folder-tree-items')) {
          existing.remove();
        }
      }
    }
  }

  private async toggleFolder(folderId: string): Promise<void> {
    const willExpand = !this.expandedFolders.has(folderId);
    if (willExpand) this.expandedFolders.add(folderId); else this.expandedFolders.delete(folderId);
    await this.core.setExpandedState('folders', Array.from(this.expandedFolders));

    // 局部更新以避免闪烁
    const item = this.container?.querySelector(`.folder-tree-item[data-id="${folderId}"]`) as HTMLElement | null;
    if (item) {
      const chevron = item.querySelector('.folder-tree-expand-icon') as HTMLElement;
      chevron && chevron.classList.toggle('expanded', willExpand);
      const wrapper = item.closest('.folder-tree-doc') as HTMLElement | null;
      if (wrapper) {
        const existing = wrapper.querySelector(':scope > .folder-tree-items') as HTMLElement | null;
        if (willExpand) {
          if (!existing) {
            const children = this.createChildrenElement(folderId, 2);
            wrapper.appendChild(children);
          }
        } else {
          existing && existing.remove();
        }
      }
    }
  }

  private async selectItem(itemId: string): Promise<void> {
    // 更新内存状态
    this.selectedItems.clear();
    this.selectedItems.add(itemId);
    await this.core.setSelectedItems(Array.from(this.selectedItems));

    // 最小化更新：仅在DOM中切换选中样式，避免整树重渲染导致样式闪烁
    try {
      // 清除现有选中样式
      const prevSelected = this.container?.querySelectorAll('.folder-tree-item.selected, .folder-tree-notebook-header.active');
      prevSelected?.forEach(el => el.classList.remove('selected', 'active'));

      // 给当前项添加选中样式
      const currentItem = this.container?.querySelector(`[data-id="${itemId}"]`);
      if (currentItem) {
        if (currentItem.classList.contains('folder-tree-notebook-header')) {
          currentItem.classList.add('active');
        } else {
          const parentItem = currentItem.closest('.folder-tree-item');
          parentItem?.classList.add('selected');
        }
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
      this.expandedNotebooks.add(notebook.id);
      await this.core.setExpandedState('notebooks', Array.from(this.expandedNotebooks));
    } else {
      (window as any).orca.notify('error', '笔记本创建失败');
    }
  }

  private showCreateFolderInput(): void {
    // 检查是否有笔记本
    if (this.data.notebooks.length === 0) {
      (window as any).orca.notify('error', '请先创建笔记本');
      return;
    }

    // 如果只有一个笔记本，直接在该笔记本中创建
    if (this.data.notebooks.length === 1) {
      this.showCreateFolderInNotebook(this.data.notebooks[0]);
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
    this.showCreateFolderInNotebook(this.data.notebooks[0]);
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
      if (!this.expandedNotebooks.has(notebookId)) {
        this.expandedNotebooks.add(notebookId);
        await this.core.setExpandedState('notebooks', Array.from(this.expandedNotebooks));
      }
      // 展开新创建的文件夹
      this.expandedFolders.add(folder.id);
      await this.core.setExpandedState('folders', Array.from(this.expandedFolders));
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

  private async handleDrop(e: DragEvent, targetId: string, targetType: string): Promise<void> {
    // 优先使用捕获的块ID
    let draggedId = this.currentDraggedBlockId || e.dataTransfer!.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;

    console.log('[Folder Tree] handleDrop - draggedId:', draggedId, 'targetId:', targetId, 'targetType:', targetType);

    // 处理笔记本排序
    if (targetType === 'notebook' && draggedId.startsWith('notebook_')) {
      const success = await this.reorderNotebooks(draggedId, targetId);
      if (success) {
        (window as any).orca.notify('success', '笔记本排序成功');
      } else {
        (window as any).orca.notify('error', '笔记本排序失败');
      }
      this.currentDraggedBlockId = null;
      return;
    }

    // 检查是否是从 Orca 拖拽的块（纯数字ID）
    if (/^\d+$/.test(draggedId)) {
      console.log('[Folder Tree] Creating document from Orca block:', draggedId);
      // 如果目标是文档，先确保其为文件夹
      if (targetType === 'document') {
        await this.core.ensureFolder(targetId);
      }
      await this.createDocumentFromBlock(draggedId, targetId);
      this.currentDraggedBlockId = null;
      return;
    }

    // 检查是否是文档ID（document_开头）
    const draggedDoc = this.core.getDocumentById(draggedId);
    
    if (draggedDoc) {
      const targetDoc = this.core.getDocumentById(targetId);

      if (targetDoc && draggedDoc.parentId === targetDoc.parentId && draggedDoc.parentId && targetType !== 'document') {
        // 同级排序 - 使用共同的父级
        const success = await this.reorderDocuments(draggedId, targetId, draggedDoc.parentId);
        if (success) {
          (window as any).orca.notify('success', '文档排序成功');
        } else {
          (window as any).orca.notify('error', '文档排序失败');
        }
      } else {
        // 移动到不同父级；若目标为文档，先转换目标为文件夹
        if (targetType === 'document') {
          await this.core.ensureFolder(targetId);
        }
        const success = await this.core.moveDocument(draggedId, targetId);
        if (success) {
          (window as any).orca.notify('success', '移动成功');
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
      if (this.data.notebooks.length === 0) {
        (window as any).orca.notify('warning', '请先创建笔记本');
        return;
      }

      // 方法1：优先使用全局监听器捕获的块ID
      if (this.currentDraggedBlockId) {
        console.log('[Folder Tree] Using captured block ID:', this.currentDraggedBlockId);
        await this.createDocumentFromBlock(this.currentDraggedBlockId, this.data.notebooks[0].id);
        this.currentDraggedBlockId = null;
        return;
      }

      // 方法2：从 dataTransfer 获取块ID
      const dataText = e.dataTransfer!.getData('text/plain');
      console.log('[Folder Tree] Drag data from dataTransfer:', dataText);

      if (dataText && /^\d+$/.test(dataText)) {
        // 如果是纯数字的块ID
        console.log('[Folder Tree] Found block ID from dataTransfer:', dataText);
        await this.createDocumentFromBlock(dataText, this.data.notebooks[0].id);
        return;
      }

      // 方法3：从当前选中的块获取ID
      const selectedBlocks = document.querySelectorAll('.orca-block.orca-container.orca-selected');
      if (selectedBlocks.length > 0) {
        const blockId = selectedBlocks[0].getAttribute('data-id');
        if (blockId && /^\d+$/.test(blockId)) {
          console.log('[Folder Tree] Found block ID from selected block:', blockId);
          await this.createDocumentFromBlock(blockId, this.data.notebooks[0].id);
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

  private async createDocumentFromBlock(blockId: string, targetId: string): Promise<void> {
    try {
      const block = await (window as any).orca.invokeBackend('get-block', blockId);
      if (!block) {
        (window as any).orca.notify('error', '无法获取块信息');
        return;
      }

      const blockName = block.text
        ? (block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text)
        : '未命名文档';

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
      
      // 读取图标
      if (iconProp && iconProp.type === 1 && iconProp.value && iconProp.value.trim()) {
        iconClass = iconProp.value;
        console.log('[Folder Tree] 读取到自定义图标:', iconClass, '块ID:', blockId);
      } else if (block.aliases && block.aliases.length > 0) {
        // 别名块：判断是页面还是标签
        const hideProp = this.findProperty(block, '_hide');
        iconClass = hideProp && hideProp.value ? 'ti ti-file' : 'ti ti-hash';
        console.log('[Folder Tree] 别名块图标:', iconClass, 'hasHide:', !!hideProp, '块ID:', blockId);
      } else {
        // 普通块，默认立方体图标
        console.log('[Folder Tree] 普通块，使用默认图标:', iconClass, '块ID:', blockId);
      }

      console.log('[Folder Tree] 最终保存 - 图标:', iconClass, '颜色:', color, '块ID:', blockId);
      const document = await this.core.createDocument(blockName, blockId, targetId, 'document', iconClass, color);
      if (document) {
        (window as any).orca.notify('success', '文档导入成功');

        if (targetId.startsWith('notebook_')) {
          if (!this.expandedNotebooks.has(targetId)) {
            this.expandedNotebooks.add(targetId);
            await this.core.setExpandedState('notebooks', Array.from(this.expandedNotebooks));
          }
        } else {
          if (!this.expandedFolders.has(targetId)) {
            this.expandedFolders.add(targetId);
            await this.core.setExpandedState('folders', Array.from(this.expandedFolders));
          }
        }

        // 强制重新渲染UI以确保显示新添加的文档
        setTimeout(() => {
          this.render();
        }, 100);
      } else {
        (window as any).orca.notify('error', '文档导入失败');
      }
    } catch (error) {
      console.error('[Folder Tree] 导入块失败:', error);
      (window as any).orca.notify('error', '文档导入失败');
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
      const notebooks = this.data.notebooks.sort((a: any, b: any) => a.order - b.order);
      const draggedIndex = notebooks.findIndex((nb: any) => nb.id === draggedId);
      const targetIndex = notebooks.findIndex((nb: any) => nb.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        console.error('无法找到笔记本进行排序');
        return false;
      }

      // 移动被拖拽的笔记本到目标位置
      const [draggedNotebook] = notebooks.splice(draggedIndex, 1);
      notebooks.splice(targetIndex, 0, draggedNotebook);

      // 重新分配order值
      const reorderedNotebooks = notebooks.map((notebook: any, index: number) => ({
        ...notebook,
        order: index
      }));

      // 保存排序
      const success = await this.core.reorderNotebooks(reorderedNotebooks.map((nb: any) => nb.id));

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
        const notebook = this.data.notebooks.find((nb: any) => nb.id === parentId);
        siblingIds = notebook ? [...notebook.documents] : [];
      } else {
        // 在文件夹级别
        parentId = targetParent;
        const parentDoc = this.data.documents.find((doc: any) => doc.id === parentId);
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
                  if (!this.expandedFolders.has(itemId)) {
                    this.expandedFolders.add(itemId);
                    await this.core.setExpandedState('folders', Array.from(this.expandedFolders));
                  }
                  // 展开新创建的文件夹
                  this.expandedFolders.add(folder.id);
                  await this.core.setExpandedState('folders', Array.from(this.expandedFolders));
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
}

// Export the class globally
window.FolderTreeRenderer = FolderTreeRenderer;