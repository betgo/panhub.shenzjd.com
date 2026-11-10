<template>
  <div class="chat-msg">
    <div v-if="coverSrc" class="chat-row">
      <img
        v-if="channel.avatar"
        class="chat-av"
        :src="channel.avatar"
        alt=""
        width="40"
        height="40"
        loading="lazy" />
      <span
        v-else
        class="chat-av chat-av--text"
        :style="{ background: channel.tone }"
        aria-hidden="true">{{ channel.name.slice(0, 1) }}</span>
      <div class="chat-main">
        <div class="chat-nick">{{ channel.name }}</div>
        <a
          class="chat-img"
          :href="coverSrc"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`查看大图：${lead.name}`">
          <img
            :src="coverSrc"
            :alt="lead.name"
            loading="lazy"
            decoding="async"
            @error="onCoverError" />
        </a>
      </div>
    </div>

    <div class="chat-row">
      <img
        v-if="channel.avatar"
        class="chat-av"
        :src="channel.avatar"
        alt=""
        width="40"
        height="40"
        loading="lazy" />
      <span
        v-else
        class="chat-av chat-av--text"
        :style="{ background: channel.tone }"
        aria-hidden="true">{{ channel.name.slice(0, 1) }}</span>
      <div class="chat-main">
        <div class="chat-nick">
          {{ channel.name }}
          <span v-if="lead.pinned" class="chat-tag">精选</span>
          <span v-else-if="isNew" class="chat-tag chat-tag--new">新</span>
        </div>
        <div class="chat-bub">
          <div v-for="(item, index) in items" :key="item.id" class="bub-item">
            <a
              class="bub-title"
              :class="{ 'bub-title--lead': items.length === 1 }"
              :href="item.shareUrl"
              target="_blank"
              rel="noopener noreferrer"
              @click="onOpen(item, $event)">{{ item.name }}</a>
            <p v-if="index === 0 && lead.summary" class="bub-desc">{{ lead.summary }}</p>
            <p class="bub-line">
              <img
                class="bub-ico"
                :src="platformIcon(item)"
                :alt="platformName(item)"
                :title="platformName(item)"
                width="14"
                height="14"
                loading="lazy" />
              <span class="bub-plat">{{ platformName(item) }}：</span>
              <a
                class="bub-url"
                :href="item.shareUrl"
                target="_blank"
                rel="noopener noreferrer"
                @click="onOpen(item, $event)">{{ item.shareUrl }}</a>
              <span v-if="passcodeOf(item)" class="bub-pwd"> 提取码：{{ passcodeOf(item) }}</span>
              <button
                type="button"
                class="bub-copy"
                :class="{ 'bub-copy--ok': copiedId === item.id }"
                @click="copyOne(item)">
                {{ copiedId === item.id ? "已复制" : "复制" }}
              </button>
            </p>
          </div>
          <div v-if="items.length > 1" class="bub-all">
            <button
              type="button"
              class="bub-copy"
              :class="{ 'bub-copy--ok': copiedAll }"
              @click="copyGroup">
              {{ copiedAll ? "已复制整条" : `复制全部 ${items.length} 条` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { PLATFORM_INFO, platformInfo } from "../config/platforms";
import { dailyCoverUrl, type DailyResourceItem } from "../api/daily";
import { copyText } from "../utils/clipboard";
import { openOrTransferDaily, passcodeOf } from "../utils/dailyShare";

const CHANNELS: Record<string, { name: string; tone: string; avatar?: string }> = {
  meiriyishu: { name: "优质资源收藏夹", tone: "#c9463c" },
  quanwangzy: { name: "全网资源", tone: "#2f6ed4" },
  community: { name: "星盘搜资源库", tone: "#1A73E8", avatar: "./logo.svg" },
};

const DEFAULT_CHANNEL = {
  name: "星盘搜资源库",
  tone: "#1A73E8",
  avatar: "./logo.svg",
};

const props = defineProps<{
  items: DailyResourceItem[];
  isNew?: boolean;
}>();

const coverFailed = ref(false);
const copiedId = ref<DailyResourceItem["id"] | null>(null);
const copiedAll = ref(false);

const lead = computed(() => props.items[0]);
const channel = computed(() => {
  const key = lead.value?.channel;
  return (key && CHANNELS[key]) || DEFAULT_CHANNEL;
});
const coverSrc = computed(() => {
  const cover = lead.value?.cover;
  if (!cover || coverFailed.value) return "";
  return dailyCoverUrl(cover);
});

function onCoverError() {
  coverFailed.value = true;
}

function platformIcon(item: DailyResourceItem): string {
  return PLATFORM_INFO[item.platform]?.icon || PLATFORM_INFO.others.icon;
}

function platformName(item: DailyResourceItem): string {
  return platformInfo(item.platform).name;
}

function formatItem(item: DailyResourceItem): string {
  return [
    item.name,
    `${platformName(item)}：${item.shareUrl}`,
    passcodeOf(item) ? `提取码：${passcodeOf(item)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyOne(item: DailyResourceItem) {
  await copyText(formatItem(item));
  copiedId.value = item.id;
  setTimeout(() => {
    if (copiedId.value === item.id) copiedId.value = null;
  }, 1600);
}

async function copyGroup() {
  await copyText(props.items.map(formatItem).join("\n\n"));
  copiedAll.value = true;
  setTimeout(() => {
    copiedAll.value = false;
  }, 1800);
}

async function onOpen(item: DailyResourceItem, ev: MouseEvent) {
  await openOrTransferDaily(item, ev);
}
</script>

<style scoped>
.chat-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chat-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0;
}
.chat-row + .chat-row {
  margin-top: 2px;
}
.chat-av {
  object-fit: cover;
  background: #d5d8dc;
  border-radius: 6px;
  flex: none;
  width: 40px;
  height: 40px;
  display: block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.chat-av--text {
  color: #fff;
  user-select: none;
  justify-content: center;
  align-items: center;
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
  display: flex;
}
.chat-main {
  flex: 0 auto;
  min-width: 0;
  max-width: 620px;
}
.chat-nick {
  color: var(--text-tertiary);
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 16px;
  overflow: hidden;
}
.chat-tag {
  color: var(--primary);
  background: var(--primary-soft);
  vertical-align: 1px;
  border-radius: 4px;
  margin-left: 4px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
}
.chat-tag--new {
  color: #fff;
  background: var(--primary);
}
.chat-img {
  background: var(--bg-secondary);
  border-radius: 8px;
  width: 160px;
  display: block;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.chat-img img {
  object-fit: cover;
  width: 100%;
  height: auto;
  max-height: 260px;
  display: block;
}
.chat-bub {
  box-sizing: border-box;
  max-width: 100%;
  color: var(--text-primary);
  word-break: break-word;
  overflow-wrap: anywhere;
  user-select: text;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 4px 12px 12px;
  padding: 9px 13px;
  font-size: 14px;
  line-height: 1.65;
  display: inline-block;
  box-shadow: var(--shadow-sm);
}
.bub-item + .bub-item {
  margin-top: 10px;
}
.bub-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  text-decoration: none;
  display: block;
}
.bub-title--lead {
  font-size: 15px;
}
.bub-title:hover {
  color: var(--primary);
}
.bub-desc {
  color: var(--text-secondary);
  white-space: pre-wrap;
  margin: 4px 0 0;
  font-size: 13.5px;
}
.bub-line {
  margin: 4px 0 0;
  font-size: 13.5px;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 4px;
  line-height: 1.7;
  display: flex;
}
.bub-ico {
  flex: none;
  align-self: center;
}
.bub-plat {
  color: var(--text-secondary);
  flex: none;
}
.bub-url {
  color: var(--primary-dark);
  word-break: break-all;
  flex: 0 auto;
  min-width: 0;
  text-decoration: none;
}
.bub-url:hover {
  text-decoration: underline;
}
.bub-pwd {
  flex: none;
  color: var(--text-secondary);
}
.chat-bub .bub-copy {
  color: var(--primary-dark);
  vertical-align: 1px;
  cursor: pointer;
  white-space: nowrap;
  background: var(--bg-secondary);
  border: 0;
  border-radius: 10px;
  flex: none;
  margin-left: 6px;
  padding: 0 9px;
  font-size: 12px;
  line-height: 20px;
  transition: background-color 0.15s, color 0.15s;
  display: inline-block;
}
.chat-bub .bub-copy:hover {
  background: var(--bg-hover);
}
.chat-bub .bub-copy--ok,
.chat-bub .bub-copy--ok:hover {
  color: #fff;
  background: var(--success);
}
.bub-all {
  border-top: 1px dashed var(--border-light);
  margin-top: 8px;
  padding-top: 6px;
}

@media (max-width: 640px) {
  .chat-av {
    width: 36px;
    height: 36px;
  }
  .chat-av--text {
    font-size: 15px;
  }
  .chat-main {
    max-width: calc(100% - 46px);
  }
  .chat-img {
    width: 140px;
  }
  .bub-url {
    flex: 100%;
    order: 3;
    margin-top: 2px;
  }
  .chat-bub .bub-copy {
    order: 2;
    margin-left: auto;
  }
  .bub-pwd {
    order: 4;
  }
  .chat-bub {
    padding: 8px 11px;
    font-size: 13.5px;
  }
  .bub-title {
    font-size: 14px;
  }
}
</style>
