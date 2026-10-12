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
    overviewTitle: '账号总览',
    ovLanguages: '语言分布',
    ovStars: 'Star 排行',
    ovCreated: '每年新建仓库',
    ovOther: '其他',
    ovNoLang: '无主语言',
    ovNote: '基于最近 {0} 个仓库',
    ovTotalStars: '合计 {0} stars',
    ovTotalForks: '{0} forks',
    ovSplit: '原创 {0} · Fork {1}',
    ovLicense: '主要协议 {0}',
    recentRepos: '最新活跃仓库',
    footer: '使用 GitHub 公开数据',
    apiToken: 'API Token',
    badgeHireable: '正在找工作',
    badgeOrg: '组织',
    badgeStaff: 'GitHub 员工',
    userId: '用户 ID {0}',
    profileUpdatedAt: '资料更新于 {0}',
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
    overviewTitle: 'Account overview',
    ovLanguages: 'Languages',
    ovStars: 'Top by stars',
    ovCreated: 'Repos created per year',
    ovOther: 'Other',
    ovNoLang: 'No language',
    ovNote: 'Based on the latest {0} repos',
    ovTotalStars: '{0} stars in total',
    ovTotalForks: '{0} forks',
    ovSplit: '{0} original · {1} forked',
    ovLicense: 'Main license {0}',
    recentRepos: 'Recently updated repos',
    footer: 'Data from the public GitHub API',
    apiToken: 'API Token',
    badgeHireable: 'Open to work',
    badgeOrg: 'Organization',
    badgeStaff: 'GitHub Staff',
    userId: 'User ID {0}',
    profileUpdatedAt: 'Profile updated {0}',
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

// 日期时间：YYYY-MM-DD HH:mm:ss（本地时区）
function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 加入日期：精确到时分秒
function formatJoinedDateTime(isoString) {
  if (!isoString) return '';
  return t('joinedAt', formatDateTime(isoString));
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

// 只保留渲染与图表用得到的字段，缓存体积可控（原始对象里大量 *_url 是没用上的）
function slimRepo(repo) {
  return {
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    html_url: repo.html_url,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    fork: repo.fork,
    license: repo.license,
  };
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
    // 该用户最新更新的仓库（一次最多 100 个，账号总览复用这份数据）
    const repoRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, { headers });
    const repos = repoRes.ok ? (await repoRes.json()).map(slimRepo) : [];
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

  // 身份徽章：接活 / 组织 / GitHub 员工
  const hireableBadge = document.getElementById('hireableBadge');
  hireableBadge.classList.toggle('hidden', !user.hireable);
  const typeBadge = document.getElementById('typeBadge');
  typeBadge.classList.toggle('hidden', user.type !== 'Organization');
  const staffBadge = document.getElementById('staffBadge');
  staffBadge.classList.toggle('hidden', !user.site_admin);

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
  renderMetaItem('metaUserId', 'metaUserIdText', user.id ? t('userId', user.id) : '');
  renderMetaItem('metaUpdatedAt', 'metaUpdatedAtText', user.updated_at ? t('profileUpdatedAt', formatDateTime(user.updated_at)) : '');

  // 公开邮箱（多数用户没填，为空就隐藏）
  const emailEl = document.getElementById('metaEmail');
  if (user.email) {
    const emailLink = document.getElementById('metaEmailLink');
    emailLink.href = `mailto:${user.email}`;
    emailLink.textContent = user.email;
    emailEl.classList.remove('hidden');
  } else {
    emailEl.classList.add('hidden');
  }

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

  // 账号总览：由这份仓库列表聚合，不额外发请求
  renderOverview(repos);

  // 仓库列表渲染（卡片只展示最前面的 4 个）
  const repoContainer = document.getElementById('repoList');
  repoContainer.innerHTML = '';
  const topRepos = repos ? repos.slice(0, 4) : [];

  if (topRepos.length > 0) {
    topRepos.forEach(repo => {
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

// 账号总览：语言分布 / Star 排行 / 每年新建仓库 + 汇总数字
function renderOverview(repos) {
  const block = document.getElementById('overviewBlock');
  if (!repos || !repos.length) {
    block.classList.add('hidden');
    return;
  }
  block.classList.remove('hidden');
  document.getElementById('overviewNote').textContent = t('ovNote', repos.length);

  const langCount = {};
  const yearCount = {};
  const licenseCount = {};
  let stars = 0, forks = 0, original = 0, forked = 0;

  repos.forEach(repo => {
    const lang = repo.language || t('ovNoLang');
    langCount[lang] = (langCount[lang] || 0) + 1;
    const year = new Date(repo.created_at).getFullYear();
    yearCount[year] = (yearCount[year] || 0) + 1;
    stars += repo.stargazers_count || 0;
    forks += repo.forks_count || 0;
    if (repo.fork) { forked++; } else { original++; }
    if (repo.license) {
      const key = repo.license.spdx_id || repo.license.name;
      licenseCount[key] = (licenseCount[key] || 0) + 1;
    }
  });

  const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  // 语言取 Top5，剩下的合并成"其他"，让分布合计能对上总数
  const langEntries = top(langCount, 5);
  const restCount = repos.length - langEntries.reduce((sum, e) => sum + e[1], 0);
  if (restCount > 0) langEntries.push([t('ovOther'), restCount]);

  renderBars('ovLanguages', langEntries);
  renderBars('ovStars', repos.map(r => [r.name, r.stargazers_count || 0]).sort((a, b) => b[1] - a[1]).slice(0, 5));
  renderBars('ovCreated', Object.entries(yearCount).sort((a, b) => a[0] - b[0]));
  renderOverviewTotals(stars, forks, original, forked, top(licenseCount, 1)[0]);
}

// 画一组横向条形：entries 为 [[名称, 数值], ...]
function renderBars(containerId, entries) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  const max = Math.max(...entries.map(e => e[1]), 1);
  entries.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2';

    const name = document.createElement('span');
    name.className = 'w-20 shrink-0 truncate text-[11px] text-neutral-500';
    name.textContent = label;
    name.title = label;

    const track = document.createElement('span');
    track.className = 'flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden';
    const fill = document.createElement('span');
    fill.className = 'block h-full rounded-full bg-neutral-800';
    fill.style.width = Math.max(2, Math.round((value / max) * 100)) + '%';
    track.appendChild(fill);

    const num = document.createElement('span');
    num.className = 'w-12 shrink-0 text-right text-[11px] text-neutral-400 font-mono';
    num.textContent = value.toLocaleString();

    row.append(name, track, num);
    box.appendChild(row);
  });
}

function renderOverviewTotals(stars, forks, original, forked, mainLicense) {
  const box = document.getElementById('ovTotals');
  box.innerHTML = '';
  const parts = [
    t('ovTotalStars', stars.toLocaleString()),
    t('ovTotalForks', forks.toLocaleString()),
    t('ovSplit', original, forked),
    mainLicense ? t('ovLicense', mainLicense[0]) : '',
  ];
  parts.filter(Boolean).forEach(text => {
    const span = document.createElement('span');
    span.textContent = text;
    box.appendChild(span);
  });
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
