/**
 * 文档树插件 - 数据持久化模块
 * 负责数据的存储、读取、备份和恢复
 */

interface FolderDocument {
  id: string;
  name: string;
  blockId: string | null;
  parentId: string | null;
  order: number;
  type: "document" | "folder";
  children?: string[];
  icon?: string;
  color?: string;
  created: string;
  modified: string;
}

interface FolderNotebook {
  id: string;
  name: string;
  order: number;
  created: string;
  modified: string;
  documents: string[];
}

interface FolderTreeData {
  notebooks: FolderNotebook[];
  documents: FolderDocument[];
  settings: {
    expandedNotebooks: string[];
    expandedFolders: string[];
    selectedItems: string[];
  };
}

class FolderTreePersistence {
  private readonly PLUGIN_KEY = "folder-tree";
  private readonly DATA_VERSION = "1.0.0";

  /**
   * 获取默认数据结构
   */
  private getDefaultData(): FolderTreeData {
    return {
      notebooks: [],
      documents: [],
      settings: {
        expandedNotebooks: [],
        expandedFolders: [],
        selectedItems: [],
      },
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(type: "notebook" | "document" | "folder"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * 读取数据
   */
  async loadData(): Promise<FolderTreeData> {
    try {
      const dataStr = await orca.plugins.getData(this.PLUGIN_KEY, "data");
      if (!dataStr) {
        return this.getDefaultData();
      }

      const data = JSON.parse(dataStr) as FolderTreeData;

      // 数据迁移和兼容性处理
      // 移除了备份相关字段

      if (!data.settings) {
        data.settings = {
          expandedNotebooks: [],
          expandedFolders: [],
          selectedItems: [],
        };
      }

      return data;
    } catch (error) {
      console.error("[Folder Tree] 加载数据失败:", error);
      return this.getDefaultData();
    }
  }

  /**
   * 保存数据
   */
  async saveData(data: FolderTreeData): Promise<boolean> {
    try {
      // 更新修改时间
      const now = new Date().toISOString();

      // 更新笔记本和文档的修改时间
      data.notebooks.forEach(notebook => {
        notebook.modified = now;
      });

      data.documents.forEach(doc => {
        doc.modified = now;
      });

      const dataStr = JSON.stringify(data, null, 2);
      await orca.plugins.setData(this.PLUGIN_KEY, "data", dataStr);

      console.log("[Folder Tree] 数据保存成功");
      return true;
    } catch (error) {
      console.error("[Folder Tree] 保存数据失败:", error);
      orca.notify("error", "文档树数据保存失败");
      return false;
    }
  }

  /**
   * 创建笔记本
   */
  async createNotebook(name: string): Promise<FolderNotebook | null> {
    try {
      const data = await this.loadData();

      const notebook: FolderNotebook = {
        id: this.generateId("notebook"),
        name,
        order: data.notebooks.length,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        documents: [],
      };

      data.notebooks.push(notebook);

      const success = await this.saveData(data);
      return success ? notebook : null;
    } catch (error) {
      console.error("[Folder Tree] 创建笔记本失败:", error);
      return null;
    }
  }

  /**
   * 删除笔记本
   */
  async deleteNotebook(notebookId: string): Promise<boolean> {
    try {
      const data = await this.loadData();

      // 删除笔记本
      const notebookIndex = data.notebooks.findIndex(nb => nb.id === notebookId);
      if (notebookIndex === -1) return false;

      const notebook = data.notebooks[notebookIndex];

      // 删除笔记本下的所有文档
      const documentsToDelete = new Set<string>(notebook.documents);

      // 递归删除文件夹和文档
      const deleteRecursively = (docId: string) => {
        const doc = data.documents.find(d => d.id === docId);
        if (doc && doc.children) {
          doc.children.forEach(childId => deleteRecursively(childId));
        }
        documentsToDelete.add(docId);
      };

      notebook.documents.forEach(docId => deleteRecursively(docId));

      // 从数据中删除
      data.documents = data.documents.filter(doc => !documentsToDelete.has(doc.id));
      data.notebooks.splice(notebookIndex, 1);

      // 重新排序
      data.notebooks.forEach((nb, index) => {
        nb.order = index;
      });

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 删除笔记本失败:", error);
      return false;
    }
  }

  /**
   * 重命名笔记本
   */
  async renameNotebook(notebookId: string, newName: string): Promise<boolean> {
    try {
      const data = await this.loadData();
      const notebook = data.notebooks.find(nb => nb.id === notebookId);
      if (!notebook) return false;

      notebook.name = newName;
      notebook.modified = new Date().toISOString();

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 重命名笔记本失败:", error);
      return false;
    }
  }

  /**
   * 创建文档/文件夹
   */
  async createDocument(
    name: string,
    blockId: string | null,
    parentId: string,
    type: "document" | "folder" = "document",
    icon?: string,
    color?: string
  ): Promise<FolderDocument | null> {
    try {
      const data = await this.loadData();

      // 允许根级：当 parentId === 'root' 时存为根（parentId=null）
      const isRoot = parentId === 'root';

      const document: FolderDocument = {
        id: this.generateId("document"),
        name,
        blockId,
        parentId: isRoot ? null : parentId,
        order: this.getNextOrder(data, isRoot ? 'root' as any : parentId),
        type,
        children: type === "folder" ? [] : undefined,
        icon,
        color,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      data.documents.push(document);

      // 更新父级的children列表
      if (isRoot) {
        // 根级无需维护引用列表
      } else if (parentId.startsWith("notebook_")) {
        const notebook = data.notebooks.find(nb => nb.id === parentId);
        if (notebook) {
          notebook.documents.push(document.id);
        }
      } else {
        const parentDoc = data.documents.find(doc => doc.id === parentId);
        if (parentDoc && parentDoc.type === "folder") {
          if (!parentDoc.children) parentDoc.children = [];
          parentDoc.children.push(document.id);
        }
      }

      const success = await this.saveData(data);
      return success ? document : null;
    } catch (error) {
      console.error("[Folder Tree] 创建文档失败:", error);
      return null;
    }
  }

  /**
   * 删除文档/文件夹
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const data = await this.loadData();

      // 递归删除
      const deleteRecursively = (docId: string) => {
        const doc = data.documents.find(d => d.id === docId);
        if (!doc) return;

        // 如果是文件夹，递归删除子项
        if (doc.type === "folder" && doc.children) {
          doc.children.forEach(childId => deleteRecursively(childId));
        }

        // 从父级中移除
        if (doc.parentId?.startsWith("notebook_")) {
          const notebook = data.notebooks.find(nb => nb.id === doc.parentId);
          if (notebook) {
            notebook.documents = notebook.documents.filter(id => id !== docId);
          }
        } else if (doc.parentId) {
          const parentDoc = data.documents.find(d => d.id === doc.parentId);
          if (parentDoc && parentDoc.children) {
            parentDoc.children = parentDoc.children.filter(id => id !== docId);
          }
        }

        // 删除文档
        data.documents = data.documents.filter(d => d.id !== docId);
      };

      deleteRecursively(documentId);

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 删除文档失败:", error);
      return false;
    }
  }

  /**
   * 移动文档/笔记本
   */
  async moveItem(
    itemId: string,
    newParentId: string | null,
    newOrder?: number
  ): Promise<boolean> {
    try {
      const data = await this.loadData();

      // 移动笔记本
      if (itemId.startsWith("notebook_")) {
        const notebookIndex = data.notebooks.findIndex(nb => nb.id === itemId);
        if (notebookIndex === -1) return false;

        const notebook = data.notebooks[notebookIndex];
        if (newOrder !== undefined) {
          notebook.order = newOrder;
        }

        // 重新排序其他笔记本
        data.notebooks.sort((a, b) => a.order - b.order);
        data.notebooks.forEach((nb, index) => {
          nb.order = index;
        });
      }
      // 移动文档/文件夹
      else {
        const doc = data.documents.find(d => d.id === itemId);
        if (!doc) return false;

        const oldParentId = doc.parentId;

        // 从旧父级中移除
        if (oldParentId?.startsWith("notebook_")) {
          const notebook = data.notebooks.find(nb => nb.id === oldParentId);
          if (notebook) {
            notebook.documents = notebook.documents.filter(id => id !== itemId);
          }
        } else if (oldParentId) {
          const parentDoc = data.documents.find(d => d.id === oldParentId);
          if (parentDoc && parentDoc.children) {
            parentDoc.children = parentDoc.children.filter(id => id !== itemId);
          }
        }

        // 添加到新父级
        doc.parentId = newParentId;
        if (newOrder !== undefined) {
          doc.order = newOrder;
        }

        if (newParentId?.startsWith("notebook_")) {
          const notebook = data.notebooks.find(nb => nb.id === newParentId);
          if (notebook) {
            notebook.documents.push(itemId);
          }
        } else if (newParentId) {
          const parentDoc = data.documents.find(d => d.id === newParentId);
          if (parentDoc && parentDoc.type === "folder") {
            if (!parentDoc.children) parentDoc.children = [];
            parentDoc.children.push(itemId);
          }
        }
      }

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 移动项目失败:", error);
      return false;
    }
  }

  /**
   * 获取下一个排序号
   */
  private getNextOrder(data: FolderTreeData, parentId: string): number {
    if (parentId.startsWith("notebook_")) {
      const notebook = data.notebooks.find(nb => nb.id === parentId);
      if (!notebook) return 0;
      return notebook.documents.length;
    } else {
      const siblings = data.documents.filter(doc => doc.parentId === parentId);
      return Math.max(...siblings.map(doc => doc.order), -1) + 1;
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(settings: Partial<FolderTreeData["settings"]>): Promise<boolean> {
    try {
      const data = await this.loadData();
      data.settings = { ...data.settings, ...settings };
      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 保存设置失败:", error);
      return false;
    }
  }
}

export { FolderTreePersistence, type FolderTreeData, type FolderNotebook, type FolderDocument };