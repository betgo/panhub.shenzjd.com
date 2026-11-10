<template>
  <div class="daily-page">
    <div class="daily-page-head">
      <h1 class="daily-page-title">每日更新</h1>
      <p class="daily-page-desc">{{ pageDesc }}</p>
    </div>

    <div class="daily-panel">
      <div class="daily-tabs" role="tablist" aria-label="资源列表切换">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="active === tab.key"
          class="daily-tab"
          :class="{ 'daily-tab--on': active === tab.key }"
          @click="switchTab(tab.key)">
          {{ tab.label }}
        </button>
      </div>

      <DailyChatFeed v-if="groups.length" :groups="groups" class="daily-body" />
      <div v-else class="daily-empty">
        <template v-if="loading">正在加载…</template>
        <template v-else-if="active === 'community'">
          最近 24 小时还没有人转存，用顶部搜索框搜一搜，点「获取」就会出现在这里
        </template>
        <template v-else>还没有更新，等下一班采集（每天 2 点 / 14 点）</template>
      </div>

      <div ref="sentinel" class="daily-sentinel" aria-hidden="true" />
      <div v-if="loading" class="daily-more">加载中…</div>
      <div v-else-if="!hasMore && groups.length" class="daily-end">已经到底啦</div>
    </div>

    <div v-if="active === 'auto'" class="daily-extra">
      想离线翻表格？
      <a
        href="https://pan.quark.cn/s/82541cdbf13f"
        target="_blank"
        rel="noopener noreferrer">
        下载完整表格版（Excel · 夸克网盘）
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import DailyChatFeed from "./DailyChatFeed.vue";
import {
  fetchCommunityShares,
  fetchDailyResourceItems,
  groupDailyItems,
  type DailyResourceItem,
} from "../api/daily";
import { navigateApp } from "../utils/appRoute";

type TabKey = "auto" | "community";

const tabs: { key: TabKey; label: string }[] = [
  { key: "auto", label: "今日更新" },
  { key: "community", label: "网友转存" },
];

const PAGE_SIZE = 200;

const props = defineProps<{
  initialTab?: TabKey;
}>();

const active = ref<TabKey>(props.initialTab === "community" ? "community" : "auto");
const items = ref<DailyResourceItem[]>([]);
const hasMore = ref(false);
const loading = ref(true);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
let fetchSeq = 0;

const groups = computed(() => groupDailyItems(items.value));
const loadedCount = computed(() => items.value.length);

const pageDesc = computed(() =>
  active.value === "community"
    ? "最近 24 小时大家点「获取」拿到的资源，按时间排，点开即可保存到自己的网盘。 都是本站账号已经分享出来的链接，随时可能失效，看到合适的先存。"
    : `本站网盘的资源清单，共 ${loadedCount.value} 条：运营精选 + 每天自动采集转存，点开即可保存到自己的网盘。 想找表里没有的？用顶部搜索框搜全网。`,
);

function syncTabUrl() {
  navigateApp("/daily", active.value === "community" ? { tab: "community" } : undefined, {
    replace: true,
  });
}

async function load(offset: number) {
  const seq = ++fetchSeq;
  const isAuto = active.value === "auto";
  try {
    const res = isAuto
      ? await fetchDailyResourceItems(offset, PAGE_SIZE)
      : await fetchCommunityShares(offset, PAGE_SIZE);
    if (seq !== fetchSeq) return;
    items.value = offset === 0 ? res.items : [...items.value, ...res.items];
    hasMore.value = res.hasMore;
  } catch {
    if (seq !== fetchSeq) return;
    if (offset === 0) items.value = [];
    hasMore.value = false;
  }
}

async function switchTab(key: TabKey) {
  if (active.value === key) return;
  active.value = key;
  items.value = [];
  hasMore.value = false;
  loading.value = true;
  syncTabUrl();
  try {
    await load(0);
  } finally {
    loading.value = false;
  }
  await nextTick();
  bindObserver();
  checkSentinel();
}

async function loadMore() {
  loading.value = true;
  try {
    await load(items.value.length);
  } finally {
    loading.value = false;
  }
  checkSentinel();
}

function checkSentinel() {
  const el = sentinel.value;
  if (!el || loading.value || !hasMore.value) return;
  if (el.getBoundingClientRect().top <= window.innerHeight + 300) void maybeLoadMore();
}

function unbindObserver() {
  observer?.disconnect();
  observer = null;
}

async function maybeLoadMore() {
  if (loading.value || !hasMore.value) return;
  await loadMore();
}

function bindObserver() {
  if (!sentinel.value || typeof IntersectionObserver === "undefined") return;
  unbindObserver();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) void maybeLoadMore();
    },
    { rootMargin: "300px 0px" },
  );
  observer.observe(sentinel.value);
}

watch(
  () => props.initialTab,
  (tab) => {
    const next = tab === "community" ? "community" : "auto";
    if (next !== active.value) void switchTab(next);
  },
);

onMounted(async () => {
  loading.value = true;
  try {
    await load(0);
  } finally {
    loading.value = false;
  }
  await nextTick();
  checkSentinel();
  bindObserver();
});

onBeforeUnmount(unbindObserver);
</script>

<style scoped>
.daily-page {
  flex-direction: column;
  gap: 16px;
  width: 100%;
  display: flex;
}
.daily-page-head {
  text-align: center;
}
.daily-page-title {
  color: var(--text-primary);
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 800;
}
.daily-page-desc {
  color: var(--text-secondary);
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}
.daily-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.daily-tabs {
  border-bottom: 1px solid var(--border-light);
  align-items: flex-end;
  gap: 28px;
  padding: 12px 16px 0;
  display: flex;
}
.daily-tab {
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast);
  background: none;
  border: none;
  padding: 2px 0 12px;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.4;
  position: relative;
}
.daily-tab:hover {
  color: var(--text-primary);
}
.daily-tab--on,
.daily-tab--on:hover {
  color: var(--text-primary);
  font-weight: 700;
}
.daily-tab::after {
  content: "";
  background: var(--primary);
  border-radius: 3px;
  height: 3px;
  transition: left 0.2s, right 0.2s;
  position: absolute;
  bottom: 0;
  left: 50%;
  right: 50%;
}
.daily-tab--on::after {
  left: 0;
  right: 0;
}
.daily-body {
  padding: 2px 16px 6px;
}
.daily-empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 48px 0;
  font-size: 14px;
}
.daily-sentinel {
  width: 100%;
  height: 1px;
}
.daily-end,
.daily-more {
  color: var(--text-tertiary);
  justify-content: center;
  padding: 6px 0;
  font-size: 12px;
  display: flex;
}
.daily-extra {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
.daily-extra a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}
.daily-extra a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .daily-page-title {
    font-size: 22px;
  }
  .daily-tabs {
    gap: 20px;
    padding: 10px 12px 0;
  }
  .daily-tab {
    font-size: 15px;
  }
  .daily-body {
    padding: 2px 12px 6px;
  }
}
</style>
