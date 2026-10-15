/**
 * 目标目录选择对话框
 * 用于在添加块到文档树时，让用户能够浏览和选择任意层级的目标目录（笔记本或文件夹）
 */

import { FolderTreeCore, DirectoryFlatItem } from "./folder-tree-core";

export interface DirectoryPickerOptions {
  blockIds: string[];
  core: FolderTreeCore;
  onSelect: (targetId: string, targetName: string) => void;
  onCancel?: () => void;
}

export class DirectoryPickerDialog {
  private overlay: HTMLElement | null = null;
  private options: DirectoryPickerOptions;
  private selectedDirId: string | null = null;
  private selectedDirName: string = '';
  private directories: DirectoryFlatItem[] = [];
  private filteredDirectories: DirectoryFlatItem[] = [];

  constructor(options: DirectoryPickerOptions) {
    this.options = options;
    this.directories = options.core.getAllDirectoriesFlat();
    this.filteredDirectories = [...this.directories];
    if (this.directories.length > 0) {
      this.selectedDirId = this.directories[0].id;
      this.selectedDirName = this.directories[0].name;
    }
  }

  public show(): void {
    this.render();
  }

  public close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }

  private confirm(): void {
    if (!this.selectedDirId) return;
    const targetId = this.selectedDirId;
    const targetName = this.selectedDirName;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.options.onSelect(targetId, targetName);
  }

  private render(): void {
    // 移除已有弹窗
    const existing = document.querySelector('.folder-tree-picker-overlay');
    if (existing) existing.remove();

    this.overlay = document.createElement('div');
    this.overlay.className = 'folder-tree-dialog-overlay folder-tree-picker-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'folder-tree-dialog folder-tree-picker-dialog';

    // 头部
    const header = document.createElement('div');
    header.className = 'folder-tree-picker-header';

    const titleContainer = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'folder-tree-dialog-title';
    title.textContent = '选择目标目录';

    const subtitle = document.createElement('div');
    subtitle.className = 'folder-tree-picker-subtitle';
    subtitle.textContent = `将 ${this.options.blockIds.length} 个块添加到所选目录`;

    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'folder-tree-picker-close-btn';
    closeBtn.innerHTML = '<i class="ti ti-x"></i>';
    closeBtn.onclick = () => this.close();

    header.appendChild(titleContainer);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // 搜索框
    const searchBox = document.createElement('div');
    searchBox.className = 'folder-tree-picker-search-container';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'folder-tree-dialog-input folder-tree-picker-search-input';
    searchInput.placeholder = '搜索目录（名称或路径）...';

    searchBox.appendChild(searchInput);
    dialog.appendChild(searchBox);

    // 目录列表容器
    const listContainer = document.createElement('div');
    listContainer.className = 'folder-tree-picker-list';
    dialog.appendChild(listContainer);

    // 底部按钮栏
    const footer = document.createElement('div');
    footer.className = 'folder-tree-dialog-buttons folder-tree-picker-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'folder-tree-dialog-button secondary';
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => this.close();

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'folder-tree-dialog-button primary';
    confirmBtn.textContent = '确定添加';
    confirmBtn.onclick = () => this.confirm();

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    dialog.appendChild(footer);

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);

    // 渲染列表函数
    const renderList = () => {
      listContainer.innerHTML = '';

      if (this.filteredDirectories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'folder-tree-picker-empty';
        empty.textContent = '无匹配的目录';
        listContainer.appendChild(empty);
        confirmBtn.disabled = true;
        return;
      }

      confirmBtn.disabled = !this.selectedDirId;

      this.filteredDirectories.forEach(dir => {
        const itemEl = document.createElement('div');
        itemEl.className = 'folder-tree-picker-item' + (this.selectedDirId === dir.id ? ' selected' : '');
        itemEl.style.paddingLeft = `${dir.depth * 18 + 12}px`;

        const iconEl = document.createElement('i');
        iconEl.className = `${dir.icon || (dir.type === 'notebook' ? 'ti ti-notebook' : 'ti ti-folder')} folder-tree-picker-item-icon`;

        const textContainer = document.createElement('div');
        textContainer.className = 'folder-tree-picker-item-text';

        const nameEl = document.createElement('span');
        nameEl.className = 'folder-tree-picker-item-name';
        nameEl.textContent = dir.name;

        textContainer.appendChild(nameEl);

        if (dir.path && dir.depth > 0) {
          const pathEl = document.createElement('span');
          pathEl.className = 'folder-tree-picker-item-path';
          pathEl.textContent = dir.path;
          textContainer.appendChild(pathEl);
        }

        const countEl = document.createElement('span');
        countEl.className = 'folder-tree-picker-item-count';
        countEl.textContent = `${dir.itemCount}`;

        itemEl.appendChild(iconEl);
        itemEl.appendChild(textContainer);
        itemEl.appendChild(countEl);

        itemEl.onclick = () => {
          this.selectedDirId = dir.id;
          this.selectedDirName = dir.name;
          renderList();
        };

        itemEl.ondblclick = () => {
          this.selectedDirId = dir.id;
          this.selectedDirName = dir.name;
          this.confirm();
        };

        listContainer.appendChild(itemEl);
      });
    };

    // 搜索过滤事件
    searchInput.oninput = () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) {
        this.filteredDirectories = [...this.directories];
      } else {
        this.filteredDirectories = this.directories.filter(d =>
          d.name.toLowerCase().includes(query) || d.path.toLowerCase().includes(query)
        );
      }
      if (this.filteredDirectories.length > 0 && !this.filteredDirectories.some(d => d.id === this.selectedDirId)) {
        this.selectedDirId = this.filteredDirectories[0].id;
        this.selectedDirName = this.filteredDirectories[0].name;
      }
      renderList();
    };

    // 点击蒙层外部关闭
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };

    // 键盘支持
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleKeyDown);
      } else if (e.key === 'Enter') {
        this.confirm();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    renderList();
    setTimeout(() => searchInput.focus(), 50);
  }
}

export function showDirectoryPickerDialog(options: DirectoryPickerOptions): DirectoryPickerDialog {
  const dialog = new DirectoryPickerDialog(options);
  dialog.show();
  return dialog;
}
