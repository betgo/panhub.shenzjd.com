/**
 * 星盘搜 · 静态改版预览
 * 结果页结构对齐现站：SearchBox（全部网盘/重置/继续）+ 统计卡 + 平台 pill + ResultGroup 分组卡片
 * mock only；交互不新造
 */
(function () {
  "use strict";

  const INITIAL_VISIBLE = 3;

  const PLATFORMS = {
    quark: { name: "夸克网盘", color: "#6366f1", short: "夸", icon: "../icons/quark.png" },
    baidu: { name: "百度网盘", color: "#2563eb", short: "百", icon: "../icons/baidu.png" },
    aliyun: { name: "阿里云盘", color: "#7c3aed", short: "阿", icon: "../icons/aliyun.png" },
    xunlei: { name: "迅雷云盘", color: "#fbbf24", short: "迅", icon: "../icons/xunlei.png" },
    uc: { name: "UC网盘", color: "#ef4444", short: "UC", icon: "../icons/uc.png" },
    others: { name: "其他网盘", color: "#6b7280", short: "其他", icon: "../icons/others.png" },
  };

  const SEARCH_CATS = [
    { value: "", label: "全部网盘" },
    { value: "quark", label: "夸克网盘" },
    { value: "baidu", label: "百度网盘" },
    { value: "xunlei", label: "迅雷网盘" },
    { value: "uc", label: "UC网盘" },
    { value: "aliyun", label: "阿里网盘" },
  ];

  const HOT_KEYWORDS = [
    "黑神话悟空",
    "考研英语",
    "Office 2021",
    "动画电影合集",
    "摄影后期",
    "Python 入门",
    "无损音乐",
    "设计素材包",
    "纪录片",
    "电子书",
    "游戏补丁",
    "课件 PPT",
  ];

  const CURATED = [
    { name: "2025 热门电影精选合集", note: "夸克 · 持续更新", platform: "quark", url: "https://example.com/curated/movies" },
    { name: "四六级真题与听力资料", note: "百度 · 含答案解析", platform: "baidu", url: "https://example.com/curated/cet" },
    { name: "设计师常用字体与模板", note: "阿里 · 商用请自行确认授权", platform: "aliyun", url: "https://example.com/curated/design" },
    { name: "开源软件安装包镜像", note: "迅雷 · 仅作备份索引", platform: "xunlei", url: "https://example.com/curated/oss" },
  ];

  /** 按关键词生成稳定 mock；数量够分组展示 */
  function mockResults(kw) {
    const seed = Array.from(kw).reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
    const titles = [
      `${kw} 完整合集 高清`,
      `【分享】${kw} 最新整理`,
      `${kw} 资源包（含说明）`,
      `${kw} 学习资料 / 课件`,
      `${kw} 备份 · 提取码已填`,
      `${kw} 精校版`,
      `网友分享：${kw}`,
      `${kw} 周边 / 扩展包`,
      `[更新] ${kw} 合集续`,
      `${kw} 高清修复版`,
      `${kw} 资料库 全套`,
      `${kw} 精选打包`,
    ];
    // 故意让夸克多一些，贴近现站分组感
    const platforms = [
      "quark", "quark", "quark", "quark", "quark", "quark",
      "baidu", "baidu",
      "aliyun", "aliyun", "aliyun",
      "xunlei",
      "uc",
      "quark", "quark", "quark",
    ];
    const count = 12 + (seed % 8);
    const items = [];
    for (let i = 0; i < count; i++) {
      const p = platforms[(seed + i) % platforms.length];
      const day = 1 + ((seed + i * 3) % 28);
      const hour = (seed + i) % 24;
      const min = (seed * 2 + i * 7) % 60;
      const sec = (seed + i * 11) % 60;
      const pad = (n) => String(n).padStart(2, "0");
      items.push({
        id: `m-${seed}-${i}`,
        title: titles[i % titles.length],
        platform: p,
        datetime: `2026-${pad(1 + ((seed + i) % 9))}-${pad(day)} ${pad(hour)}:${pad(min)}:${pad(sec)}`,
        password: i % 4 === 0 ? String(1000 + ((seed + i) % 9000)) : "",
        url: `https://example.com/share/${p}/${encodeURIComponent(kw)}-${i}`,
      });
    }
    return items;
  }

  // ---- DOM ----
  const viewHome = document.getElementById("view-home");
  const viewResults = document.getElementById("view-results");
  const homeKw = document.getElementById("home-kw");
  const resultsKw = document.getElementById("results-kw");
  const homeClear = document.getElementById("home-clear");
  const hotList = document.getElementById("hot-list");
  const curatedList = document.getElementById("curated-list");
  const filtersEl = document.getElementById("filters");
  const resultsGrid = document.getElementById("results-grid");
  const resultsSection = document.getElementById("results-section");
  const statsBar = document.getElementById("stats-bar");
  const statTotal = document.getElementById("stat-total");
  const statTime = document.getElementById("stat-time");
  const statusText = document.getElementById("status-text");
  const loadingEl = document.getElementById("loading");
  const emptyEl = document.getElementById("empty");
  const toastEl = document.getElementById("toast");
  const btnReset = document.getElementById("btn-reset");
  const btnContinue = document.getElementById("btn-continue");
  const btnSearch = document.getElementById("btn-search");
  const catTrigger = document.getElementById("cat-trigger");
  const catMenu = document.getElementById("cat-menu");
  const catLabel = document.getElementById("cat-label");
  const catWrap = document.getElementById("cat-wrap");

  let currentItems = [];
  let filterPlatform = "all";
  let expandedSet = new Set();
  let searchCat = "";
  let searched = false;
  let pausedAtLimit = false;
  let toastTimer = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 1800);
  }

  function setView(name) {
    viewHome.classList.toggle("is-active", name === "home");
    viewResults.classList.toggle("is-active", name === "results");
    window.scrollTo(0, 0);
  }

  function syncClear(input, btn) {
    if (!btn) return;
    btn.classList.toggle("is-visible", Boolean(input.value.trim()));
  }

  function updateSearchActions() {
    // 结果态：重置 + 继续；未搜或回首页用「搜索」
    if (searched) {
      btnReset.hidden = false;
      btnContinue.hidden = false;
      btnSearch.hidden = true;
    } else {
      btnReset.hidden = true;
      btnContinue.hidden = true;
      btnSearch.hidden = false;
    }
  }

  function badgeClass(p) {
    if (p === "baidu") return "badge--baidu";
    if (p === "aliyun") return "badge--ali";
    if (p === "quark") return "badge--quark";
    if (p === "xunlei") return "badge--xunlei";
    if (p === "uc") return "badge--uc";
    return "badge--other";
  }

  function renderHomeExtras() {
    hotList.innerHTML = HOT_KEYWORDS.map(
      (k) => `<button type="button" class="hot-chip" data-kw="${escapeAttr(k)}">${escapeHtml(k)}</button>`
    ).join("");

    curatedList.innerHTML = CURATED.map((it) => {
      const info = PLATFORMS[it.platform] || PLATFORMS.others;
      return `<a class="curated-item" href="${escapeAttr(it.url)}" target="_blank" rel="noopener noreferrer">
        <span class="curated-item__badge ${badgeClass(it.platform)}">${escapeHtml(info.short)}</span>
        <span class="curated-item__body">
          <span class="curated-item__name">${escapeHtml(it.name)}</span>
          <span class="curated-item__note">${escapeHtml(it.note)}</span>
        </span>
        <span class="curated-item__go">去保存 →</span>
      </a>`;
    }).join("");
  }

  function renderCatMenu() {
    catMenu.innerHTML = SEARCH_CATS.map((c) => {
      const active = searchCat === c.value;
      return `<button type="button" role="option" class="cat-option${active ? " active" : ""}" data-cat="${escapeAttr(c.value)}" aria-selected="${active}">${escapeHtml(c.label)}</button>`;
    }).join("");
  }

  function setCat(value) {
    searchCat = value || "";
    const found = SEARCH_CATS.find((c) => c.value === searchCat);
    catLabel.textContent = found ? found.label : "全部网盘";
    renderCatMenu();
    catMenu.hidden = true;
    catTrigger.classList.remove("open");
    catTrigger.setAttribute("aria-expanded", "false");
  }

  function groupByPlatform(items) {
    const map = {};
    items.forEach((it) => {
      if (!map[it.platform]) map[it.platform] = [];
      map[it.platform].push(it);
    });
    // 按数量降序，贴近现站 orderDriverGroups
    return Object.keys(map)
      .sort((a, b) => map[b].length - map[a].length)
      .map((type) => ({ type, items: map[type] }));
  }

  function renderFilters(items) {
    const groups = groupByPlatform(items);
    const tabs = [
      { id: "all", label: `全部 (${items.length})` },
      ...groups.map((g) => ({
        id: g.type,
        label: `${(PLATFORMS[g.type] || PLATFORMS.others).name} (${g.items.length})`,
      })),
    ];
    filtersEl.innerHTML = tabs
      .map(
        (t) =>
          `<button type="button" class="filter-pill${filterPlatform === t.id ? " active" : ""}" data-platform="${t.id}">${escapeHtml(t.label)}</button>`
      )
      .join("");
  }

  function visibleGroups() {
    const groups = groupByPlatform(currentItems);
    if (filterPlatform === "all") return groups;
    return groups.filter((g) => g.type === filterPlatform);
  }

  function renderResults() {
    const groups = visibleGroups();
    if (!groups.length) {
      resultsSection.hidden = true;
      resultsGrid.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    resultsSection.hidden = false;

    resultsGrid.innerHTML = groups
      .map((g) => {
        const info = PLATFORMS[g.type] || PLATFORMS.others;
        const expanded = filterPlatform !== "all" || expandedSet.has(g.type);
        const visible = expanded ? g.items : g.items.slice(0, INITIAL_VISIBLE);
        const more = g.items.length - INITIAL_VISIBLE;
        const rows = visible
          .map((it) => {
            const pwd = it.password
              ? `<span class="meta-tag password">提取码: ${escapeHtml(it.password)}</span>`
              : "";
            return `<li class="resource-item" data-id="${escapeAttr(it.id)}">
              <div class="resource-content">
                <button type="button" class="resource-link" data-action="get" data-url="${escapeAttr(it.url)}" data-title="${escapeAttr(it.title)}">${escapeHtml(it.title)}</button>
                <div class="resource-meta">
                  <div class="meta-tags">
                    <span class="meta-tag date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      ${escapeHtml(it.datetime)}
                    </span>
                    ${pwd}
                  </div>
                  <button type="button" class="transfer-btn" data-action="get" data-url="${escapeAttr(it.url)}" data-title="${escapeAttr(it.title)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                    立即获取
                  </button>
                </div>
              </div>
            </li>`;
          })
          .join("");

        const footer =
          !expanded && more > 0
            ? `<div class="card-footer">
                <button type="button" class="load-more-btn" data-expand="${escapeAttr(g.type)}">
                  显示更多 (${more})
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                </button>
              </div>`
            : "";

        return `<div class="result-card" data-platform="${escapeAttr(g.type)}">
          <div class="card-header">
            <div class="platform-badge" style="background:${info.color}">
              <img src="${escapeAttr(info.icon)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentNode.textContent='${escapeAttr(info.short)}'" />
            </div>
            <div class="header-info">
              <h3 class="platform-title">${escapeHtml(info.name)}</h3>
              <span class="resource-count">${g.items.length} 个资源</span>
            </div>
          </div>
          <ul class="resource-list">${rows}</ul>
          ${footer}
        </div>`;
      })
      .join("");
  }

  function doSearch(raw, opts) {
    const kw = String(raw || "").trim();
    if (!kw) {
      showToast("请输入关键词");
      return;
    }
    const isContinue = opts && opts.continue;
    homeKw.value = kw;
    resultsKw.value = kw;
    syncClear(homeKw, homeClear);
    filterPlatform = "all";
    if (!isContinue) expandedSet = new Set();
    setView("results");
    searched = true;
    updateSearchActions();

    loadingEl.hidden = false;
    emptyEl.hidden = true;
    resultsSection.hidden = true;
    statsBar.hidden = true;

    setTimeout(() => {
      let items = mockResults(kw);
      if (searchCat) {
        // 类别缩小范围：只留该盘 + 少量其他，模拟现站 cat
        const preferred = items.filter((it) => it.platform === searchCat);
        items = preferred.length ? preferred : items.slice(0, 3).map((it) => ({ ...it, platform: searchCat }));
      }
      if (isContinue) {
        // 继续搜索：追加几条 mock
        const more = mockResults(kw + "+more").slice(0, 4).map((it, i) => ({
          ...it,
          id: `c-${Date.now()}-${i}`,
          title: `[继续] ${it.title}`,
        }));
        currentItems = currentItems.concat(more);
        pausedAtLimit = true;
      } else {
        currentItems = items;
        pausedAtLimit = true; // 预览默认停在「可继续」态，露出重置/继续
      }
      loadingEl.hidden = true;
      const total = currentItems.length;
      const elapsed = (0.8 + (kw.length % 9) / 2 + (isContinue ? 1.2 : 0)).toFixed(1);
      statTotal.textContent = String(total);
      statTime.textContent = `${elapsed}s`;
      statusText.textContent = `已找到 ${total} 条结果，可继续搜索更多`;
      statsBar.hidden = false;
      renderFilters(currentItems);
      renderResults();
    }, isContinue ? 420 : 320);
  }

  function fullReset() {
    searched = false;
    pausedAtLimit = false;
    currentItems = [];
    filterPlatform = "all";
    expandedSet = new Set();
    resultsKw.value = "";
    homeKw.value = "";
    syncClear(homeKw, homeClear);
    updateSearchActions();
    statsBar.hidden = true;
    resultsSection.hidden = true;
    emptyEl.hidden = true;
    loadingEl.hidden = true;
    setView("home");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  // ---- events ----
  document.getElementById("home-search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch(homeKw.value);
  });
  document.getElementById("results-search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSearch(resultsKw.value);
  });

  homeKw.addEventListener("input", () => syncClear(homeKw, homeClear));
  homeClear.addEventListener("click", () => {
    homeKw.value = "";
    syncClear(homeKw, homeClear);
    homeKw.focus();
  });

  btnReset.addEventListener("click", () => fullReset());
  btnContinue.addEventListener("click", () => {
    if (!resultsKw.value.trim()) return;
    doSearch(resultsKw.value, { continue: true });
  });

  document.getElementById("back-home").addEventListener("click", () => fullReset());

  hotList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-kw]");
    if (!btn) return;
    doSearch(btn.getAttribute("data-kw"));
  });

  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-platform]");
    if (!btn) return;
    filterPlatform = btn.getAttribute("data-platform");
    renderFilters(currentItems);
    renderResults();
  });

  resultsGrid.addEventListener("click", (e) => {
    const expand = e.target.closest("[data-expand]");
    if (expand) {
      expandedSet.add(expand.getAttribute("data-expand"));
      renderResults();
      return;
    }
    const btn = e.target.closest("[data-action='get']");
    if (!btn) return;
    showToast("预览：已模拟「立即获取」（不连真实转存）");
  });

  catTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = catMenu.hidden;
    catMenu.hidden = !open;
    catTrigger.classList.toggle("open", open);
    catTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  catMenu.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-cat]");
    if (!opt) return;
    setCat(opt.getAttribute("data-cat"));
  });
  document.addEventListener("click", (e) => {
    if (!catWrap.contains(e.target)) {
      catMenu.hidden = true;
      catTrigger.classList.remove("open");
      catTrigger.setAttribute("aria-expanded", "false");
    }
  });

  renderHomeExtras();
  renderCatMenu();
  setCat("");
  syncClear(homeKw, homeClear);
  updateSearchActions();
})();
