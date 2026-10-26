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

## Vercel

仓库根目录包含 `vercel.json`。安装命令为 `npm ci`，构建命令为 `npm run build`，静态输出目录为 `dist`。

## 工作室互联

`public/studio-site/` 已包含恢复后的原版工作室和独立链接桥接，个人站工作室介绍位于 `/#/studio`。同一部署中可以从介绍页进入 `/studio-site/#/`，再返回个人介绍页。

更新内嵌工作室时，将工作室项目构建出的 `dist/` 内容替换到 `public/studio-site/`，再重新构建个人站。独立部署的工作室可在其 `site/index.html` 的 `personal-site-url` meta 中填写个人站正式地址。

## 源码

React、Three、Motion、Lucide 和 Base UI 的依赖由锁文件固定，`npm run check:deps` 检查核心依赖只保留一份。原有字体及第三方组件说明保留在 `public/`，素材和现有版权说明保持原样。

此发布目录不包含本地研究记录、截图、压缩包、环境凭据或部署账户配置。
