<template>
  <section v-if="visible" class="daily-section">
    <div class="daily-head">
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
      <div class="daily-hint">
        <span v-if="todayCount > 0" class="daily-hint__dot" aria-hidden="true" />
        <span class="daily-hint__text">{{ hintText }}</span>
        <span v-if="hintExtra" class="daily-hint__extra">· {{ hintExtra }}</span>
      </div>
      <a class="daily-head__more" :href="moreHref" @click="onMoreClick">
        查看更多 <span aria-hidden="true">→</span>
      </a>
    </div>

    <DailyChatFeed v-if="hasGroups" :groups="groups" class="daily-body" />
    <div v-else-if="!loading" class="daily-empty">
      最近 24 小时还没有人转存，先去搜一搜？搜到想要的点「获取」，就会出现在这里。
    </div>

    <div ref="sentinel" class="daily-sentinel" aria-hidden="true" />
    <div v-if="loading" class="daily-more">加载中…</div>
    <div v-else-if="!hasMore && hasGroups" class="daily-end">已经到底啦</div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import DailyChatFeed from "./DailyChatFeed.vue";
import {
  fetchCommunityShares,
  fetchDailyResourcesByDay,
  groupDailyItems,
  type DailyDayBucket,
  type DailyGroup,
  type DailyResourceItem,
} from "../api/daily";
import { buildAppHref, navigateApp } from "../utils/appRoute";
import { itemTimestamp, shanghaiDateKey, shanghaiHm } from "../utils/shanghaiTime";

type TabKey = "auto" | "community";

const tabs: { key: TabKey; label: string }[] = [
  { key: "auto", label: "今日更新" },
  { key: "community", label: "网友转存" },
];

const COMMUNITY_LIMIT = 20;
const DAY_PAGE = 3;

const active = ref<TabKey>("auto");
const communityItems = ref<DailyResourceItem[]>([]);
const autoDays = ref<DailyDayBucket[]>([]);
const hasMore = ref(false);
const loading = ref(false);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
let fetchSeq = 0;

const autoItems = computed(() => autoDays.value.flatMap((d) => d.items));
const groups = computed<DailyGroup[]>(() =>
  active.value === "auto"
    ? autoDays.value.flatMap((d) => groupDailyItems(d.items))
    : groupDailyItems(communityItems.value),
);
const hasGroups = computed(() => groups.value.length > 0);
const visible = computed(() => hasGroups.value || active.value === "community");

const todayCount = computed(() => {
  const today = shanghaiDateKey(Date.now());
  return autoItems.value.filter(
    (it) => !it.pinned && shanghaiDateKey(it.createdAt ?? it.publishedAt ?? 0) === today,
  ).length;
});

const latestHm = computed(() => {
  const source = active.value === "auto" ? autoItems.value : communityItems.value;
  const latest = source.reduce((max, it) => Math.max(max, itemTimestamp(it)), 0);
  return latest ? shanghaiHm(latest) : "";
});

const hintText = computed(() =>
  active.value === "community"
    ? "最近 24 小时 · 大家刚拿到的"
    : todayCount.value > 0
      ? `今天新增 ${todayCount.value} 条`
      : "每天自动采集转存",
);

const hintExtra = computed(() =>
  active.value === "community" || !latestHm.value ? "" : `最近 ${latestHm.value}`,
);

const moreHref = computed(() =>
  buildAppHref("/daily", active.value === "community" ? { tab: "community" } : undefined),
);

function onMoreClick(ev: MouseEvent) {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button === 1) return;
  ev.preventDefault();
  navigateApp("/daily", active.value === "community" ? { tab: "community" } : undefined);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

async function load(offset: number) {
  const seq = ++fetchSeq;
  const isAuto = active.value === "auto";
  try {
    if (isAuto) {
      const res = await fetchDailyResourcesByDay(offset, DAY_PAGE);
      if (seq !== fetchSeq) return;
      autoDays.value = offset === 0 ? res.days : [...autoDays.value, ...res.days];
      hasMore.value = res.hasMore;
    } else {
      const res = await fetchCommunityShares(offset, COMMUNITY_LIMIT);
      if (seq !== fetchSeq) return;
      communityItems.value = offset === 0 ? res.items : [...communityItems.value, ...res.items];
      hasMore.value = res.hasMore;
    }
  } catch {
    if (seq !== fetchSeq) return;
    if (offset === 0) {
      communityItems.value = [];
      autoDays.value = [];
    }
    hasMore.value = false;
  }
}

async function switchTab(key: TabKey) {
  if (active.value === key) return;
  active.value = key;
  communityItems.value = [];
  autoDays.value = [];
  hasMore.value = false;
  loading.value = true;
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
    const offset = active.value === "auto" ? autoDays.value.length : communityItems.value.length;
    await load(offset);
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

onMounted(async () => {
  await load(0);
  checkSentinel();
  bindObserver();
});

onBeforeUnmount(unbindObserver);
</script>

<style scoped>
.daily-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  width: 100%;
  animation: fadeIn 0.5s ease;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.daily-head {
  border-bottom: 1px solid var(--border-light);
  gap: 14px;
  padding: 12px 16px 0;
  align-items: flex-end;
  display: flex;
}
.daily-tabs {
  align-items: flex-end;
  display: flex;
  flex: none;
  gap: 28px;
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
.daily-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
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
.daily-hint {
  min-width: 0;
  color: var(--text-tertiary);
  white-space: nowrap;
  flex: auto;
  align-items: center;
  gap: 6px;
  padding-bottom: 13px;
  font-size: 12px;
  display: flex;
  overflow: hidden;
}
.daily-hint__text {
  text-overflow: ellipsis;
  min-width: 0;
  overflow: hidden;
}
.daily-hint__extra {
  flex: none;
}
.daily-hint__dot {
  background: var(--primary);
  border-radius: 50%;
  flex: none;
  width: 6px;
  height: 6px;
  animation: hintPulse 2s ease-in-out infinite;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.12);
}
@keyframes hintPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.daily-head__more {
  color: var(--primary);
  white-space: nowrap;
  flex: none;
  padding-bottom: 13px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.daily-head__more:hover {
  text-decoration: underline;
}
.daily-body {
  padding: 2px 16px 6px;
}
.daily-empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 22px 16px;
  font-size: 13px;
  line-height: 1.7;
}
.daily-sentinel {
  width: 100%;
  height: 1px;
}
.daily-end,
.daily-more {
  color: var(--text-tertiary);
  justify-content: center;
  padding: 10px 0 4px;
  font-size: 12px;
  display: flex;
}

@media (max-width: 640px) {
  .daily-section {
    border-radius: 10px;
  }
  .daily-head {
    gap: 8px;
    padding: 10px 12px 0;
  }
  .daily-tabs {
    gap: 20px;
  }
  .daily-tab {
    padding-bottom: 10px;
    font-size: 15px;
  }
  .daily-hint {
    font-size: 11px;
  }
  .daily-hint__extra {
    display: none;
  }
  .daily-hint__dot {
    width: 5px;
    height: 5px;
  }
  .daily-head__more {
    font-size: 12px;
  }
  .daily-body {
    padding: 2px 12px 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .daily-hint__dot,
  .daily-section {
    animation: none;
  }
  .daily-tab::after {
    transition: none;
  }
}
</style>
