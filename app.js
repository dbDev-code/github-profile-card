// ---------- 多语言文案（默认中文，选择存本地） ----------
const I18N = {
  zh: {
    appTitle: 'GitHub 账号信息查询',
    searchPlaceholder: '输入 GitHub 用户名',
    searchBtn: '查看资料',
    loading: '正在解析 GitHub 数据...',
    recent: '最近查询',
    statRepos: '公开仓库',
    statFollowers: '关注者',
    statFollowing: '正在关注',
    statGists: '代码片段 (Gists)',
    recentRepos: '最新活跃仓库',
    footer: '使用 GitHub 公开数据',
    apiToken: 'API Token',
    langBtn: 'EN',
    rateLeft: '剩余 {0}/{1}',
    joinedAt: '加入于 {0}',
    durationYears: '已加入 {0} 年',
    durationHalf: '已加入 {0} 年半',
    durationMonths: '已加入 {0} 个月',
    durationNew: '新加入',
    durationDays: '共 {0} 天',
    updatedAt: '更新于 {0}',
    noDescription: '暂无描述',
    noRepos: '暂无可展示的公开仓库',
    errNotFound: '未找到用户 "{0}"，请核对用户名。',
    errRateLimit: '已达到 GitHub 匿名 API 访问频次上限（60次/小时），请点击右上角配置 API Token。',
    errStatus: '获取数据异常（状态码：{0}）',
    promptToken: '可填入 GitHub Personal Access Token 提升至 5000次/小时 额度（仅保存在您的本地浏览器中，留空则清除）：',
    tokenSaved: 'Token 已妥善保存在本地！',
    tokenCleared: '已恢复为默认匿名访问'
  },
  en: {
    appTitle: 'GitHub Account Lookup',
    searchPlaceholder: 'Enter a GitHub username',
    searchBtn: 'View profile',
    loading: 'Fetching data from GitHub...',
    recent: 'Recent',
    statRepos: 'Public repos',
    statFollowers: 'Followers',
    statFollowing: 'Following',
    statGists: 'Gists',
    recentRepos: 'Recently updated repos',
    footer: 'Data from the public GitHub API',
    apiToken: 'API Token',
    langBtn: '中文',
    rateLeft: '{0}/{1} left',
    joinedAt: 'Joined {0}',
    durationYears: '{0} years',
    durationHalf: '{0} years 6 months',
    durationMonths: '{0} months',
    durationNew: 'New',
    durationDays: '{0} days in total',
    updatedAt: 'Updated {0}',
    noDescription: 'No description',
    noRepos: 'No public repositories to show',
    errNotFound: 'User "{0}" not found. Please check the username.',
    errRateLimit: 'GitHub anonymous API rate limit reached (60/hour). Add an API token at the top right.',
    errStatus: 'Request failed (status code: {0})',
    promptToken: 'Enter a GitHub Personal Access Token to raise the limit to 5000/hour (stored only in this browser, leave empty to clear):',
    tokenSaved: 'Token saved locally!',
    tokenCleared: 'Back to anonymous access'
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 查询结果缓存 5 分钟，命中缓存不消耗 API 额度
const HISTORY_KEY = 'gh_history';
let lang = localStorage.getItem('gh_lang') || 'zh';
let currentProfile = null; // 最近一次渲染的数据，切换语言时用它重绘
let rateInfo = null;       // 最近一次拿到的额度信息

// 取文案，{0}/{1} 为占位参数
function t(key, ...args) {
  let str = (I18N[lang] && I18N[lang][key]) || key;
  args.forEach((v, i) => { str = str.replace(`{${i}}`, v); });
  return str;
}

// 应用文案到带 data-i18n / data-i18n-placeholder 标记的元素
function applyI18n() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('appTitle');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.getElementById('langBtn').textContent = t('langBtn');
  if (rateInfo) {
    document.getElementById('rateLimitText').textContent = t('rateLeft', rateInfo.remaining, rateInfo.limit);
  }
  if (currentProfile) {
    renderProfile(currentProfile.user, currentProfile.repos);
    refreshIcons();
  }
}

// 最近查询：只存本地，不消耗 API 额度
function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
}

function addHistory(username) {
  const list = readHistory().filter(u => u.toLowerCase() !== username.toLowerCase());
  list.unshift(username);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 6))); } catch (e) {}
  renderHistory();
}

function renderHistory() {
  const list = readHistory();
  const chips = document.getElementById('historyChips');
  chips.innerHTML = '';
  list.forEach(name => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = name;
    btn.className = 'text-xs text-neutral-500 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/60 transition-colors';
    btn.addEventListener('click', () => {
      document.getElementById('usernameInput').value = name;
      fetchUserData(name);
    });
    chips.appendChild(btn);
  });
  document.getElementById('historyBar').classList.toggle('hidden', list.length === 0);
}

