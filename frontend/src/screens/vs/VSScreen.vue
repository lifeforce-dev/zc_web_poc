<script setup lang="ts">
import { onMounted, ref, computed, inject } from 'vue'
import { useGameStore } from '../../stores/game'
import { screenFlowKey } from '../../injection-keys'

const gameStore = useGameStore()
const screenFlow = inject(screenFlowKey)

if (!screenFlow) {
  throw new Error('ScreenFlow context not provided. Ensure ScreenManager provides screenFlowKey.')
}

const countdown = ref(5)

// Get elemental data from the store (backend is source of truth)
function getElementalData(elementalId: string | null) {
  if (!elementalId || !gameStore.gameData) return null
  return gameStore.gameData.elementals.find(e => e.id === elementalId) || null
}

const selectedElementalData = computed(() => getElementalData(gameStore.selectedElemental))
const opponentElementalData = computed(() => getElementalData(gameStore.opponentElemental))

const selectedElementalColor = computed(() => selectedElementalData.value?.color || '#58a6ff')
const opponentElementalColor = computed(() => opponentElementalData.value?.color || '#f85149')

const selectedElementalIcon = computed(() => selectedElementalData.value?.display_data.icon_url || null)
const opponentElementalIcon = computed(() => opponentElementalData.value?.display_data.icon_url || null)

onMounted(() => {
  const interval = setInterval(() => {
    countdown.value--

    if (countdown.value <= 0) {
      clearInterval(interval)
      // Signal that VS screen is complete - this allows transition to game screen
      screenFlow.setVsComplete(true)
      screenFlow.onScreenReady()
    }
  }, 1000)
})
</script>

<template>
  <div class="vs-screen">
    <div class="vs-container">
      <div class="player-side player-you">
        <div
          class="player-icon"
          :style="{ backgroundColor: selectedElementalColor }"
        >
          <img v-if="selectedElementalIcon" :src="selectedElementalIcon" :alt="gameStore.selectedElemental || ''" class="elemental-icon" />
          <span v-else>{{ gameStore.selectedElemental?.[0].toUpperCase() }}</span>
        </div>
        <div class="player-name">{{ gameStore.playerName }}</div>
        <div class="elemental-label" :style="{ color: selectedElementalColor }">{{ gameStore.selectedElemental }}</div>
      </div>

      <div class="vs-divider">
        <span class="vs-text">VS</span>
      </div>

      <div class="player-side player-opponent">
        <div
          class="player-icon"
          :style="{ backgroundColor: opponentElementalColor }"
        >
          <img v-if="opponentElementalIcon" :src="opponentElementalIcon" :alt="gameStore.opponentElemental || ''" class="elemental-icon" />
          <span v-else>?</span>
        </div>
        <div class="player-name">{{ gameStore.opponentName || 'Opponent' }}</div>
        <div class="elemental-label" :style="{ color: opponentElementalColor }">{{ gameStore.opponentElemental || 'Unknown' }}</div>
      </div>
    </div>

    <div class="countdown">
      <div class="countdown-label">Game Starting In</div>
      <div class="countdown-number">{{ countdown }}</div>
    </div>
  </div>
</template>

<style scoped>
.vs-screen {
  /*
    Designer Knobs:
    - Player card sizing and spacing
    - Countdown positioning
    - Responsive behavior
  */
  --player-icon-size: clamp(80px, 12vw, 120px);
  --player-gap: clamp(40px, 8vw, 80px);
  --vs-font-size: clamp(32px, 6vw, 48px);
  --countdown-font-size: clamp(48px, 8vw, 64px);
  
  min-height: 100vh;
  background: var(--palette-background-default);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 60px;
  padding: clamp(20px, 4vw, 40px);
}

.vs-container {
  display: flex;
  align-items: center;
  gap: var(--player-gap);
}

.player-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.player-icon {
  width: var(--player-icon-size);
  height: var(--player-icon-size);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--player-icon-size) * 0.6);
  font-weight: 700;
  color: var(--palette-background-default);
  box-shadow: 0 0 40px rgba(88, 166, 255, 0.4);
}

.elemental-icon {
  width: calc(var(--player-icon-size) * 0.67);
  height: calc(var(--player-icon-size) * 0.67);
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.player-name {
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 700;
  color: var(--palette-text-primary);
}

.elemental-label {
  font-size: clamp(14px, 2vw, 16px);
  font-weight: 500;
  text-transform: capitalize;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--player-icon-size);
  height: var(--player-icon-size);
}

.vs-text {
  font-size: var(--vs-font-size);
  font-weight: 700;
  color: var(--palette-primary-main);
  text-shadow: 0 0 30px rgba(88, 166, 255, 0.6);
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.countdown-label {
  font-size: clamp(14px, 2vw, 16px);
  font-weight: 600;
  color: var(--palette-text-secondary);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.countdown-number {
  font-size: var(--countdown-font-size);
  font-weight: 700;
  color: var(--palette-primary-main);
  text-shadow: 0 0 30px rgba(88, 166, 255, 0.5);
}

/* ============================================
   RESPONSIVE BREAKPOINTS
   ============================================ */

/* Mobile: stack players vertically */
@media (max-width: 600px) {
  .vs-container {
    flex-direction: column;
    gap: 24px;
  }
  
  .vs-divider {
    width: auto;
    height: auto;
    padding: 16px 0;
  }
}
</style>
