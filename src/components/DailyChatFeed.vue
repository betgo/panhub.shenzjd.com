<template>
  <div class="chat-feed">
    <template v-for="row in rows" :key="row.key">
      <div v-if="row.kind === 'day'" class="chat-day">
        <span class="chat-day__label">{{ row.label }}</span>
        <button type="button" class="chat-day__copy" @click="copyDay(row)">
          {{ copiedDate === row.date ? "已复制整天" : "复制整天" }}
        </button>
      </div>
      <div v-else-if="row.kind === 'time'" class="chat-time">{{ row.label }}</div>
      <DailyChatMessage
        v-else
        :items="row.group.items"
        :is-new="isNewGroup(row.group)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import DailyChatMessage from "./DailyChatMessage.vue";
import type { DailyGroup, DailyResourceItem } from "../api/daily";
import { copyText } from "../utils/clipboard";
import { passcodeOf } from "../utils/dailyShare";
import { platformInfo } from "../config/platforms";
import {
  itemTimestamp,
  shanghaiDateKey,
  shanghaiDayLabel,
  shanghaiHm,
} from "../utils/shanghaiTime";

const props = defineProps<{
  groups: DailyGroup[];
}>();

const copiedDate = ref<string | null>(null);
const todayKey = shanghaiDateKey(Date.now());

type FeedRow =
  | { kind: "day"; key: string; date: string; label: string; items: DailyResourceItem[] }
  | { kind: "time"; key: string; label: string }
  | { kind: "msg"; key: string; group: DailyGroup };

const rows = computed<FeedRow[]>(() => {
  const out: FeedRow[] = [];
  const sorted = [...props.groups].sort(
    (a, b) => itemTimestamp(b.items[0]) - itemTimestamp(a.items[0]),
  );
  const byDay = new Map<string, DailyResourceItem[]>();
  for (const g of sorted) {
    for (const item of g.items) {
      const key = shanghaiDateKey(itemTimestamp(item));
      const list = byDay.get(key);
      if (list) list.push(item);
      else byDay.set(key, [item]);
    }
  }
  let lastDay = "";
  let lastTime = "";
  for (const g of sorted) {
    const ts = itemTimestamp(g.items[0]);
    const day = shanghaiDateKey(ts);
    if (day !== lastDay) {
      out.push({
        kind: "day",
        key: `day:${day}`,
        date: day,
        label: shanghaiDayLabel(ts),
        items: byDay.get(day) || [],
      });
      lastDay = day;
      lastTime = "";
    }
    const hm = shanghaiHm(ts);
    if (hm !== lastTime) {
      out.push({ kind: "time", key: `time:${day}:${hm}`, label: hm });
      lastTime = hm;
    }
    out.push({ kind: "msg", key: g.key, group: g });
  }
  return out;
});

function isNewGroup(group: DailyGroup): boolean {
  const lead = group.items[0];
  if (!lead || lead.pinned) return false;
  return shanghaiDateKey(itemTimestamp(lead)) === todayKey;
}

function formatItem(item: DailyResourceItem): string {
  const name = platformInfo(item.platform).name;
  return [
    item.name,
    `${name}：${item.shareUrl}`,
    passcodeOf(item) ? `提取码：${passcodeOf(item)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyDay(row: Extract<FeedRow, { kind: "day" }>) {
  await copyText(row.items.map(formatItem).join("\n\n"));
  copiedDate.value = row.date;
  setTimeout(() => {
    if (copiedDate.value === row.date) copiedDate.value = null;
  }, 1800);
}
</script>

<style scoped>
.chat-feed {
  display: flex;
  flex-direction: column;
  padding: 2px 4px 8px;
}
.chat-time {
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  margin: 16px auto 2px;
  padding: 0 10px;
  display: table;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  font-size: 12px;
  line-height: 20px;
}
.chat-day {
  color: var(--text-secondary);
  align-self: center;
  align-items: center;
  gap: 8px;
  margin: 18px auto 0;
  padding: 0 6px 0 10px;
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  font-size: 12px;
  line-height: 20px;
}
.chat-day + .chat-time {
  margin-top: 8px;
}
.chat-day__label {
  font-weight: 600;
}
.chat-day__copy {
  color: var(--primary);
  cursor: pointer;
  white-space: nowrap;
  background: none;
  border: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0 6px;
  font-size: 12px;
  line-height: 20px;
}
.chat-day__copy:hover {
  text-decoration: underline;
}
</style>
