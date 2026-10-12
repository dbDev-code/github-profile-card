# GitHub Profile Card 📇

一个轻量、现代、质感温润的 GitHub 用户资料名片探索网页。摒弃刺眼的赛博朋克光效，采用纸质柔和色调与排版，支持快速检索任意 GitHub 用户并生成简洁的信息名片。

🔗 **在线预览**：[https://dbDev-code.github.io/github-profile-card/](https://dbDev-code.github.io/github-profile-card/)

---

## ✨ 特性

- 🌿 **纸质极简排版**：暖纸白背景配合深色文字，告别霓虹赛博风，阅读舒适不刺眼。
- ⏱️ **智能加入年限**：自动格式化注册时间（如 `加入于 2017-01-15 (已加入 9 年)`），支持点击在精确日期与年数之间切换。
- 📊 **核心指标概览**：公开仓库数、Followers、Following 以及 Gists 统计清晰呈现。
- 📦 **活跃仓库展示**：自动获取该开发者最近活跃的公开仓库，包含语言标示、Star 数量与更新时间。
- 🔗 **URL Hash 分享**：通过 URL 后缀（如 `#antfu`）直接直达指定用户的名片，方便随时分享。
- 🛡️ **API 限额保障**：支持在本地轻量配置 GitHub Token，突破未登录访问的 60 次/小时频次限制。
- 🚀 **纯单文件（Zero-Build）**：基于原生 HTML/JS + Tailwind CSS CDN，无需打包构建，即开即用。

---

## 🛠️ 技术栈

- **Tailwind CSS** (CDN)
- **Lucide Icons**
- **Vanilla JavaScript** (ES6+)
- **GitHub REST API v3**

---

## 🚀 本地运行

无需安装 Node.js 或任何构建工具：

1. 克隆或直接下载本仓库：
   ```bash
   git clone [https://github.com/dbDev-code/github-profile-card.git](https://github.com/dbDev-code/github-profile-card.git)
