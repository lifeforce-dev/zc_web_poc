<script setup lang="ts">
import { useGameStore } from '../../stores/game'

const gameStore = useGameStore()
</script>

<template>
  <div class="game-screen">
    <div class="game-placeholder">
      <h1>Game UI</h1>
      <p>Game board will be rendered here</p>
      <p>Phase: {{ gameStore.phase }}</p>
      <p>Match ID: {{ gameStore.matchId }}</p>
    </div>
  </div>
</template>

<style scoped>
.game-screen {
  /*
    Designer Knobs:
    - Placeholder for future game UI layout
    - Will need: board size, sidebar widths, spacing
  */
  --content-padding: clamp(20px, 4vw, 40px);
  
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--content-padding);
  background: var(--palette-background-default);
}

.game-placeholder {
  text-align: center;
  color: var(--palette-text-secondary);
}

.game-placeholder h1 {
  font-size: clamp(32px, 6vw, 48px);
  color: var(--palette-success-main);
  margin: 0 0 20px 0;
}

.game-placeholder p {
  font-size: clamp(14px, 2vw, 18px);
  margin: 8px 0;
}
</style>
