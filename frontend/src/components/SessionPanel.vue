<script setup lang="ts">
import type { MatchState } from '../composables/useMatchmaking'
import StatusPill from './StatusPill.vue'

defineProps<{
  playerName: string
  state: MatchState
  phaseDisplay: { label: string; variant: 'idle' | 'queueing' | 'matched' | 'ready' | 'disconnected' }
  canPing: boolean
}>()

const emit = defineEmits<{
  'update:playerName': [value: string]
  findMatch: []
  ping: []
}>()
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <span class="panel-title">// SESSION</span>
      <StatusPill :label="phaseDisplay.label" :variant="phaseDisplay.variant" />
    </div>

    <div class="session-grid">
      <div class="field">
        <label class="field-label">PLAYER NAME</label>
        <input
          :value="playerName"
          class="field-input"
          spellcheck="false"
          @input="emit('update:playerName', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="field">
        <label class="field-label">MATCH ID</label>
        <div class="field-value mono">{{ state.matchId ?? '---' }}</div>
      </div>

      <div class="field">
        <label class="field-label">YOU</label>
        <div class="field-value">{{ state.you || '---' }}</div>
      </div>

      <div class="field">
        <label class="field-label">OPPONENT</label>
        <div class="field-value">{{ state.opponent || '---' }}</div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" @click="emit('findMatch')">
        <span class="btn-icon">&#9654;</span> Find Match
      </button>
      <button class="btn btn-secondary" :disabled="!canPing" @click="emit('ping')">
        <span class="btn-icon">&#8644;</span> Ping Opponent
      </button>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
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

.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #8b949e;
  text-transform: uppercase;
}

.field-input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  color: #f0f6fc;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.field-value {
  font-size: 14px;
  color: #f0f6fc;
  padding: 10px 0;
}

.field-value.mono {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  color: #7ee787;
}

.actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #21262d;
  background: #0d1117;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-icon {
  font-size: 11px;
}

.btn-primary {
  background: linear-gradient(180deg, #238636 0%, #2ea043 100%);
  color: #fff;
  border-color: rgba(240, 246, 252, 0.1);
}

.btn-primary:hover {
  background: linear-gradient(180deg, #2ea043 0%, #3fb950 100%);
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border-color: #30363d;
}

.btn-secondary:hover:not(:disabled) {
  background: #30363d;
  border-color: #8b949e;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
