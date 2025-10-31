# 部署指南

## 上传到 GitHub

### 1. 初始化 Git 仓库（如果还没有）

```bash
git init
git remote add origin https://github.com/SaXz2/orca-folder-plugin.git
```

### 2. 添加文件并提交

```bash
# 添加所有文件（会自动排除 .gitignore 中的文件）
git add .

# 提交更改
git commit -m "feat: 实现文档树插件核心功能

- 根块显示子块数量
- 聚焦文档功能
- 一键折叠/展开全部
- 局部自然排序
- 笔记本关闭功能"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 发布新版本

### 方法 1: 使用 Git Tag（推荐）

```bash
# 创建并推送标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

GitHub Actions 会自动触发构建和发布流程。

### 方法 2: 手动触发 GitHub Actions

1. 访问 GitHub 仓库的 Actions 页面
2. 选择 "Build and Release" 工作流
3. 点击 "Run workflow"
4. 输入版本号（如 `v1.0.0`）
5. 点击 "Run workflow" 按钮

## 发布包结构

根据 Quick-Start.md 的要求，发布的包结构如下：

```
orca-folder-plugin/
├── dist/
│   ├── index.js      # 编译后的插件代码（必需）
│   └── style.css     # 样式文件（必需）
└── icon.svg          # 插件图标（必需，也可以是 icon.png）
```

这个结构符合 Orca Note 插件的最小要求：
- `dist/index.js` - 编译后的插件主文件
- `icon.svg` 或 `icon.png` - 插件图标

## 排除的文件

以下文件/目录不会包含在发布包中：

- `.claude/` - Claude 配置
- `plugin-docs/` - 文档目录
- `node_modules/` - 依赖包
- `CLAUDE.md` - Claude 说明文件
- `idea.md` - 想法文档

这些文件已添加到 `.gitignore`，不会提交到仓库。

## 构建验证

在本地验证构建：

```bash
# 构建插件
npm run build

# 检查构建产物
ls -la dist/
# 应该看到：
# - index.js
# - style.css
```

## 安装发布的插件

1. 从 GitHub Releases 下载 `orca-folder-plugin.tar.gz` 或 `orca-folder-plugin.zip`
2. 解压文件
3. 将 `orca-folder-plugin` 文件夹复制到 Orca Note 的 `plugins` 目录
4. 重启 Orca Note

