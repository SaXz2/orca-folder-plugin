/**
 * 文档树插件 - UI组件模块
 * 负责渲染树形界面和用户交互
 */

import { FolderTreeCore } from "./folder-tree-core";

const { useState, useEffect, useCallback, useMemo } = window.React;

/**
 * 文档图标组件
 */
const DocumentIcon = ({ type, isExpanded }) => {
  if (type === "folder") {
    return window.React.createElement("svg", {
      className: "folder-tree-item-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2"
    },
      window.React.createElement("path", {
        d: isExpanded
          ? "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          : "M3 3h18v18H3zM8 12h8M12 8v8"
      })
    );
  }

  return window.React.createElement("svg", {
    className: "folder-tree-item-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    window.React.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    window.React.createElement("polyline", { points: "14,2 14,8 20,8" })
  );
};

/**
 * 展开/收起图标组件
 */
const ExpandIcon = ({ isExpanded }) => {
  return window.React.createElement("svg", {
    className: `folder-tree-expand-icon ${isExpanded ? "expanded" : ""}`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    window.React.createElement("polyline", { points: "9,18 15,12 9,6" })
  );
};

/**
 * 笔记本项目组件
 */
const NotebookItem = ({
  notebook,
  isExpanded,
  onToggle,
  onSelect,
  selectedItems,
  onRename,
  onDelete,
  onDrop,
  onDragStart,
  onDragEnd,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(notebook.name);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    onToggle(notebook.id);
  }, [onToggle, notebook.id]);

  const handleSelect = useCallback(() => {
    onSelect(notebook.id);
  }, [onSelect, notebook.id]);

  const handleRename = useCallback(() => {
    setIsEditing(true);
    setEditName(notebook.name);
  }, [notebook.name]);

  const handleRenameConfirm = useCallback(() => {
    if (editName.trim() && editName !== notebook.name) {
      onRename(notebook.id, editName.trim());
    }
    setIsEditing(false);
  }, [editName, notebook.name, onRename, notebook.id]);

  const handleRenameCancel = useCallback(() => {
    setIsEditing(false);
    setEditName(notebook.name);
  }, [notebook.name]);

  const handleDelete = useCallback(() => {
    if (confirm(`确定要删除笔记本"${notebook.name}"吗？此操作将删除该笔记本下的所有文档。`)) {
      onDelete(notebook.id);
    }
  }, [notebook.name, onDelete, notebook.id]);

  const handleDragStart = useCallback((e) => {
    onDragStart(e, notebook.id);
  }, [onDragStart, notebook.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragOver(false);
    onDragEnd();
  }, [onDragEnd]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, notebook.id, "notebook");
  }, [onDrop, notebook.id]);

  const isSelected = selectedItems.includes(notebook.id);

  return window.React.createElement("div", { className: "folder-tree-notebook" },
    window.React.createElement("div", {
      className: `folder-tree-notebook-header ${isSelected ? "active" : ""} ${isDragOver ? "drag-over" : ""}`,
      onClick: handleSelect,
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },
      window.React.createElement(ExpandIcon, { isExpanded: isExpanded, onClick: handleToggle }),

      window.React.createElement("svg", {
        className: "folder-tree-notebook-icon",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2"
      },
        window.React.createElement("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
        window.React.createElement("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })
      ),

      isEditing ?
        window.React.createElement("input", {
          type: "text",
          value: editName,
          onChange: (e) => setEditName(e.target.value),
          onBlur: handleRenameConfirm,
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              handleRenameConfirm();
            } else if (e.key === "Escape") {
              handleRenameCancel();
            }
          },
          className: "folder-tree-edit-input",
          autoFocus: true
        }) :
        window.React.createElement("span", { className: "folder-tree-notebook-name" }, notebook.name),

      window.React.createElement("div", { className: "folder-tree-notebook-actions" },
        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleRename,
          title: "重命名"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
            window.React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
          )
        ),
        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleDelete,
          title: "删除"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("polyline", { points: "3,6 5,6 21,6" }),
            window.React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
          )
        )
      )
    )
  );
};

/**
 * 文档项目组件
 */
