# 221B Mind Palace

## Skill 全息收藏馆

项目档案的 Skill 页现为本机技能收藏快照：去重发现 678 份技能，分为 9 个用途分类。每份技能对应独立的原创卡通场景，43 张图版以 WebP 交付；卡片使用现有 Motion 和 CSS 3D 表现浮空投影、跟手倾斜与虹彩反光，没有增加运行依赖。

单击卡片打开统一玩法档案，包含用途、原文玩法节选、建议尝试、输入输出参考和来源。双击已核实来源的卡片直接打开对应 GitHub 仓库；没有仓库时保留玩法详情。触屏和键盘可通过独立仓库链接访问。支持分类、搜索、分类内 Stars 排序及分页，每次只呈现 12 张卡片。

Stars 为 2026-10-26 的来源仓库快照：211 份技能关联 27 个可核实的公开仓库，同一仓库的技能共享星数；未知数量不作为零。收藏包含已安装技能和本机项目中的技能定义，排除了历史副本、重复安装和研究备份。说明保留真实来源语言；缺少独立工作流时明确使用通用上手模板，分类级输入输出只作为参考。

公开数据位于 `public/data/skills-catalog.json`，原创封面位于 `public/media/skill-covers/`。网页读取静态快照，不访问访客电脑。原始安装路径、完整 SKILL.md、扫描证据和生成原图保留在本地私档，未发布。新增技能需本地重新整理、核实来源并补齐独立封面后重新构建。

入口：`?archive=skills#/cases`。保留个人站、PromptHub 与工作室之间的链接。

举觞白眼望青天的个人创意事务所。包含独立开场、字符与人物动画、地球场景、AIGC 暗房、项目档案、灵感书架、个人介绍和工作室入口。

## 运行与构建

```bash
npm ci
npm run dev
npm run build
npm run preview
```

构建产物位于 `dist/`。网站使用 hash 路由，可直接访问 `/#/`、`/#/opening`、`/#/aigc`、`/#/cases`、`/#/studio`，不需要服务器重写页面路径。

## GitHub Pages 发布

正式地址：[221B Mind Palace](https://lty4869822.github.io/221b-mind-palace/)。

源码分支为 `codex/site-launch`，构建产物分支为 `codex/pages`。在源码分支运行 `npm ci`、`npm run build` 后，将 `dist/` 内容发布到 `codex/pages` 根目录，GitHub Pages 从该分支根目录提供静态网站。

仓库中的 `vercel.json` 保留为备用配置，构建命令为 `npm run build`，输出目录为 `dist`；当前尚未部署到 Vercel。

## 工作室互联

两站互链已配置。个人站的[工作室介绍页](https://lty4869822.github.io/221b-mind-palace/#/studio)会前往[独立工作室官网](https://lty4869822.github.io/code-adventure-studio/)，工作室可以返回个人站介绍页。

`public/studio-site/` 同时保留恢复后的原版工作室，供本地预览和内嵌访问。更新它时，将工作室项目构建出的 `dist/` 内容替换到该目录，再重新构建个人站。

如需覆盖个人站指向的工作室地址，可在构建前设置 `VITE_STUDIO_URL`；未设置时，正式环境使用上方 GitHub Pages 地址，本地预览使用内嵌工作室。工作室返回个人站的地址由其 `site/index.html` 中的 `personal-site-url` meta 配置。

## 源码

React、Three、Motion、Lucide 和 Base UI 的依赖由锁文件固定，`npm run check:deps` 检查核心依赖只保留一份。原有字体及第三方组件说明保留在 `public/`，素材和现有版权说明保持原样。

此发布目录不包含本地研究记录、截图、压缩包、环境凭据或部署账户配置。
