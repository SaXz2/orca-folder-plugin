/**
 * 文档树插件 - 核心数据管理模块
 * 负责数据处理、状态管理和业务逻辑
 */

import { FolderTreePersistence, type FolderTreeData, type FolderNotebook, type FolderDocument } from "./folder-tree-persistence";

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

  // ========== 笔记本操作 ==========

  /**
   * 创建笔记本
   */
  async createNotebook(name: string): Promise<FolderNotebook | null> {
    const notebook = await this.persistence.createNotebook(name);
    if (notebook && this.data) {
      this.data.notebooks.push(notebook);
      await this.saveData();
    }
    return notebook;
  }

  /**
   * 删除笔记本
   */
  async deleteNotebook(notebookId: string): Promise<boolean> {
    const success = await this.persistence.deleteNotebook(notebookId);
    if (success && this.data) {
      this.data.notebooks = this.data.notebooks.filter(nb => nb.id !== notebookId);
      await this.saveData();
    }
    return success;
  }

  /**
   * 重命名笔记本
   */
  async renameNotebook(notebookId: string, newName: string): Promise<boolean> {
    const success = await this.persistence.renameNotebook(notebookId, newName);
    if (success && this.data) {
      const notebook = this.data.notebooks.find(nb => nb.id === notebookId);
      if (notebook) {
        notebook.name = newName;
        await this.saveData();
      }
    }
    return success;
  }

  /**
   * 重新排序笔记本
   */
  async reorderNotebooks(notebookIds: string[]): Promise<boolean> {
    if (!this.data) return false;

    try {
      // 更新排序
      notebookIds.forEach((id, index) => {
        const notebook = this.data!.notebooks.find(nb => nb.id === id);
        if (notebook) {
          notebook.order = index;
        }
      });

      // 重新排序数组
      this.data.notebooks.sort((a, b) => a.order - b.order);

      return await this.saveData();
    } catch (error) {
      console.error("[Folder Tree] 重排序笔记本失败:", error);
      return false;
    }
  }

  // ========== 文档/文件夹操作 ==========

  /**
   * 创建文档
   */
  async createDocument(
    name: string,
    blockId: string | null,
    parentId: string,
    type: "document" | "folder" = "document",
    icon?: string,
    color?: string
  ): Promise<FolderDocument | null> {
    const document = await this.persistence.createDocument(name, blockId, parentId, type, icon, color);
    if (document && this.data) {
      // 重新加载完整数据以保持同步
      this.data = await this.persistence.loadData();
      // 触发UI更新
      this.notifyDataChange();
    }
    return document;
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const success = await this.persistence.deleteDocument(documentId);
    if (success && this.data) {
      const deleteRecursively = (id: string) => {
        const doc = this.data!.documents.find(d => d.id === id);
        if (doc) {
          if (doc.type === "folder" && doc.children) {
            doc.children.forEach(childId => deleteRecursively(childId));
          }
          this.data!.documents = this.data!.documents.filter(d => d.id !== id);
        }
      };
      deleteRecursively(documentId);
      await this.saveData();
    }
    return success;
  }

  /**
   * 重命名文档
   */
  async renameDocument(documentId: string, newName: string): Promise<boolean> {
    if (!this.data) return false;

    const document = this.data.documents.find(doc => doc.id === documentId);
    if (!document) return false;

    document.name = newName;
    document.modified = new Date().toISOString();

    return await this.saveData();
  }

  /**
   * 移动文档
   */
  async moveDocument(
    documentId: string,
    newParentId: string,
    insertIndex?: number
  ): Promise<boolean> {
    if (!this.data) return false;

    try {
      const document = this.data.documents.find(doc => doc.id === documentId);
      if (!document) return false;

      const oldParentId = document.parentId;

      // 从旧父级移除
      if (oldParentId?.startsWith("notebook_")) {
        const notebook = this.data.notebooks.find(nb => nb.id === oldParentId);
        if (notebook) {
          notebook.documents = notebook.documents.filter(id => id !== documentId);
        }
      } else if (oldParentId) {
        const oldParent = this.data.documents.find(doc => doc.id === oldParentId);
        if (oldParent && oldParent.children) {
          oldParent.children = oldParent.children.filter(id => id !== documentId);
        }
      }

      // 更新父级和排序
      document.parentId = newParentId;

      // 添加到新父级并设置排序
      if (newParentId.startsWith("notebook_")) {
        const notebook = this.data.notebooks.find(nb => nb.id === newParentId);
        if (notebook) {
          if (insertIndex !== undefined) {
            notebook.documents.splice(insertIndex, 0, documentId);
          } else {
            notebook.documents.push(documentId);
          }
        }
      } else {
        const newParent = this.data.documents.find(doc => doc.id === newParentId);
        if (newParent && newParent.type === "folder") {
          if (!newParent.children) newParent.children = [];
          if (insertIndex !== undefined) {
            newParent.children.splice(insertIndex, 0, documentId);
          } else {
            newParent.children.push(documentId);
          }
        }
      }

      // 更新排序号
      this.updateDocumentOrder(newParentId);

      return await this.saveData();
    } catch (error) {
      console.error("[Folder Tree] 移动文档失败:", error);
      return false;
    }
  }

  /**
   * 确保指定文档为文件夹（若是普通文档则转换为 folder 并初始化 children）
   */
  async ensureFolder(documentId: string): Promise<boolean> {
    if (!this.data) return false;
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return false;
    if (doc.type !== "folder") {
      doc.type = "folder";
      if (!doc.children) doc.children = [];
      return await this.saveData();
    }
    if (!doc.children) doc.children = [];
    return await this.saveData();
  }

  /**
   * 更新文档排序
   */
  private updateDocumentOrder(parentId: string): void {
    if (!this.data) return;

    if (parentId.startsWith("notebook_")) {
      const notebook = this.data.notebooks.find(nb => nb.id === parentId);
      if (notebook) {
        notebook.documents.forEach((docId, index) => {
          const doc = this.data!.documents.find(d => d.id === docId);
          if (doc) {
            doc.order = index;
          }
        });
      }
    } else {
      const siblings = this.data.documents.filter(doc => doc.parentId === parentId);
      siblings.forEach((doc, index) => {
        doc.order = index;
      });
    }
  }

  // ========== 设置操作 ==========

  /**
   * 设置展开状态
   */
  async setExpandedState(type: "notebooks" | "folders", ids: string[]): Promise<boolean> {
    if (!this.data) return false;

    if (type === "notebooks") {
      this.data.settings.expandedNotebooks = ids;
    } else {
      this.data.settings.expandedFolders = ids;
    }

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
   * 获取展开的笔记本
   */
  getExpandedNotebooks(): string[] {
    return this.data?.settings.expandedNotebooks || [];
  }

  /**
   * 获取展开的文件夹
   */
  getExpandedFolders(): string[] {
    return this.data?.settings.expandedFolders || [];
  }

  /**
   * 获取选中的项目
   */
  getSelectedItems(): string[] {
    return this.data?.settings.selectedItems || [];
  }

  
  
  // ========== 工具方法 ==========

  /**
   * 根据ID获取文档
   */
  getDocumentById(id: string): FolderDocument | null {
    return this.data?.documents.find(doc => doc.id === id) || null;
  }

  /**
   * 根据ID获取笔记本
   */
  getNotebookById(id: string): FolderNotebook | null {
    return this.data?.notebooks.find(nb => nb.id === id) || null;
  }

  /**
   * 获取文档的子文档
   */
  getDocumentChildren(documentId: string): FolderDocument[] {
    if (!this.data) return [];

    const children = this.data.documents.filter(doc => doc.parentId === documentId);
    return children.sort((a, b) => a.order - b.order);
  }

  /**
   * 获取笔记本的文档
   */
  getNotebookDocuments(notebookId: string): FolderDocument[] {
    if (!this.data) return [];

    const documentIds = this.data.notebooks.find(nb => nb.id === notebookId)?.documents || [];
    const documents = documentIds
      .map(id => this.data!.documents.find(doc => doc.id === id))
      .filter(Boolean) as FolderDocument[];

    return documents.sort((a, b) => a.order - b.order);
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.data ? this.data.notebooks.length === 0 : true;
  }

  /**
   * 搜索文档
   */
  searchDocuments(keyword: string): FolderDocument[] {
    if (!this.data || !keyword.trim()) return [];

    const lowerKeyword = keyword.toLowerCase();
    return this.data.documents.filter(doc =>
      doc.name.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 从块ID添加文档到笔记本
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
        const notebook = this.data.notebooks.find(nb => nb.id === notebookId);
        if (notebook && !this.data.settings.expandedNotebooks.includes(notebookId)) {
          this.data.settings.expandedNotebooks.push(notebookId);
          await this.persistence.saveSettings(this.data.settings);
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
   * 重新排序文档
   */
  async reorderDocuments(parentId: string, documentIds: string[]): Promise<boolean> {
    if (!this.data) return false;

    try {
      // 更新父级的子文档列表 - 这里的documentIds已经是重新排序后的完整列表
      if (parentId.startsWith('notebook_')) {
        // 在笔记本中
        const notebook = this.data.notebooks.find(nb => nb.id === parentId);
        if (notebook) {
          notebook.documents = [...documentIds];
        }
      } else {
        // 在文件夹中
        const parentDoc = this.data.documents.find(doc => doc.id === parentId);
        if (parentDoc && parentDoc.type === 'folder') {
          parentDoc.children = [...documentIds];
        }
      }

      // 更新所有文档的排序字段
      documentIds.forEach((docId, index) => {
        const doc = this.data?.documents.find(d => d.id === docId);
        if (doc) {
          doc.order = index;
        }
      });

      return await this.saveData();
    } catch (error) {
      console.error('Reorder documents error:', error);
      return false;
    }
  }
}

export { FolderTreeCore };