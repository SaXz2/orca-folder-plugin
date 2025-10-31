/**
 * 文档树插件 - 核心数据管理模块
 * 负责数据处理、状态管理和业务逻辑
 */

import { FolderTreePersistence, type FolderTreeData, type FolderItem } from "./folder-tree-persistence";

class FolderTreeCore {
  private persistence: FolderTreePersistence;
  private data: FolderTreeData | null = null;
  private listeners: Array<(data: FolderTreeData) => void> = [];

  constructor() {
    this.persistence = new FolderTreePersistence();
  }

  /**
   * 初始化核心模块
   */
  async initialize(): Promise<boolean> {
    try {
      this.data = await this.persistence.loadData();
      console.log("[Folder Tree] 核心模块初始化成功");
      return true;
    } catch (error) {
      console.error("[Folder Tree] 核心模块初始化失败:", error);
      return false;
    }
  }

  /**
   * 获取当前数据
   */
  getData(): FolderTreeData {
    if (!this.data) {
      throw new Error("数据未初始化");
    }
    return this.data;
  }

  /**
   * 添加数据变化监听器
   */
  addChangeListener(listener: (data: FolderTreeData) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除数据变化监听器
   */
  removeChangeListener(listener: (data: FolderTreeData) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知数据变化
   */
  private notifyDataChange(): void {
    if (this.data) {
      this.listeners.forEach(listener => {
        try {
          listener(this.data!);
        } catch (error) {
          console.error("[Folder Tree] 监听器执行失败:", error);
        }
      });
    }
  }

  /**
   * 保存数据
   */
  private async saveData(): Promise<boolean> {
    if (!this.data) return false;

    const success = await this.persistence.saveData(this.data);
    if (success) {
      this.notifyDataChange();
    }
    return success;
  }

  // ========== 项目操作（统一接口） ==========

  /**
   * 创建项目（笔记本、文件夹或文档）
   */
  async createItem(
    name: string,
    type: "notebook" | "folder" | "document",
    blockId: string | null = null,
    parentId: string | null = null,
    icon?: string,
    color?: string
  ): Promise<FolderItem | null> {
    const item = await this.persistence.createItem(name, type, blockId, parentId, icon, color);
    if (item && this.data) {
      // 重新加载完整数据以保持同步
      this.data = await this.persistence.loadData();
      // 触发UI更新
      this.notifyDataChange();
    }
    return item;
  }

  /**
   * 删除项目
   */
  async deleteItem(itemId: string): Promise<boolean> {
    const success = await this.persistence.deleteItem(itemId);
    if (success && this.data) {
      // 重新加载数据以保持同步
      this.data = await this.persistence.loadData();
      await this.saveData();
    }
    return success;
  }

  /**
   * 重命名项目
   */
  async renameItem(itemId: string, newName: string): Promise<boolean> {
    if (!this.data) return false;

    const success = await this.persistence.renameItem(itemId, newName);
    if (success) {
      // 更新本地数据
      const item = this.data.items.find(i => i.id === itemId);
      if (item) {
        item.name = newName;
        item.modified = new Date().toISOString();
      }
      await this.saveData();
    }
    return success;
  }

  /**
   * 移动项目
   */
  async moveItem(
    itemId: string,
    newParentId: string | null,
    insertIndex?: number
  ): Promise<boolean> {
    const success = await this.persistence.moveItem(itemId, newParentId, insertIndex);
    if (success && this.data) {
      // 重新加载数据以保持同步
      this.data = await this.persistence.loadData();
      this.notifyDataChange();
    }
    return success;
  }

  /**
   * 重新排序项目
   */
  async reorderItems(parentId: string | null, itemIds: string[]): Promise<boolean> {
    if (!this.data) return false;

    const success = await this.persistence.reorderItems(parentId, itemIds);
    if (success) {
      // 重新加载数据以保持同步
      this.data = await this.persistence.loadData();
      this.notifyDataChange();
    }
    return success;
  }

  /**
   * 确保指定项目为文件夹
   */
  async ensureFolder(itemId: string): Promise<boolean> {
    if (!this.data) return false;
    const item = this.data.items.find(i => i.id === itemId);
    if (!item) return false;

    if (item.type !== "folder") {
      item.type = "folder";
      if (!item.children) item.children = [];
      return await this.saveData();
    }
    if (!item.children) item.children = [];
    return await this.saveData();
  }

  // ========== 兼容性方法（向后兼容） ==========

  /**
   * 创建笔记本（兼容性方法）
   */
  async createNotebook(name: string): Promise<FolderItem | null> {
    return this.createItem(name, "notebook");
  }

  /**
   * 删除笔记本（兼容性方法）
   */
  async deleteNotebook(notebookId: string): Promise<boolean> {
    return this.deleteItem(notebookId);
  }

  /**
   * 重命名笔记本（兼容性方法）
   */
  async renameNotebook(notebookId: string, newName: string): Promise<boolean> {
    return this.renameItem(notebookId, newName);
  }

  /**
   * 重新排序笔记本（兼容性方法）
   */
  async reorderNotebooks(notebookIds: string[]): Promise<boolean> {
    return this.reorderItems(null, notebookIds);
  }

  /**
   * 创建文档（兼容性方法）
   */
  async createDocument(
    name: string,
    blockId: string | null,
    parentId: string | null,
    type: "document" | "folder" = "document",
    icon?: string,
    color?: string
  ): Promise<FolderItem | null> {
    return this.createItem(name, type, blockId, parentId, icon, color);
  }

  /**
   * 删除文档（兼容性方法）
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    return this.deleteItem(documentId);
  }

  /**
   * 重命名文档（兼容性方法）
   */
  async renameDocument(documentId: string, newName: string): Promise<boolean> {
    return this.renameItem(documentId, newName);
  }

  /**
   * 更新文档图标
   */
  async updateDocumentIcon(documentId: string, icon: string): Promise<boolean> {
    if (!this.data) return false;
    
    const item = this.data.items.find(i => i.id === documentId);
    if (!item) {
      console.error('[Folder Tree] 文档不存在:', documentId);
      return false;
    }
    
    // 更新图标
    item.icon = icon;
    item.modified = new Date().toISOString();
    
    // 保存到持久化
    const success = await this.persistence.updateItem(documentId, { icon });
    if (success) {
      this.notifyDataChange();
    }
    
    return success;
  }

  /**
   * 移动文档（兼容性方法）
   */
  async moveDocument(
    documentId: string,
    newParentId: string,
    insertIndex?: number
  ): Promise<boolean> {
    return this.moveItem(documentId, newParentId, insertIndex);
  }

  // ========== 设置操作 ==========

  /**
   * 设置展开状态
   */
  async setExpandedState(ids: string[]): Promise<boolean> {
    if (!this.data) return false;

    this.data.settings.expandedItems = ids;
    return await this.persistence.saveSettings(this.data.settings);
  }

  /**
   * 设置选中项
   */
  async setSelectedItems(ids: string[]): Promise<boolean> {
    if (!this.data) return false;

    this.data.settings.selectedItems = ids;
    return await this.persistence.saveSettings(this.data.settings);
  }

  /**
   * 获取已关闭的笔记本
   */
  getClosedNotebooks(): string[] {
    return this.data?.settings.closedNotebooks || [];
  }

  /**
   * 关闭笔记本
   */
  async closeNotebook(notebookId: string): Promise<boolean> {
    if (!this.data) return false;

    const notebook = this.getItemById(notebookId);
    if (!notebook || notebook.type !== 'notebook') {
      console.error('[Folder Tree] 笔记本不存在或类型不正确:', notebookId);
      return false;
    }

    // 如果已经关闭，不重复添加
    if (this.data.settings.closedNotebooks.includes(notebookId)) {
      return true;
    }

    this.data.settings.closedNotebooks.push(notebookId);
    const success = await this.persistence.saveSettings(this.data.settings);
    if (success) {
      this.notifyDataChange();
    }
    return success;
  }

  /**
   * 恢复笔记本（取消关闭）
   */
  async restoreNotebook(notebookId: string): Promise<boolean> {
    if (!this.data) return false;

    const index = this.data.settings.closedNotebooks.indexOf(notebookId);
    if (index === -1) {
      return true; // 如果不在关闭列表中，认为已经恢复
    }

    this.data.settings.closedNotebooks.splice(index, 1);
    const success = await this.persistence.saveSettings(this.data.settings);
    if (success) {
      this.notifyDataChange();
    }
    return success;
  }

  /**
   * 对指定项目的子项进行自然排序
   * @param parentId - 父项目ID，如果为null则对根级项目排序
   */
  async naturalSortChildren(parentId: string | null): Promise<boolean> {
    if (!this.data) return false;

    // 获取所有子项
    // 如果 parentId 为 null，获取根级项目；否则获取指定项目的子项
    const children = parentId === null 
      ? this.getRootItems()
      : this.getItemChildren(parentId);
    
    if (children.length === 0) {
      return true; // 没有子项，无需排序
    }

    // 自然排序函数：能够正确处理数字
    const naturalCompare = (a: string, b: string): number => {
      // 将字符串分割成数字和非数字部分
      const regex = /(\d+|\D+)/g;
      const aParts = a.toLowerCase().match(regex) || [];
      const bParts = b.toLowerCase().match(regex) || [];
      
      const minLength = Math.min(aParts.length, bParts.length);
      
      for (let i = 0; i < minLength; i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];
        
        // 如果都是数字，按数值比较
        const aNum = Number(aPart);
        const bNum = Number(bPart);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          if (aNum !== bNum) {
            return aNum - bNum;
          }
        } else {
          // 否则按字符串比较
          if (aPart !== bPart) {
            return aPart < bPart ? -1 : 1;
          }
        }
      }
      
      // 如果前缀相同，较短的排在前面
      return aParts.length - bParts.length;
    };

    // 按名称自然排序
    const sortedChildren = [...children].sort((a, b) => naturalCompare(a.name, b.name));

    // 获取排序后的ID列表
    const sortedIds = sortedChildren.map(item => item.id);

    // 使用现有的reorderItems方法更新顺序
    return await this.reorderItems(parentId, sortedIds);
  }

