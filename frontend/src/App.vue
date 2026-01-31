<script setup lang="ts">
import { provide } from 'vue'
import { useGameStore } from './stores/game'
import { useMatchmaking } from './composables/useMatchmaking'
import { useHotkeys } from './hotkeys'
import { matchmakingKey } from './injection-keys'
import { ScreenManager } from './screens'
import SessionSidebar from './components/SessionSidebar.vue'

const gameStore = useGameStore()

// Instantiate matchmaking once at app level, provide to children
const matchmaking = useMatchmaking()
provide(matchmakingKey, matchmaking)

// Global hotkeys
useHotkeys({
  TOGGLE_DEBUG_SIDEBAR: () => gameStore.toggleDebugSidebar(),
})
</script>

<template>
  <div class="app">
    <SessionSidebar v-if="gameStore.showSidebar" />

    <main class="main-content">
      <ScreenManager />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: var(--typography-font-family);
  background: var(--palette-background-default);
  color: var(--palette-text-primary);
}

code {
  font-family: var(--typography-font-family-mono);
}

.app {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: auto;
}
</style>