// 缓存：5 分钟内同一个用户名不重复请求
function readCache(username) {
  try {
    const raw = localStorage.getItem('gh_cache_' + username.toLowerCase());
    if (!raw) return null;
    const item = JSON.parse(raw);
    return Date.now() - item.ts < CACHE_TTL ? item : null;
  } catch (e) { return null; }
}

function writeCache(username, user, repos) {
  try {
    localStorage.setItem('gh_cache_' + username.toLowerCase(), JSON.stringify({ ts: Date.now(), user, repos }));
  } catch (e) {}
}

// 显示 GitHub 返回的剩余额度（X-RateLimit-* 响应头）
function updateRateLimit(headers) {
  const remaining = headers.get('X-RateLimit-Remaining');
  if (remaining === null) return;
  rateInfo = { remaining, limit: headers.get('X-RateLimit-Limit') || '60' };
  document.getElementById('rateLimitText').textContent = t('rateLeft', rateInfo.remaining, rateInfo.limit);
}

// 打开页面时先取一次额度：/rate_limit 不计入调用次数
async function loadRateLimit() {
  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const core = (data.resources && data.resources.core) || data.rate;
    if (!core) return;
    rateInfo = { remaining: core.remaining, limit: core.limit };
    document.getElementById('rateLimitText').textContent = t('rateLeft', rateInfo.remaining, rateInfo.limit);
  } catch (e) { /* 拿不到就不显示，不影响查询 */ }
}

// 初始化 Lucide 图标
function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// 加入日期：精确到时分秒
function formatJoinedDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const p = (n) => String(n).padStart(2, '0');
  return t('joinedAt', `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
}

// 加入时长：换算年限 + 总天数
function formatJoinedDuration(isoString) {
  if (!isoString) return '';
  const createdDate = new Date(isoString);
  const now = new Date();
  const totalDays = Math.floor((now.getTime() - createdDate.getTime()) / 86400000);

  // 计算完整年份与月份差异
  let diffYears = now.getFullYear() - createdDate.getFullYear();
  let diffMonths = now.getMonth() - createdDate.getMonth();
  if (now.getDate() < createdDate.getDate()) {
    diffMonths--;
  }
  if (diffMonths < 0) {
    diffYears--;
    diffMonths += 12;
  }

  let durationText = '';
  if (diffYears < 1) {
    durationText = diffMonths > 0 ? t('durationMonths', diffMonths) : t('durationNew');
  } else {
    durationText = diffMonths >= 6 ? t('durationHalf', diffYears) : t('durationYears', diffYears);
  }

  return `${durationText} · ${t('durationDays', totalDays.toLocaleString())}`;
}

// 组装请求头（优先读取 localStorage 中的 token）
function getHeaders() {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  const token = localStorage.getItem('gh_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 获取并展示用户数据
async function fetchUserData(username) {
  if (!username) return;

  const loading = document.getElementById('loading');
  const errorBox = document.getElementById('errorBox');
  const profileCard = document.getElementById('profileCard');
  const errorMessage = document.getElementById('errorMessage');

  errorBox.classList.add('hidden');
  profileCard.classList.add('hidden');

  // 命中缓存直接渲染，不消耗 API 额度
  const cached = readCache(username);
  if (cached) {
    loading.classList.add('hidden');
    renderProfile(cached.user, cached.repos);
    addHistory(cached.user.login);
    refreshIcons();
    return;
  }

  loading.classList.remove('hidden');

  try {
    const headers = getHeaders();
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    updateRateLimit(userRes.headers);

    if (userRes.status === 404) {
      throw new Error(t('errNotFound', username));
    }
    if (userRes.status === 403) {
      throw new Error(t('errRateLimit'));
    }
    if (!userRes.ok) {
      throw new Error(t('errStatus', userRes.status));
    }

    const user = await userRes.json();

    // 获取该用户前 4 个最新更新的仓库
    const repoRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=4`, { headers });
    const repos = repoRes.ok ? await repoRes.json() : [];
    updateRateLimit(repoRes.headers);

    renderProfile(user, repos);
    writeCache(username, user, repos);
    addHistory(user.login);
    window.location.hash = username;
  } catch (err) {
    errorMessage.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
    refreshIcons();
  }
}