  /**
   * 获取展开的项目
   */
  getExpandedItems(): string[] {
    return this.data?.settings.expandedItems || [];
  }

  /**
   * 获取选中的项目
   */
  getSelectedItems(): string[] {
    return this.data?.settings.selectedItems || [];
  }

  // ========== 兼容性设置方法 ==========

  /**
   * 设置展开状态（兼容性方法）
   */
  async setExpandedStateOld(type: "notebooks" | "folders", ids: string[]): Promise<boolean> {
    // 合并到新的展开状态中
    const currentExpanded = this.getExpandedItems();
    let newExpanded: string[] = [];

    if (type === "notebooks") {
      // 保留当前的非笔记本展开项，添加新的笔记本展开项
      newExpanded = [
        ...currentExpanded.filter(id => {
          const item = this.data?.items.find(i => i.id === id);
          return item?.type !== "notebook";
        }),
        ...ids
      ];
    } else {
      // 保留当前的笔记本展开项，添加新的文件夹展开项
      newExpanded = [
        ...currentExpanded.filter(id => {
          const item = this.data?.items.find(i => i.id === id);
          return item?.type === "notebook";
        }),
        ...ids
      ];
    }

    return this.setExpandedState(newExpanded);
  }

  /**
   * 获取展开的笔记本（兼容性方法）
   */
  getExpandedNotebooks(): string[] {
    const expanded = this.getExpandedItems();
    return expanded.filter(id => {
      const item = this.data?.items.find(i => i.id === id);
      return item?.type === "notebook";
    });
  }

