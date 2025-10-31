# Git 仓库设置指南

## 快速开始

### 1. 初始化 Git 仓库并连接远程仓库

```bash
# 如果还没有初始化 Git
git init

# 添加远程仓库
git remote add origin https://github.com/SaXz2/orca-folder-plugin.git

# 或者如果已经存在，更新远程地址
git remote set-url origin https://github.com/SaXz2/orca-folder-plugin.git
```

### 2. 添加所有文件并提交

```bash
# 查看将要添加的文件
git status

# 添加所有文件（会自动排除 .gitignore 中的文件）
git add .

# 提交更改
git commit -m "feat: 完整的文档树插件功能实现

功能包括：
- 根块显示子块数量
- 聚焦文档功能（聚焦/退出/折叠其他）
- 一键折叠/展开全部
- 局部自然排序
- 笔记本关闭/恢复功能
- 完整的拖拽排序支持"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 已配置的 GitHub Actions

GitHub Actions 已配置完成，会在以下情况自动触发：

1. **推送 Tag**：当推送以 `v` 开头的标签时（如 `v1.0.0`）
2. **手动触发**：在 GitHub Actions 页面手动运行

## 发布新版本

### 方法 1: 使用 Git Tag（推荐）

```bash
# 创建带注释的标签
git tag -a v1.0.0 -m "Release v1.0.0: 完整功能版本"

# 推送到远程
git push origin v1.0.0
```

GitHub Actions 会自动：
- 构建插件
- 创建发布包（.tar.gz 和 .zip）
- 在 GitHub Releases 中创建新版本

### 方法 2: 手动触发

1. 访问 https://github.com/SaXz2/orca-folder-plugin/actions
2. 选择 "Build and Release" 工作流
3. 点击 "Run workflow"
4. 输入版本号（如 `v1.0.0`）
5. 点击绿色的 "Run workflow" 按钮

## 发布包结构

发布包将包含以下文件（符合 Quick-Start.md 要求）：

```
orca-folder-plugin/
├── dist/
│   ├── index.js      # 编译后的插件代码
│   └── style.css     # 样式文件
└── icon.svg          # 插件图标
```

## 已排除的文件

以下文件已添加到 `.gitignore`，不会提交到仓库：

- `.claude/` - Claude 配置目录
- `plugin-docs/` - 插件文档目录
- `node_modules/` - Node.js 依赖
- `CLAUDE.md` - Claude 说明文件
- `idea.md` - 想法文档
- `dist/` - 构建输出（会在 GitHub Actions 中构建）

## 验证配置

运行以下命令验证构建：

```bash
# 构建插件
npm run build

# 检查构建产物
ls -la dist/
# 应该看到：
# - index.js
# - style.css
```

## 注意事项

1. **首次推送**：如果仓库是空的，确保先推送代码再创建标签
2. **权限**：确保 GitHub Actions 有创建 Release 的权限（通常默认开启）
3. **版本号**：建议遵循语义化版本（Semantic Versioning）

