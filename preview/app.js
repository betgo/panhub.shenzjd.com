/**
 * 星盘搜 · 静态改版预览
 * mock 数据 only；交互对齐现站：搜索 → 结果列表 + 平台筛选；复制链接 / 打开
 */
(function () {
  "use strict";

  const PLATFORMS = {
    baidu: { name: "百度网盘", color: "#2932E1", short: "百" },
    aliyun: { name: "阿里云盘", color: "#FF6A00", short: "阿" },
    quark: { name: "夸克网盘", color: "#7B61FF", short: "夸" },
    xunlei: { name: "迅雷云盘", color: "#1E88E5", short: "迅" },
    uc: { name: "UC网盘", color: "#FF6B35", short: "UC" },
    others: { name: "其他", color: "#5F6368", short: "其他" },
  };

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
    {
      name: "2025 热门电影精选合集",
      note: "夸克 · 持续更新",
      platform: "quark",
      url: "https://example.com/curated/movies",
    },
    {
      name: "四六级真题与听力资料",
      note: "百度 · 含答案解析",
      platform: "baidu",
      url: "https://example.com/curated/cet",
    },
    {
      name: "设计师常用字体与模板",
      note: "阿里 · 商用请自行确认授权",
      platform: "aliyun",
      url: "https://example.com/curated/design",
    },
    {
      name: "开源软件安装包镜像",
      note: "迅雷 · 仅作备份索引",
      platform: "xunlei",
      url: "https://example.com/curated/oss",
    },
  ];

  /** 按关键词生成稳定的 mock 结果 */
  function mockResults(kw) {
    const seed = Array.from(kw).reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
    const titles = [
      `${kw} 完整合集 高清`,
      `${kw} 资源包（含说明）`,
      `【分享】${kw} 最新整理`,
      `${kw} 学习资料 / 课件`,
      `${kw} 备份 · 提取码已填`,
      `${kw} 精校版`,
      `网友分享：${kw}`,
      `${kw} 周边 / 扩展包`,
    ];
    const platforms = ["baidu", "aliyun", "quark", "xunlei", "uc", "baidu", "quark", "aliyun"];
    const count = 5 + (seed % 4);
    const items = [];
    for (let i = 0; i < count; i++) {
      const p = platforms[(seed + i) % platforms.length];
      const day = 1 + ((seed + i * 3) % 28);
      items.push({
        id: `m-${seed}-${i}`,
        title: titles[i % titles.length],
        platform: p,
        datetime: `2026-0${1 + ((seed + i) % 9)}-${String(day).padStart(2, "0")}`,
        password: i % 3 === 0 ? String(1000 + ((seed + i) % 9000)) : "",
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
  const resultsClear = document.getElementById("results-clear");
  const hotList = document.getElementById("hot-list");
  const curatedList = document.getElementById("curated-list");
  const filtersEl = document.getElementById("filters");
  const resultList = document.getElementById("result-list");
  const statsBar = document.getElementById("stats-bar");
  const statTotal = document.getElementById("stat-total");
  const statTime = document.getElementById("stat-time");
  const loadingEl = document.getElementById("loading");
  const emptyEl = document.getElementById("empty");
  const toastEl = document.getElementById("toast");

  let currentItems = [];
  let filterPlatform = "all";
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
    btn.classList.toggle("is-visible", Boolean(input.value.trim()));
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

  function countsByPlatform(items) {
    const map = {};
    items.forEach((it) => {
      map[it.platform] = (map[it.platform] || 0) + 1;
    });
    return map;
  }

  function renderFilters(items) {
    const counts = countsByPlatform(items);
    const keys = Object.keys(counts);
    const tabs = [
      { id: "all", label: `全部 (${items.length})` },
      ...keys.map((k) => ({
        id: k,
        label: `${(PLATFORMS[k] || PLATFORMS.others).name} (${counts[k]})`,
      })),
    ];
    filtersEl.innerHTML = tabs
      .map(
        (t) =>
          `<button type="button" class="filter-tab${filterPlatform === t.id ? " is-active" : ""}" data-platform="${t.id}">${escapeHtml(t.label)}</button>`
      )
      .join("");
    filtersEl.hidden = items.length === 0;
  }

  function filteredItems() {
    if (filterPlatform === "all") return currentItems;
    return currentItems.filter((it) => it.platform === filterPlatform);
  }

  function renderResults() {
    const items = filteredItems();
    resultList.innerHTML = items
      .map((it) => {
        const info = PLATFORMS[it.platform] || PLATFORMS.others;
        const pwd = it.password
          ? `<span>提取码: ${escapeHtml(it.password)}</span>`
          : "";
        return `<li class="result-row" data-id="${escapeAttr(it.id)}">
          <div class="result-row__platform">
            <span class="result-row__dot" style="background:${info.color}"></span>
            ${escapeHtml(info.name)}
          </div>
          <button type="button" class="result-row__title" data-action="open" data-url="${escapeAttr(it.url)}">${escapeHtml(it.title)}</button>
          <div class="result-row__meta">
            <span>${escapeHtml(it.datetime)}</span>
            ${pwd}
          </div>
          <div class="result-row__actions">
            <button type="button" class="action-text" data-action="copy" data-url="${escapeAttr(it.url)}">复制链接</button>
            <button type="button" class="action-text" data-action="open" data-url="${escapeAttr(it.url)}">打开</button>
          </div>
        </li>`;
      })
      .join("");

    emptyEl.hidden = items.length > 0;
    resultList.hidden = items.length === 0;
  }

  function doSearch(raw) {
    const kw = String(raw || "").trim();
    if (!kw) {
      showToast("请输入关键词");
      return;
    }
    homeKw.value = kw;
    resultsKw.value = kw;
    syncClear(homeKw, homeClear);
    syncClear(resultsKw, resultsClear);
    filterPlatform = "all";
    setView("results");

    loadingEl.hidden = false;
    emptyEl.hidden = true;
    resultList.hidden = true;
    statsBar.hidden = true;
    filtersEl.hidden = true;

    // 模拟现站短暂加载
    setTimeout(() => {
      currentItems = mockResults(kw);
      loadingEl.hidden = true;
      statTotal.textContent = String(currentItems.length);
      statTime.textContent = (0.2 + (kw.length % 7) / 10).toFixed(1);
      statsBar.hidden = false;
      renderFilters(currentItems);
      renderResults();
    }, 280);
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

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("链接已复制");
    } catch {
      showToast("复制失败，请手动选择链接");
    }
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
  resultsKw.addEventListener("input", () => syncClear(resultsKw, resultsClear));
  homeClear.addEventListener("click", () => {
    homeKw.value = "";
    syncClear(homeKw, homeClear);
    homeKw.focus();
  });
  resultsClear.addEventListener("click", () => {
    resultsKw.value = "";
    syncClear(resultsKw, resultsClear);
    resultsKw.focus();
  });

  document.getElementById("back-home").addEventListener("click", () => {
    setView("home");
    currentItems = [];
    filterPlatform = "all";
  });

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

  resultList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const url = btn.getAttribute("data-url");
    const action = btn.getAttribute("data-action");
    if (action === "copy") copyText(url);
    if (action === "open") {
      showToast("预览：不打开真实链接");
      // mock：不真跳外链，避免误导；正式站会打开分享页
    }
  });

  renderHomeExtras();
  syncClear(homeKw, homeClear);
  syncClear(resultsKw, resultsClear);
})();
