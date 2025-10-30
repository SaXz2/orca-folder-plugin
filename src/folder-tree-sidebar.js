/**
 * 文档树插件 - 侧边栏集成模块
 * 负责在侧边栏注册和渲染文档树
 */

import { FolderTreeCore } from "./folder-tree-core";
import { FolderTree } from "./folder-tree-ui";

const { useState, useEffect, useCallback } = window.React;

/**
 * 文档树侧边栏组件
 */
const FolderTreeSidebar = ({ core }) => {
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [notebookName, setNotebookName] = useState("");

  // 创建笔记本
  const handleCreateNotebook = useCallback(async () => {
    if (!notebookName.trim()) return;

    const success = await core.createNotebook(notebookName.trim());
    if (success) {
      setNotebookName("");
      setIsCreatingNotebook(false);
      orca.notify("success", "笔记本创建成功");
    } else {
      orca.notify("error", "笔记本创建失败");
    }
  }, [notebookName, core]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      handleCreateNotebook();
    } else if (e.key === "Escape") {
      setNotebookName("");
      setIsCreatingNotebook(false);
    }
  }, [handleCreateNotebook]);

  return window.React.createElement("div", { className: "folder-tree-sidebar" },
    window.React.createElement("div", { className: "folder-tree-header" },
      window.React.createElement("div", { className: "folder-tree-title" }, "文档树"),
      window.React.createElement("div", { className: "folder-tree-actions" },
        !isCreatingNotebook ?
          window.React.createElement("button", {
            className: "folder-tree-btn",
            onClick: () => setIsCreatingNotebook(true),
            title: "创建笔记本"
          },
            window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              window.React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
              window.React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
            )
          ) :
          window.React.createElement("div", { className: "folder-tree-create-input" },
            window.React.createElement("input", {
              type: "text",
              value: notebookName,
              onChange: (e) => setNotebookName(e.target.value),
              onKeyDown: handleKeyDown,
              onBlur: handleCreateNotebook,
              placeholder: "笔记本名称",
              autoFocus: true
            })
          ),

        
              )
    ),

    window.React.createElement(FolderTree, { core })
  );
};

export { FolderTreeSidebar };