const DocumentItem = ({
  document,
  level,
  isExpanded,
  onToggle,
  onSelect,
  selectedItems,
  onRename,
  onDelete,
  onDrop,
  onDragStart,
  onDragEnd,
  children,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(document.name);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    if (document.type === "folder") {
      onToggle(document.id);
    }
  }, [onToggle, document.id, document.type]);

  const handleSelect = useCallback(() => {
    onSelect(document.id);
  }, [onSelect, document.id]);

  const handleRename = useCallback(() => {
    setIsEditing(true);
    setEditName(document.name);
  }, [document.name]);

  const handleRenameConfirm = useCallback(() => {
    if (editName.trim() && editName !== document.name) {
      onRename(document.id, editName.trim());
    }
    setIsEditing(false);
  }, [editName, document.name, onRename, document.id]);

  const handleRenameCancel = useCallback(() => {
    setIsEditing(false);
    setEditName(document.name);
  }, [document.name]);

  const handleDelete = useCallback(() => {
    if (confirm(`确定要删除${document.type === "folder" ? "文件夹" : "文档"}"${document.name}"吗？`)) {
      onDelete(document.id);
    }
  }, [document.name, document.type, onDelete, document.id]);

  const handleDragStart = useCallback((e) => {
    onDragStart(e, document.id);
  }, [onDragStart, document.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragOver(false);
    onDragEnd();
  }, [onDragEnd]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, document.id, document.type);
  }, [onDrop, document.id, document.type]);

  const isSelected = selectedItems.includes(document.id);

  const handleClick = useCallback(() => {
    if (document.blockId) {
      // 跳转到对应的块
      orca.nav.goTo("block", { blockId: document.blockId });
    }
    handleSelect();
  }, [document.blockId, handleSelect]);

  return window.React.createElement("div", null,
    window.React.createElement("div", {
      className: `folder-tree-item ${isSelected ? "selected" : ""} ${isDragOver ? "drag-over" : ""}`,
      style: { paddingLeft: `${level * 16 + 12}px` },
      onClick: handleClick,
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },
      document.type === "folder" &&
        window.React.createElement(ExpandIcon, { isExpanded: isExpanded, onClick: handleToggle }),

      document.type === "document" &&
        window.React.createElement("div", { style: { width: "12px" } }),

      window.React.createElement(DocumentIcon, { type: document.type, isExpanded: isExpanded }),

      isEditing ?
        window.React.createElement("input", {
          type: "text",
          value: editName,
          onChange: (e) => setEditName(e.target.value),
          onBlur: handleRenameConfirm,
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              handleRenameConfirm();
            } else if (e.key === "Escape") {
              handleRenameCancel();
            }
          },
          className: "folder-tree-edit-input",
          autoFocus: true
        }) :
        window.React.createElement("span", { className: "folder-tree-item-name" }, document.name),

      window.React.createElement("div", { className: "folder-tree-item-actions" },
        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleRename,
          title: "重命名"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
            window.React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
          )
        ),
        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleDelete,
          title: "删除"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("polyline", { points: "3,6 5,6 21,6" }),
            window.React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
          )
        )
      )
    ),

    document.type === "folder" && isExpanded && children &&
      window.React.createElement("div", { className: "folder-tree-items" }, children)
  );
};

/**
 * 主文档树组件
 */
