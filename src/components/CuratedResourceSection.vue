<template>
  <section v-if="items.length > 0" class="curated-section">
    <div class="curated-head">
      <span class="curated-head__bar" aria-hidden="true" />
      <h2 class="curated-head__text">精选资源</h2>
    </div>

    <div class="curated-list">
      <!-- reshare 开启：走「获取」弹窗（同搜索结果）；否则保持外链直达 -->
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="curated-item"
        :class="{ 'curated-item--busy': anyBusy && statusOf(item.url) === 'loading' }"
        @click="onCuratedClick(item)"
      >
        <img
          class="curated-item__icon"
          :src="platformIcon(item.platform)"
          :alt="platformName(item.platform)"
          :title="platformName(item.platform)"
          width="18"
          height="18"
          loading="lazy"
        />

        <span class="curated-item__body">
          <span class="curated-item__name">{{ item.name }}</span>
          <span v-if="item.note" class="curated-item__note">{{ item.note }}</span>
        </span>

        <span class="curated-item__go">
          <span class="curated-item__go-text">{{ goLabel(item) }}</span>
          <span aria-hidden="true">→</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { PLATFORM_INFO } from "../config/platforms";
import { API_BASE } from "../config";
import { reshareEnabled } from "../api/reshare";
import { useTransfer } from "../composables/useTransfer";
import { isReshareableDriver } from "../config";

/**
 * 网盘资源精选
 *
 * - 未开二次转存：行为与官方站一致，整行外链直达分享页
 * - 已开二次转存且盘型可转：点行走 requestTransfer → urldb reshare（与搜索「立即获取」同一套）
 * - 已开但盘型不可转：仍外链打开（避免空转）
 */
interface CuratedItem {
  id: string;
  name: string;
  url: string;
  note?: string;
  platform: string;
  password?: string;
}

interface CuratedResponse {
  code: number;
  message: string;
  data?: { items?: CuratedItem[]; updatedAt?: number };
}

const items = ref<CuratedItem[]>([]);
const { requestTransfer, statusOf, anyBusy } = useTransfer();

const platformIcon = (t: string): string => PLATFORM_INFO[t]?.icon || PLATFORM_INFO.others.icon;
const platformName = (t: string): string => PLATFORM_INFO[t]?.name || PLATFORM_INFO.others.name;

function driverFromPlatform(platform: string): string | null {
  const p = String(platform || "").toLowerCase();
  if (p.includes("xunlei") || p.includes("thunder")) return "xunlei";
  if (p.includes("quark")) return "quark";
  if (p.includes("baidu")) return "baidu";
  return null;
}

function canReshare(item: CuratedItem): boolean {
  if (!reshareEnabled()) return false;
  const d = driverFromPlatform(item.platform);
  if (isReshareableDriver(d)) return true;
  // 兜底：按 url 域名
  try {
    const host = new URL(item.url).hostname;
    if (host.includes("xunlei") || host.includes("quark") || host.includes("baidu")) return true;
  } catch {}
  return false;
}

function goLabel(item: CuratedItem): string {
  if (statusOf(item.url) === "loading") return "获取中";
  if (statusOf(item.url) === "done") return "已获取";
  return canReshare(item) ? "立即获取" : "去保存";
}

async function onCuratedClick(item: CuratedItem) {
  if (canReshare(item)) {
    await requestTransfer({
      url: item.url,
      name: item.name,
      password: item.password,
    });
    return;
  }
  window.open(item.url, "_blank", "noopener,noreferrer");
}

async function fetchItems() {
  try {
    const res = await fetch(`${API_BASE}/curated-resources`);
    const data: CuratedResponse = await res.json();
    const list = data?.code === 0 ? data.data?.items : [];
    items.value = Array.isArray(list)
      ? list.filter((it) => it && typeof it.url === "string" && it.url)
      : [];
  } catch {
    items.value = [];
  }
}

onMounted(fetchItems);
</script>

<style scoped>
.curated-section {
  width: 100%;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  animation: fadeIn 0.5s ease;
}

.curated-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-left: 10px;
}

.curated-head__bar {
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--primary), color-mix(in srgb, var(--primary) 40%, transparent));
}

.curated-head__text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.curated-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@media (min-width: 768px) {
  .curated-list {
    gap: 4px;
  }
}

.curated-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background 0.15s ease;
}

.curated-item:hover {
  background: var(--bg-secondary);
}

.curated-item--busy {
  opacity: 0.7;
}

.curated-item__icon {
  flex: 0 0 auto;
  border-radius: 4px;
}

.curated-item__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.curated-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.curated-item__note {
  font-size: 12px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.curated-item__go {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.curated-item:hover .curated-item__go {
  color: var(--primary);
}

.curated-item__go-text {
  display: none;
}

@media (hover: hover) {
  .curated-item:hover .curated-item__go-text {
    display: inline;
  }
}

@media (hover: none) {
  .curated-item__go-text {
    display: inline;
  }
}

@media (max-width: 640px) {
  .curated-section {
    padding: 10px;
  }
  .curated-head {
    padding-left: 8px;
  }
  .curated-item {
    padding: 8px;
    gap: 8px;
  }
}
</style>
