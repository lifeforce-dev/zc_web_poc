<script setup lang="ts">
defineProps<{
  label: string
  variant: 'idle' | 'queueing' | 'matched' | 'ready' | 'disconnected'
}>()
</script>

<template>
  <span :class="['status-pill', `status-${variant}`]">{{ label }}</span>
</template>

<style scoped>
.status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.status-idle {
  background: var(--palette-status-idle-bg);
  color: var(--palette-text-secondary);
}

.status-queueing {
  background: var(--palette-status-queueing-bg);
  color: var(--palette-status-queueing-fg);
  animation: pulse 2s infinite;
}

.status-matched {
  background: var(--palette-status-matched-bg);
  color: var(--palette-status-matched-fg);
}

.status-ready {
  background: var(--palette-status-matched-bg);
  color: var(--palette-status-matched-fg);
  box-shadow: 0 0 8px rgba(126, 231, 135, 0.3);
}

.status-disconnected {
  background: var(--palette-status-error-bg);
  color: var(--palette-error-main);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
