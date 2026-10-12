# GitHub Profile Card 📇

[中文](#中文) | [English](#english)

---

## 中文

一个轻量、现代、质感温润的 GitHub 用户资料名片查询网页。摒弃刺眼的赛博朋克光效，采用纸质柔和色调与排版，输入任意 GitHub 用户名即可生成一张简洁的信息名片。

🔗 **在线预览**：[https://dbDev-code.github.io/github-profile-card/](https://dbDev-code.github.io/github-profile-card/)

### ✨ 特性

- 🌿 **纸质极简排版**：暖纸白背景配合深色文字，告别霓虹赛博风，阅读舒适不刺眼。
- 🌐 **中英文切换**：界面文案支持中文 / English 一键切换，选择记录在本地。
- ⏱️ **加入时间与时长**：注册时间精确到秒，并单独展示加入年限与总天数。
- 📊 **核心指标概览**：公开仓库数、Followers、Following 以及 Gists 统计清晰呈现。
- 📦 **活跃仓库展示**：自动获取该开发者最近活跃的公开仓库，包含语言标示、Star 数量与更新时间。
- 🕘 **最近查询**：查询过的用户名存在本地浏览器，点一下即可再次查看，不消耗接口额度。
- ⚡ **结果缓存**：同一个用户名 5 分钟内重复查询直接读缓存，不消耗接口额度。
- 📉 **剩余额度显示**：右上角实时显示 GitHub API 剩余调用次数，不用等报错才知道额度用尽。
- 🔗 **URL Hash 分享**：通过 URL 后缀直达指定用户的名片，方便随时分享。
- 🛡️ **API 限额保障**：支持在本地轻量配置 GitHub Token，突破未登录访问的 60 次/小时频次限制。
- 🚀 **零构建（Zero-Build）**：原生 HTML/CSS/JS + Tailwind CSS CDN，代码按 `index.html` / `styles.css` / `app.js` 拆分，无需打包，即开即用。

### 🛠️ 技术栈

- **Tailwind CSS** (CDN)
- **Lucide Icons**
- **Vanilla JavaScript** (ES6+)
- **GitHub REST API v3**

### 📁 文件结构

```text
index.html   页面结构与文案标记
styles.css   全局基础样式
app.js       多语言文案、查询逻辑、缓存与历史记录
```

### 🚀 本地运行

无需安装 Node.js 或任何构建工具：

```bash
git clone https://github.com/dbDev-code/github-profile-card.git
cd github-profile-card
```

然后直接用浏览器打开 `index.html`，或起一个静态服务器：

```bash
python -m http.server 8000
```

### 📦 部署

把仓库推送到 GitHub，在 **Settings → Pages** 中选择从 `main` 分支根目录发布即可。

### 📄 数据来源

全部数据来自 GitHub REST API v3 的公开接口，本地不保存任何服务端数据。

---

## English

A lightweight, modern GitHub profile card page with a warm paper-like look. Type any GitHub username and get a clean, single-page profile card.

🔗 **Live demo**: [https://dbDev-code.github.io/github-profile-card/](https://dbDev-code.github.io/github-profile-card/)

### ✨ Features

- 🌿 **Minimal paper-style layout**: warm off-white background with dark text, easy on the eyes.
- 🌐 **Chinese / English UI**: switch the interface language with one click; the choice is stored locally.
- ⏱️ **Join time and tenure**: registration time down to the second, plus years and total days shown separately.
- 📊 **Key stats**: public repos, followers, following and gists at a glance.
- 📦 **Recent repositories**: the user's most recently updated public repos, with language, stars and update time.
- 🕘 **Recent lookups**: usernames you looked up are kept in your browser and can be reopened with one click, without spending API quota.
- ⚡ **Result cache**: repeated lookups of the same username within 5 minutes are served from cache, without spending API quota.
- 📉 **Rate limit display**: the remaining GitHub API calls are shown in the header.
- 🔗 **URL hash sharing**: share a profile with a URL suffix.
- 🛡️ **API token support**: store a GitHub token locally to raise the limit from 60/hour to 5000/hour.
- 🚀 **Zero-build**: plain HTML/CSS/JS plus Tailwind CSS via CDN, split into `index.html` / `styles.css` / `app.js`, no bundler needed.

### 🛠️ Tech stack

- **Tailwind CSS** (CDN)
- **Lucide Icons**
- **Vanilla JavaScript** (ES6+)
- **GitHub REST API v3**

### 📁 File layout

```text
index.html   page structure and i18n markers
styles.css   global base styles
app.js       i18n strings, lookup logic, cache and history
```

### 🚀 Run locally

No Node.js or build tooling required:

```bash
git clone https://github.com/dbDev-code/github-profile-card.git
cd github-profile-card
```

Then open `index.html` in a browser, or serve the folder statically:

```bash
python -m http.server 8000
```

### 📦 Deploy

Push the repository to GitHub and publish from the root of the `main` branch under **Settings → Pages**.

### 📄 Data source

All data comes from the public GitHub REST API v3. Nothing is stored on a server.