  /**
   * 获取展开的文件夹（兼容性方法）
   */
  getExpandedFolders(): string[] {
    const expanded = this.getExpandedItems();
    return expanded.filter(id => {
      const item = this.data?.items.find(i => i.id === id);
      return item?.type === "folder";
    });
  }

  
  
  // ========== 工具方法 ==========

  /**
   * 根据ID获取项目
   */
  getItemById(id: string): FolderItem | null {
    return this.data?.items.find(item => item.id === id) || null;
  }

  /**
   * 获取项目的子项目
   */
  getItemChildren(itemId: string): FolderItem[] {
    if (!this.data) return [];

    const children = this.data.items.filter(item => item.parentId === itemId);
    return children.sort((a, b) => a.order - b.order);
  }

  /** 根级项目（包括笔记本和文档，排除已关闭的笔记本） */
  getRootItems(): FolderItem[] {
    if (!this.data) return [];
    const closedNotebooks = new Set(this.getClosedNotebooks());
    const items = this.data.items.filter(item => 
      item.parentId === null && !closedNotebooks.has(item.id)
    );
    return items.sort((a, b) => a.order - b.order);
  }

  /** 获取已关闭的笔记本列表 */
  getClosedNotebookItems(): FolderItem[] {
    if (!this.data) return [];
    const closedNotebooks = this.getClosedNotebooks();
    const items = this.data.items.filter(item => 
      closedNotebooks.includes(item.id)
    );
    return items.sort((a, b) => a.order - b.order);
  }

