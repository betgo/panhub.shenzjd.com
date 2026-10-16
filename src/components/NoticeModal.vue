<template>
  <!-- 推广弹窗：内容来自 src/config/placeholders.ts（PROMO_POPUP），不再请求官方微信群接口 -->
  <Teleport to="body">
    <div v-if="visible" class="nm-mask" @click.self="dismiss">
      <div class="nm-modal" role="dialog" aria-modal="true" :aria-label="title || 'xxx'">
        <button class="nm-close" type="button" aria-label="关闭" title="关闭" @click="dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h3 v-if="title" class="nm-title">{{ title }}</h3>

        <p v-if="text" class="nm-text">{{ text }}</p>

        <a
          v-if="imageUrl && !imageFailed && link && link !== 'xxx'"
          class="nm-figure nm-figure--link"
          :href="link"
          target="_blank"
          rel="noopener">
          <img :src="imageUrl" :alt="imageHint || title || 'xxx'" loading="lazy" @error="onImageError" />
        </a>
        <div v-else-if="imageUrl && !imageFailed" class="nm-figure">
          <img :src="imageUrl" :alt="imageHint || title || 'xxx'" loading="lazy" @error="onImageError" />
        </div>

        <p v-if="imageHint && imageUrl && !imageFailed" class="nm-hint">{{ imageHint }}</p>

        <button class="nm-btn" type="button" @click="dismiss">{{ buttonText }}</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { PROMO_POPUP } from "../config/placeholders";

const DISMISS_KEY_PREFIX = "panhub:notice-popup-dismissed:v";
const SHOW_DELAY_MS = 800;

const title = ref("");
const text = ref("");
const imageUrl = ref("");
const imageHint = ref("");
const link = ref("");
const buttonText = ref("xxx");
const currentVersion = ref<number | null>(null);

const visible = ref(false);
const imageFailed = ref(false);
let showTimer: ReturnType<typeof setTimeout> | null = null;

function onImageError() {
  imageFailed.value = true;
}

onMounted(() => {
  const data = PROMO_POPUP;
  if (!data.enabled) return;

  title.value = data.title || "xxx";
  text.value = data.text || "xxx";
  imageUrl.value = data.imageUrl || "";
  imageHint.value = data.imageHint || "";
  link.value = data.link || "xxx";
  buttonText.value = data.buttonText || "xxx";
  currentVersion.value = Number(data.version) || 0;

  try {
    if (localStorage.getItem(`${DISMISS_KEY_PREFIX}${currentVersion.value}`)) return;
  } catch {}

  showTimer = setTimeout(() => {
    visible.value = true;
  }, SHOW_DELAY_MS);
});

onBeforeUnmount(() => {
  if (showTimer) clearTimeout(showTimer);
});

function dismiss() {
  visible.value = false;
  if (currentVersion.value === null) return;
  try {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${currentVersion.value}`, "1");
  } catch {}
}
</script>

<style scoped>
.nm-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  animation: nm-fade 0.18s ease;
}

.nm-modal {
  position: relative;
  width: 100%;
  max-width: 360px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 28px 24px 24px;
  border-radius: var(--radius-lg, 16px);
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-light, #e5e7eb);
  box-shadow: var(--shadow-xl, 0 20px 50px rgba(15, 23, 42, 0.2));
  text-align: center;
  animation: nm-pop 0.22s ease;
}

.nm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary, #9ca3af);
  cursor: pointer;
}
.nm-close:hover {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-secondary, #4b5563);
}

.nm-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #111827);
}

.nm-text {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #4b5563);
  text-align: left;
  white-space: pre-line;
}

.nm-figure {
  display: inline-block;
  padding: 8px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--border-light, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
}
.nm-figure--link {
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.nm-figure--link:hover {
  opacity: 0.88;
}
.nm-figure img {
  display: block;
  width: 200px;
  max-width: 100%;
  border-radius: 6px;
}

.nm-hint {
  margin: 10px 0 18px;
  font-size: 12px;
  color: var(--text-tertiary, #9ca3af);
}

.nm-btn {
  width: 100%;
  padding: 10px 0;
  border: none;
  border-radius: var(--radius-md, 10px);
  background: var(--primary, #0f766e);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.nm-btn:hover {
  opacity: 0.88;
}

@keyframes nm-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes nm-pop {
  from {
    transform: scale(0.94) translateY(8px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
</style>