const FolderTree = ({ core }) => {
  const [data, setData] = useState(core.getData());
  const [expandedNotebooks, setExpandedNotebooks] = useState(core.getExpandedNotebooks());
  const [expandedFolders, setExpandedFolders] = useState(core.getExpandedFolders());
  const [selectedItems, setSelectedItems] = useState(core.getSelectedItems());

  // 监听数据变化
  useEffect(() => {
    const handleDataChange = (newData) => {
      setData(newData);
      setExpandedNotebooks(core.getExpandedNotebooks());
      setExpandedFolders(core.getExpandedFolders());
      setSelectedItems(core.getSelectedItems());
    };

    core.addChangeListener(handleDataChange);
    return () => {
      core.removeChangeListener(handleDataChange);
    };
  }, [core]);

  // 处理笔记本展开/收起
  const handleNotebookToggle = useCallback(async (notebookId) => {
    const newExpanded = expandedNotebooks.includes(notebookId)
      ? expandedNotebooks.filter(id => id !== notebookId)
      : [...expandedNotebooks, notebookId];

    setExpandedNotebooks(newExpanded);
    await core.setExpandedState("notebooks", newExpanded);
  }, [expandedNotebooks, core]);

  // 处理文件夹展开/收起
  const handleFolderToggle = useCallback(async (folderId) => {
    const newExpanded = expandedFolders.includes(folderId)
      ? expandedFolders.filter(id => id !== folderId)
      : [...expandedFolders, folderId];

    setExpandedFolders(newExpanded);
    await core.setExpandedState("folders", newExpanded);
  }, [expandedFolders, core]);

  // 处理项目选择
  const handleSelect = useCallback(async (itemId) => {
    const newSelected = [itemId];
    setSelectedItems(newSelected);
    await core.setSelectedItems(newSelected);
  }, [core]);

  // 处理笔记本重命名
  const handleNotebookRename = useCallback(async (notebookId, newName) => {
    await core.renameNotebook(notebookId, newName);
  }, [core]);

  // 处理文档重命名
  const handleDocumentRename = useCallback(async (documentId, newName) => {
    await core.renameDocument(documentId, newName);
  }, [core]);

  // 处理笔记本删除
  const handleNotebookDelete = useCallback(async (notebookId) => {
    await core.deleteNotebook(notebookId);
  }, [core]);

  // 处理文档删除
  const handleDocumentDelete = useCallback(async (documentId) => {
    await core.deleteDocument(documentId);
  }, [core]);

  // 处理拖拽开始
  const handleDragStart = useCallback((e, itemId) => {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    // 清理拖拽状态
  }, []);

  // 处理拖拽放置
  const handleDrop = useCallback(async (e, targetId, targetType) => {
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;

    await core.moveDocument(draggedId, targetId);
  }, [core]);

  // 递归渲染文档树
  const renderDocumentTree = useCallback((parentId, level = 0) => {
    const children = core.getDocumentChildren(parentId);

    return children.map((document) =>
      window.React.createElement(DocumentItem, {
        key: document.id,
        document: document,
        level: level,
        isExpanded: expandedFolders.includes(document.id),
        onToggle: handleFolderToggle,
        onSelect: handleSelect,
        selectedItems: selectedItems,
        onRename: handleDocumentRename,
        onDelete: handleDocumentDelete,
        onDrop: handleDrop,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        children: document.type === "folder" ? renderDocumentTree(document.id, level + 1) : null
      })
    );
  }, [core, expandedFolders, selectedItems, handleFolderToggle, handleSelect, handleDocumentRename, handleDocumentDelete, handleDrop, handleDragStart, handleDragEnd]);

  // 渲染笔记本列表
  const notebookList = useMemo(() => {
    return data.notebooks
      .sort((a, b) => a.order - b.order)
      .map((notebook) =>
        window.React.createElement("div", { key: notebook.id },
          window.React.createElement(NotebookItem, {
            notebook: notebook,
            isExpanded: expandedNotebooks.includes(notebook.id),
            onToggle: handleNotebookToggle,
            onSelect: handleSelect,
            selectedItems: selectedItems,
            onRename: handleNotebookRename,
            onDelete: handleNotebookDelete,
            onDrop: handleDrop,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd
          }),
          expandedNotebooks.includes(notebook.id) &&
            window.React.createElement("div", { className: "folder-tree-items" },
              renderDocumentTree(notebook.id)
            )
        )
      );
  }, [
    data.notebooks,
    expandedNotebooks,
    selectedItems,
    handleNotebookToggle,
    handleSelect,
    handleNotebookRename,
    handleNotebookDelete,
    handleDrop,
    handleDragStart,
    handleDragEnd,
    renderDocumentTree,
  ]);

  return window.React.createElement("div", { className: "folder-tree-container" },
    window.React.createElement("div", { className: "folder-tree-content" },
      data.notebooks.length === 0 ?
        window.React.createElement("div", { className: "folder-tree-empty" },
          window.React.createElement("svg", {
            className: "folder-tree-empty-icon",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2"
          },
            window.React.createElement("path", { d: "M3 3h18v18H3zM12 8v8M8 12h8" })
          ),
          window.React.createElement("div", null, "暂无笔记本"),
          window.React.createElement("div", {
            style: { fontSize: "11px", marginTop: "4px", opacity: 0.7 }
          }, "拖拽块到此处或点击上方 + 按钮创建")
        ) :
        notebookList
    )
  );
};

export { FolderTree };