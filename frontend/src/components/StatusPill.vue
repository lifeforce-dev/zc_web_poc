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
  background: #21262d;
  color: #8b949e;
}

.status-queueing {
  background: #1f2937;
  color: #60a5fa;
  animation: pulse 2s infinite;
}

.status-matched {
  background: #1c2a1c;
  color: #7ee787;
}

.status-ready {
  background: #1c2a1c;
  color: #7ee787;
  box-shadow: 0 0 8px rgba(126, 231, 135, 0.3);
}

.status-disconnected {
  background: #2d1f1f;
  color: #f85149;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
