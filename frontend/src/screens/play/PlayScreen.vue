<script setup lang="ts">
import { useGameStore } from '../../stores/game'

const gameStore = useGameStore()

function handlePlay(): void {
  // Transition to elemental select by changing phase
  gameStore.setPhase('elemental-select')
}
</script>

<template>
  <div class="main-menu">
    <div class="title-container">
      <div class="logo">
        <span class="logo-text">ZONECONTROL</span>
        <span class="version">WEB POC v0.1</span>
      </div>
    </div>

    <div class="menu-buttons">
      <button class="btn-play" @click="handlePlay">
        Play
      </button>
    </div>
  </div>
</template>

<style scoped>
.main-menu {
  /*
    Designer Knobs:
    - Logo and button sizing
    - Spacing between elements
    - Responsive behavior
  */
  --logo-font-size: clamp(32px, 6vw, 48px);
  --button-padding-x: clamp(48px, 10vw, 80px);
  --button-padding-y: clamp(16px, 2vw, 20px);
  --section-gap: clamp(40px, 8vw, 60px);
  
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: var(--section-gap);
  padding: clamp(20px, 4vw, 40px);
}

.title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: var(--logo-font-size);
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--palette-primary-main);
  text-shadow: 0 0 20px rgba(88, 166, 255, 0.5);
  text-align: center;
}

.version {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--palette-text-secondary);
  padding: 4px 12px;
  background: var(--palette-background-muted);
  border-radius: 12px;
  border: 1px solid var(--palette-divider);
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-play {
  padding: var(--button-padding-y) var(--button-padding-x);
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--palette-background-default);
  background: var(--palette-primary-main);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 20px rgba(88, 166, 255, 0.3);
}

.btn-play:hover {
  background: var(--palette-primary-light);
  box-shadow: 0 0 30px rgba(88, 166, 255, 0.5);
  transform: translateY(-2px);
}

.btn-play:active {
  transform: translateY(0);
}
</style>
