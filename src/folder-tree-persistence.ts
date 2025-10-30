/**
 * 文档树插件 - 数据持久化模块
 * 负责数据的存储、读取、备份和恢复
 */

interface FolderItem {
  id: string;
  name: string;
  blockId: string | null;
  parentId: string | null;
  order: number;
  type: "notebook" | "folder" | "document";
  children?: string[];
  icon?: string;
  color?: string;
  created: string;
  modified: string;
}

interface FolderTreeData {
  items: FolderItem[];
  settings: {
    expandedItems: string[];
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
      items: [],
      settings: {
        expandedItems: [],
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

      const data = JSON.parse(dataStr);

      // 数据迁移：从旧格式迁移到新格式
      if (data.notebooks && data.documents) {
        return this.migrateFromOldFormat(data);
      }

      // 新格式数据
      const newData = data as FolderTreeData;

      // 确保设置存在
      if (!newData.settings) {
        newData.settings = {
          expandedItems: [],
          selectedItems: [],
        };
      }

      return newData;
    } catch (error) {
      console.error("[Folder Tree] 加载数据失败:", error);
      return this.getDefaultData();
    }
  }

  /**
   * 从旧格式迁移数据到新格式
   */
  private migrateFromOldFormat(oldData: any): FolderTreeData {
    console.log("[Folder Tree] 开始迁移旧格式数据");

    const items: FolderItem[] = [];

    // 迁移笔记本
    if (oldData.notebooks) {
      oldData.notebooks.forEach((notebook: any) => {
        items.push({
          id: notebook.id,
          name: notebook.name,
          blockId: null,
          parentId: null,
          order: notebook.order,
          type: "notebook",
          children: notebook.documents || [],
          icon: "ti ti-notebook",
          created: notebook.created,
          modified: notebook.modified
        });
      });
    }

    // 迁移文档和文件夹
    if (oldData.documents) {
      oldData.documents.forEach((doc: any) => {
        items.push({
          ...doc,
          type: doc.type || "document" // 确保类型正确
        });
      });
    }

    // 迁移设置
    const settings = {
      expandedItems: [
        ...(oldData.settings?.expandedNotebooks || []),
        ...(oldData.settings?.expandedFolders || [])
      ],
      selectedItems: oldData.settings?.selectedItems || []
    };

    console.log("[Folder Tree] 数据迁移完成，共迁移", items.length, "个项目");

    // 保存新格式
    const newData = { items, settings };
    this.saveData(newData).catch(err =>
      console.error("[Folder Tree] 保存迁移后数据失败:", err)
    );

    return newData;
  }

