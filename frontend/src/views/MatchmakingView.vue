<script setup lang="ts">
import { onMounted } from 'vue'
import { useMatchmaking } from '../composables/useMatchmaking'
import SessionPanel from '../components/SessionPanel.vue'
import EventLog from '../components/EventLog.vue'

const {
  playerName,
  state,
  logEntries,
  phaseDisplay,
  canPing,
  findMatch,
  sendPing,
} = useMatchmaking()

onMounted(() => {
  findMatch()
})
</script>

<template>
  <div class="matchmaking-view">
    <SessionPanel
      v-model:playerName="playerName"
      :state="state"
      :phase-display="phaseDisplay"
      :can-ping="canPing"
      @find-match="findMatch"
      @ping="sendPing"
    />

    <EventLog :entries="logEntries" />

    <footer class="footer">
      <span class="hint">
        TIP: Add <code>?wsBase=ws://127.0.0.1:8000</code> for local backend
      </span>
    </footer>
  </div>
</template>

<style scoped>
.matchmaking-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.footer {
  text-align: center;
  padding: 8px;
}

.hint {
  font-size: 12px;
  color: #484f58;
}

.hint code {
  background: #21262d;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  color: #8b949e;
}
</style>