  // ========== 兼容性工具方法 ==========

  /**
   * 根据ID获取文档（兼容性方法）
   */
  getDocumentById(id: string): FolderItem | null {
    const item = this.getItemById(id);
    return item?.type === "document" || item?.type === "folder" ? item : null;
  }

  /**
   * 根据ID获取笔记本（兼容性方法）
   */
  getNotebookById(id: string): FolderItem | null {
    const item = this.getItemById(id);
    return item?.type === "notebook" ? item : null;
  }

  /**
   * 获取文档的子文档（兼容性方法）
   */
  getDocumentChildren(documentId: string): FolderItem[] {
    const children = this.getItemChildren(documentId);
    return children.filter(item => item.type === "document" || item.type === "folder");
  }

  /**
   * 获取笔记本的文档（兼容性方法）
   */
  getNotebookDocuments(notebookId: string): FolderItem[] {
    const children = this.getItemChildren(notebookId);
    return children.filter(item => item.type === "document" || item.type === "folder");
  }

  /** 根级文档（与笔记本同级）（兼容性方法） */
  getRootDocuments(): FolderItem[] {
    const rootItems = this.getRootItems();
    return rootItems.filter(item => item.type === "document" || item.type === "folder");
  }

  /** 根级笔记本（兼容性方法） */
  getRootNotebooks(): FolderItem[] {
    const rootItems = this.getRootItems();
    return rootItems.filter(item => item.type === "notebook");
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.data ? this.data.items.length === 0 : true;
  }

  /**
   * 搜索项目
   */
  searchItems(keyword: string): FolderItem[] {
    if (!this.data || !keyword.trim()) return [];

    const lowerKeyword = keyword.toLowerCase();
    return this.data.items.filter(item =>
      item.name.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 搜索文档（兼容性方法）
   */
  searchDocuments(keyword: string): FolderItem[] {
    const items = this.searchItems(keyword);
    return items.filter(item => item.type === "document" || item.type === "folder");
  }

  /**
   * 从块ID添加文档到笔记本（兼容性方法）
   */
  async addDocumentToNotebook(blockId: string, notebookId: string): Promise<boolean> {
    if (!this.data) return false;

    try {
      // 获取块信息
      const block = await (window as any).orca.invokeBackend('get-block', blockId);
      if (!block) {
        console.error('Block not found:', blockId);
        return false;
      }

      const blockName = block.text
        ? (block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text)
        : '未命名文档';

      // 创建文档
      const document = await this.createDocument(blockName, blockId, notebookId, 'document');
      if (document) {
        // 确保笔记本展开
        const expandedItems = this.getExpandedItems();
        if (!expandedItems.includes(notebookId)) {
          expandedItems.push(notebookId);
          await this.setExpandedState(expandedItems);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Add document to notebook error:', error);
      return false;
    }
  }

  /**
   * 重新排序文档（兼容性方法）
   */
  async reorderDocuments(parentId: string, documentIds: string[]): Promise<boolean> {
    return this.reorderItems(parentId, documentIds);
  }
}

export { FolderTreeCore };