  /**
   * 保存数据
   */
  async saveData(data: FolderTreeData): Promise<boolean> {
    try {
      // 更新修改时间
      const now = new Date().toISOString();

      // 更新所有项目的修改时间
      data.items.forEach(item => {
        item.modified = now;
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
    try {
      const data = await this.loadData();

      // 获取下一个排序号
      const order = this.getNextOrder(data, parentId);

      const item: FolderItem = {
        id: this.generateId(type),
        name,
        blockId,
        parentId: parentId || null,
        order,
        type,
        children: type === "folder" || type === "notebook" ? [] : undefined,
        icon: icon || (type === "notebook" ? "ti ti-notebook" : type === "folder" ? "ti ti-folder" : "ti ti-cube"),
        color,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      data.items.push(item);

      // 更新父级的children列表
      if (parentId) {
        const parent = data.items.find(i => i.id === parentId);
        if (parent && (parent.type === "folder" || parent.type === "notebook")) {
          if (!parent.children) parent.children = [];
          parent.children.push(item.id);
        }
      }

      const success = await this.saveData(data);
      return success ? item : null;
    } catch (error) {
      console.error("[Folder Tree] 创建项目失败:", error);
      return null;
    }
  }

  /**
   * 删除项目
   */
  async deleteItem(itemId: string): Promise<boolean> {
    try {
      const data = await this.loadData();

      // 递归删除
      const deleteRecursively = (id: string) => {
        const item = data.items.find(i => i.id === id);
        if (!item) return;

        // 如果是文件夹或笔记本，递归删除子项
        if (item.children && item.children.length > 0) {
          item.children.forEach(childId => deleteRecursively(childId));
        }

        // 从父级中移除
        if (item.parentId) {
          const parent = data.items.find(i => i.id === item.parentId);
          if (parent && parent.children) {
            parent.children = parent.children.filter(childId => childId !== id);
          }
        }

        // 删除项目
        data.items = data.items.filter(i => i.id !== id);
      };

      deleteRecursively(itemId);

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 删除项目失败:", error);
      return false;
    }
  }

  /**
   * 重命名项目
   */
  async renameItem(itemId: string, newName: string): Promise<boolean> {
    try {
      const data = await this.loadData();
      const item = data.items.find(i => i.id === itemId);
      if (!item) return false;

      item.name = newName;
      item.modified = new Date().toISOString();

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 重命名项目失败:", error);
      return false;
    }
  }

  /**
   * 移动项目
   */
  async moveItem(
    itemId: string,
    newParentId: string | null,
    insertIndex?: number
  ): Promise<boolean> {
    try {
      const data = await this.loadData();
      const item = data.items.find(i => i.id === itemId);
      if (!item) return false;

      const oldParentId = item.parentId;

      // 从旧父级移除
      if (oldParentId) {
        const oldParent = data.items.find(i => i.id === oldParentId);
        if (oldParent && oldParent.children) {
          oldParent.children = oldParent.children.filter(id => id !== itemId);
        }
      }

      // 更新父级
      item.parentId = newParentId;

      // 添加到新父级
      if (newParentId) {
        const newParent = data.items.find(i => i.id === newParentId);
        if (newParent && (newParent.type === "folder" || newParent.type === "notebook")) {
          if (!newParent.children) newParent.children = [];
          if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newParent.children.length) {
            newParent.children.splice(insertIndex, 0, itemId);
          } else {
            newParent.children.push(itemId);
          }
        }
      }

      // 重新计算排序
      this.updateItemOrder(data, newParentId);

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 移动项目失败:", error);
      return false;
    }
  }

  /**
   * 重新排序项目
   */
  async reorderItems(parentId: string | null, itemIds: string[]): Promise<boolean> {
    try {
      const data = await this.loadData();

      // 更新父级的子项目列表
      if (parentId) {
        const parent = data.items.find(i => i.id === parentId);
        if (parent) {
          parent.children = [...itemIds];
        }
      }

      // 更新所有项目的排序字段
      itemIds.forEach((itemId, index) => {
        const item = data.items.find(i => i.id === itemId);
        if (item) {
          item.order = index;
        }
      });

      return await this.saveData(data);
    } catch (error) {
      console.error("[Folder Tree] 重新排序项目失败:", error);
      return false;
    }
  }

  /**
   * 获取下一个排序号
   */
  private getNextOrder(data: FolderTreeData, parentId: string | null): number {
    const siblings = data.items.filter(item => item.parentId === parentId);
    return Math.max(...siblings.map(item => item.order), -1) + 1;
  }

  /**
   * 更新项目排序
   */
  private updateItemOrder(data: FolderTreeData, parentId: string | null): void {
    if (parentId) {
      const parent = data.items.find(item => item.id === parentId);
      if (parent && parent.children) {
        parent.children.forEach((childId, index) => {
          const child = data.items.find(item => item.id === childId);
          if (child) {
            child.order = index;
          }
        });
      }
    } else {
      // 根级项目排序
      const rootItems = data.items.filter(item => item.parentId === null);
      rootItems.sort((a, b) => a.order - b.order).forEach((item, index) => {
        item.order = index;
      });
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

export { FolderTreePersistence, type FolderTreeData, type FolderItem };