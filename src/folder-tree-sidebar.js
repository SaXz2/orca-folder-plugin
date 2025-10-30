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

  // 备份数据
  const handleBackup = useCallback(async () => {
    const success = await core.backupData();
    if (success) {
      orca.notify("success", "数据备份成功");
    }
  }, [core]);

  // 恢复数据
  const handleRestore = useCallback(async () => {
    const success = await core.restoreData();
    if (success) {
      orca.notify("success", "数据恢复成功");
    }
  }, [core]);

  // 清除数据
  const handleClearData = useCallback(async () => {
    if (confirm("确定要清除所有文档树数据吗？此操作不可恢复！")) {
      const success = await core.clearAllData();
      if (success) {
        orca.notify("success", "数据已清除");
      }
    }
  }, [core]);

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

        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleBackup,
          title: "备份数据"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
            window.React.createElement("polyline", { points: "17,21 17,13 7,13 7,21" }),
            window.React.createElement("polyline", { points: "7,3 7,8 15,8" })
          )
        ),

        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleRestore,
          title: "恢复数据"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("polyline", { points: "1,4 1,10 7,10" }),
            window.React.createElement("path", { d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10" })
          )
        ),

        window.React.createElement("button", {
          className: "folder-tree-btn",
          onClick: handleClearData,
          title: "清除数据"
        },
          window.React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            window.React.createElement("polyline", { points: "3,6 5,6 21,6" }),
            window.React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
          )
        )
      )
    ),

    window.React.createElement(FolderTree, { core })
  );
};

export { FolderTreeSidebar };