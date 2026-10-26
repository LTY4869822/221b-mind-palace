# 221B Mind Palace

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
