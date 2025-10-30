/**
 * 文档树插件 - 拖拽功能模块
 * 负责处理外部块的拖拽导入和内部拖拽排序
 */

import { FolderTreeCore } from "./folder-tree-core";

interface DragDropManager {
  core: FolderTreeCore;
  isDraggingOver: boolean;
  draggedBlockId: string | null;
  draggedItemId: string | null;
  dropTarget: string | null;
}

class FolderTreeDragDrop {
  private core: FolderTreeCore;
  private isDraggingOver = false;
  private draggedBlockId: string | null = null;
  private draggedItemId: string | null = null;
  private dropTarget: string | null = null;

  constructor(core: FolderTreeCore) {
    this.core = core;
    this.initializeDragListeners();
  }

  /**
   * 初始化拖拽监听器
   */
  private initializeDragListeners(): void {
    // 监听全局拖拽事件
    document.addEventListener("dragover", this.handleGlobalDragOver.bind(this));
    document.addEventListener("drop", this.handleGlobalDrop.bind(this));
    document.addEventListener("dragenter", this.handleGlobalDragEnter.bind(this));
    document.addEventListener("dragleave", this.handleGlobalDragLeave.bind(this));
  }

  /**
   * 全局拖拽悬停处理
   */
  private handleGlobalDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "copy";
  }

  /**
   * 全局拖拽进入处理
   */
  private handleGlobalDragEnter(e: DragEvent): void {
    // 检查是否是从Orca编辑器拖拽的块
    const draggedData = e.dataTransfer?.getData("text/plain");
    if (draggedData && this.isBlockData(draggedData)) {
      this.isDraggingOver = true;
      this.draggedBlockId = this.extractBlockId(draggedData);
    }
  }

  /**
   * 全局拖拽离开处理
   */
  private handleGlobalDragLeave(e: DragEvent): void {
    // 检查是否真的离开了文档树区域
    if (!this.isElementInFolderTree(e.relatedTarget as Element)) {
      this.isDraggingOver = false;
      this.draggedBlockId = null;
    }
  }

  /**
   * 全局拖拽放置处理
   */
  private handleGlobalDrop(e: DragEvent): void {
    e.preventDefault();

    if (!this.isDraggingOver || !this.draggedBlockId || !this.dropTarget) {
      this.resetDragState();
      return;
    }

    this.handleBlockDrop(this.draggedBlockId, this.dropTarget);
    this.resetDragState();
  }

  /**
   * 检查拖拽数据是否为块数据
   */
  private isBlockData(data: string): boolean {
    try {
      // 尝试解析Orca块数据格式
      const parsed = JSON.parse(data);
      return parsed && (parsed.type === "block" || parsed.blockId);
    } catch {
      // 如果不是JSON，检查是否包含块ID格式
      return /^block_\d+$/.test(data) || data.includes("blockId");
    }
  }

  /**
   * 提取块ID
   */
  private extractBlockId(data: string): string | null {
    try {
      const parsed = JSON.parse(data);
      return parsed.blockId || parsed.id || null;
    } catch {
      // 尝试直接从字符串中提取块ID
      const match = data.match(/block_\d+/);
      return match ? match[0] : null;
    }
  }

  /**
   * 检查元素是否在文档树区域内
   */
  private isElementInFolderTree(element: Element | null): boolean {
    if (!element) return false;

    const folderTreeElement = document.querySelector(".folder-tree-container");
    return folderTreeElement?.contains(element) || false;
  }

  /**
   * 处理块拖拽放置
   */
  private async handleBlockDrop(blockId: string, targetId: string): Promise<void> {
    try {
      // 获取块信息
      const block = await orca.invokeBackend("get-block", blockId);
      if (!block) {
        orca.notify("error", "无法获取块信息");
        return;
      }

      // 获取块名称（使用文本内容的前50个字符）
      const blockName = block.text
        ? (block.text.length > 50 ? block.text.substring(0, 50) + "..." : block.text)
        : "未命名文档";

      // 创建文档
      const document = await this.core.createDocument(blockName, blockId, targetId, "document");
      if (document) {
        orca.notify("success", "文档导入成功");

        // 展开目标笔记本/文件夹
        const expandedItems = this.core.getExpandedItems();
        if (!expandedItems.includes(targetId)) {
          await this.core.setExpandedState([...expandedItems, targetId]);
        }
      } else {
        orca.notify("error", "文档导入失败");
      }
    } catch (error) {
      console.error("[Folder Tree] 导入块失败:", error);
      orca.notify("error", "文档导入失败");
    }
  }

  /**
   * 重置拖拽状态
   */
  private resetDragState(): void {
    this.isDraggingOver = false;
    this.draggedBlockId = null;
    this.draggedItemId = null;
    this.dropTarget = null;
  }

  /**
   * 设置拖拽目标
   */
  public setDropTarget(targetId: string | null): void {
    this.dropTarget = targetId;
  }

  /**
   * 设置内部拖拽项目
   */
  public setDraggedItem(itemId: string): void {
    this.draggedItemId = itemId;
    this.draggedBlockId = null;
  }

  /**
   * 检查是否正在拖拽
   */
  public isDragging(): boolean {
    return this.isDraggingOver || !!this.draggedItemId;
  }

  /**
   * 检查是否为外部块拖拽
   */
  public isExternalBlockDrag(): boolean {
    return this.isDraggingOver && !!this.draggedBlockId;
  }

  /**
   * 清理事件监听器
   */
  public destroy(): void {
    document.removeEventListener("dragover", this.handleGlobalDragOver.bind(this));
    document.removeEventListener("drop", this.handleGlobalDrop.bind(this));
    document.removeEventListener("dragenter", this.handleGlobalDragEnter.bind(this));
    document.removeEventListener("dragleave", this.handleGlobalDragLeave.bind(this));
  }
}

export { FolderTreeDragDrop };