// 渲染用户卡片
function renderProfile(user, repos) {
  currentProfile = { user, repos };
  document.getElementById('avatar').src = user.avatar_url;
  document.getElementById('fullName').textContent = user.name || user.login;
  document.getElementById('username').textContent = `@${user.login}`;
  document.getElementById('profileLink').href = user.html_url;

  // 雇佣状态
  const hireableBadge = document.getElementById('hireableBadge');
  if (user.hireable) {
    hireableBadge.classList.remove('hidden');
  } else {
    hireableBadge.classList.add('hidden');
  }

  // 加入时间（精确到秒）与加入时长分开展示
  document.getElementById('joinedDateText').textContent = formatJoinedDateTime(user.created_at);
  document.getElementById('joinedDurationText').textContent = formatJoinedDuration(user.created_at);

  // 个人介绍
  const bioEl = document.getElementById('bio');
  if (user.bio) {
    bioEl.textContent = user.bio;
    bioEl.classList.remove('hidden');
  } else {
    bioEl.classList.add('hidden');
  }

  // 统计数字
  document.getElementById('statRepos').textContent = Number(user.public_repos || 0).toLocaleString();
  document.getElementById('statFollowers').textContent = Number(user.followers || 0).toLocaleString();
  document.getElementById('statFollowing').textContent = Number(user.following || 0).toLocaleString();
  document.getElementById('statGists').textContent = Number(user.public_gists || 0).toLocaleString();

  // 附加属性设置
  renderMetaItem('metaCompany', 'metaCompanyText', user.company);
  renderMetaItem('metaLocation', 'metaLocationText', user.location);

  const blogEl = document.getElementById('metaBlog');
  if (user.blog) {
    const blogUrl = user.blog.startsWith('http') ? user.blog : `https://${user.blog}`;
    const blogLink = document.getElementById('metaBlogLink');
    blogLink.href = blogUrl;
    blogLink.textContent = user.blog.replace(/^https?:\/\//, '');
    blogEl.classList.remove('hidden');
  } else {
    blogEl.classList.add('hidden');
  }

  const twitterEl = document.getElementById('metaTwitter');
  if (user.twitter_username) {
    const twitterLink = document.getElementById('metaTwitterLink');
    twitterLink.href = `https://twitter.com/${user.twitter_username}`;
    twitterLink.textContent = `@${user.twitter_username}`;
    twitterEl.classList.remove('hidden');
  } else {
    twitterEl.classList.add('hidden');
  }

  // 仓库列表渲染
  const repoContainer = document.getElementById('repoList');
  repoContainer.innerHTML = '';

  if (repos && repos.length > 0) {
    repos.forEach(repo => {
      const card = document.createElement('a');
      card.href = repo.html_url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-200 transition-all flex flex-col justify-between group';

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-neutral-900 group-hover:underline truncate">${repo.name}</span>
            <span class="text-[10px] text-neutral-400 font-mono flex items-center gap-0.5">
              <i data-lucide="star" class="w-3 h-3 text-amber-500 fill-amber-500"></i> ${repo.stargazers_count}
            </span>
          </div>
          <p class="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed mb-2">${repo.description || t('noDescription')}</p>
        </div>
        <div class="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
          <span>${repo.language || 'Plain'}</span>
          <span>${t('updatedAt', new Date(repo.updated_at).toLocaleDateString())}</span>
        </div>
      `;
      repoContainer.appendChild(card);
    });
  } else {
    repoContainer.innerHTML = `<p class="text-xs text-neutral-400 col-span-2 py-3 text-center">${t('noRepos')}</p>`;
  }

  document.getElementById('profileCard').classList.remove('hidden');
}

function renderMetaItem(containerId, textId, value) {
  const container = document.getElementById(containerId);
  if (value) {
    document.getElementById(textId).textContent = value;
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

// 表单提交事件
document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = document.getElementById('usernameInput').value.trim();
  if (val) fetchUserData(val);
});

// Token 设置提示框
document.getElementById('tokenBtn').addEventListener('click', () => {
  const currentToken = localStorage.getItem('gh_token') || '';
  const input = prompt(t('promptToken'), currentToken);
  if (input !== null) {
    if (input.trim() === '') {
      localStorage.removeItem('gh_token');
      alert(t('tokenCleared'));
    } else {
      localStorage.setItem('gh_token', input.trim());
      alert(t('tokenSaved'));
    }
  }
});

// 语言切换
document.getElementById('langBtn').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('gh_lang', lang);
  applyI18n();
});

// 初始化入口：应用文案与历史，读取 URL Hash 则自动查询，无 Hash 时只展示输入框
window.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  renderHistory();
  refreshIcons();
  loadRateLimit();
  const hashUser = window.location.hash.replace('#', '').trim();
  if (hashUser) {
    document.getElementById('usernameInput').value = hashUser;
    fetchUserData(hashUser);
  }
});
