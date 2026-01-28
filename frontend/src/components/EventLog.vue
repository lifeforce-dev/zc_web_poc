<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { LogEntry } from '../composables/useMatchmaking'

const props = defineProps<{
  entries: LogEntry[]
}>()

const container = ref<HTMLElement | null>(null)

watch(
  () => props.entries.length,
  async () => {
    await nextTick()
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight
    }
  }
)
</script>

<template>
  <div class="log-panel">
    <div class="panel-header">
      <span class="panel-title">// EVENT LOG</span>
      <span class="log-count">{{ entries.length }} entries</span>
    </div>

    <div ref="container" class="log-container">
      <div
        v-for="(entry, i) in entries"
        :key="i"
        :class="['log-entry', `log-${entry.level}`]"
      >
        <span class="log-time">{{ entry.time }}</span>
        <span class="log-text">{{ entry.text }}</span>
      </div>
      <div v-if="entries.length === 0" class="log-empty">No events yet</div>
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #8b949e;
}

.log-count {
  font-size: 11px;
  color: #484f58;
}

.log-container {
  height: 280px;
  overflow-y: auto;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.log-entry:hover {
  background: #21262d;
}

.log-time {
  color: #484f58;
  flex-shrink: 0;
}

.log-text {
  word-break: break-word;
}

.log-info .log-text {
  color: #8b949e;
}

.log-success .log-text {
  color: #7ee787;
}

.log-warn .log-text {
  color: #d29922;
}

.log-error .log-text {
  color: #f85149;
}

.log-empty {
  color: #484f58;
  text-align: center;
  padding: 40px 0;
}

/* Scrollbar */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #0d1117;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
