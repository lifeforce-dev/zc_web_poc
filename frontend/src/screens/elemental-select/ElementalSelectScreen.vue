<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useGameStore, type ElementalType } from '../../stores/game'
import type { ElementalData, AbilityData } from '../../types/game-data'
import { matchmakingKey } from '../../injection-keys'
import ElementalGrid from './components/ElementalGrid.vue'
import ElementalPreview from './components/ElementalPreview.vue'
import ElementalDetails from './components/ElementalDetails.vue'

const gameStore = useGameStore()
const _matchmaking = inject(matchmakingKey)

if (!_matchmaking) {
  throw new Error('Matchmaking context not provided. Ensure App.vue provides matchmakingKey.')
}

const matchmaking = _matchmaking

const selectedElemental = ref<ElementalData | null>(null)
const abilities = computed(() => gameStore.gameData?.abilities || [])

const elementals = computed(() => {
  if (!gameStore.gameData) return []
  return gameStore.gameData.elementals
})

const primaryAbility = computed<AbilityData | undefined>(() => {
  if (!selectedElemental.value) return undefined
  return abilities.value.find(a => a.id === selectedElemental.value!.primary_ability_id)
})

function selectElemental(elemental: ElementalData): void {
  selectedElemental.value = elemental
  gameStore.selectElemental(elemental.id as ElementalType)
}

function handleReady(): void {
  if (!selectedElemental.value) return
  matchmaking.startMatchmaking()
}

onMounted(async () => {
  await gameStore.loadGameData()
})
</script>

<template>
  <div
    class="elemental-selection"
    :style="selectedElemental ? { '--theme-color': selectedElemental.color } : {}"
    :class="{ 'has-selection': selectedElemental }"
  >
    <!-- Themed background overlay -->
    <div v-if="selectedElemental" class="background-overlay"></div>

    <!-- Header -->
    <header class="header">
      <h1 class="title">Maelstrom</h1>
      <p class="subtitle">Select your elemental</p>
    </header>

    <div v-if="gameStore.gameDataLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading game data...</p>
    </div>

    <div v-else-if="gameStore.gameDataError" class="error">
      <p>Failed to load game data: {{ gameStore.gameDataError }}</p>
    </div>

    <template v-else>
      <!-- 3-column layout: preview | grid | details (responsive, normal flow) -->
      <div class="selection-layout" :class="{ 'has-selection': selectedElemental }">
        <!-- Left: Preview area -->
        <div class="layout-preview">
          <div v-if="selectedElemental" class="preview-entrance enter-anim-left">
            <div class="crossfade-stack">
              <Transition name="crossfade">
                <ElementalPreview
                  :key="selectedElemental.id"
                  :elemental="selectedElemental"
                />
              </Transition>
            </div>
          </div>
        </div>

        <!-- Center: Selection grid -->
        <div class="layout-grid">
          <ElementalGrid
            :elementals="elementals"
            :selected-id="selectedElemental?.id || null"
            @select="selectElemental"
          />
        </div>

        <!-- Right: Details panel -->
        <div class="layout-details">
          <div v-if="selectedElemental" class="details-entrance enter-anim-right">
            <div class="details-shell">
              <div class="crossfade-stack">
                <Transition name="crossfade">
                  <ElementalDetails
                    :key="selectedElemental.id"
                    :elemental="selectedElemental"
                    :primary-ability="primaryAbility"
                  />
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Footer -->
    <footer class="footer">
      <button
        class="btn-ready"
        :disabled="!selectedElemental"
        @click="handleReady"
      >
        Ready
      </button>
    </footer>
  </div>
</template>

<style scoped>
.elemental-selection {
  --theme-color: var(--palette-primary-main);
  
  /*
    Designer knobs (responsive layout):
    - Column widths use clamp() for fluid scaling with min/max bounds.
    - Gap controls spacing between columns.
    - These won't break animations since layout is in normal flow.
  */
  --layout-preview-width: clamp(200px, 20vw, 300px);
  --layout-details-width: clamp(240px, 22vw, 320px);
  --layout-gap: clamp(24px, 4vw, 60px);
  
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 40px clamp(16px, 4vw, 60px);
  overflow: hidden;
}

/* Background overlay that fades in with theme color */
.background-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 20% 50%,
    color-mix(in srgb, var(--theme-color) 15%, transparent) 0%,
    transparent 60%
  );
  pointer-events: none;
  animation: fadeIn 0.5s ease-out;
  transition: background 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.title {
  font-size: 48px;
  font-weight: 700;
  color: var(--palette-brand-gold);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 4px;
  text-shadow: 0 2px 10px rgba(212, 168, 85, 0.3);
}

.subtitle {
  font-size: 18px;
  color: var(--palette-brand-orange);
  margin: 8px 0 0 0;
  letter-spacing: 1px;
}

/* Loading/Error states */
.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  color: var(--palette-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--palette-divider);
  border-top-color: var(--palette-primary-main);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error p {
  color: var(--palette-error-main);
}

/* ============================================
   3-COLUMN RESPONSIVE LAYOUT
   
   Desktop: [preview] [grid] [details]
   Tablet:  [grid] with preview/details stacked or hidden
   Mobile:  single column stack
   ============================================ */

.selection-layout {
  flex: 1;
  display: grid;
  /* Default: single centered column (no selection) */
  grid-template-columns: 1fr;
  grid-template-areas: "grid";
  gap: var(--layout-gap);
  align-items: start;
  justify-items: center;
  position: relative;
  z-index: 1;
}

/* When elemental is selected: expand to 3-column layout */
.selection-layout.has-selection {
  grid-template-columns: var(--layout-preview-width) 1fr var(--layout-details-width);
  grid-template-areas: "preview grid details";
  justify-items: stretch;
}

/* Left column: preview (vertically centered) */
.layout-preview {
  grid-area: preview;
  display: none; /* Hidden until selection */
  align-items: center;
  justify-content: center;
  min-height: 300px;
  align-self: center;
}

.selection-layout.has-selection .layout-preview {
  display: flex;
}

/* Center column: selection grid */
.layout-grid {
  grid-area: grid;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 20px;
}

/* Right column: details panel */
.layout-details {
  grid-area: details;
  display: none; /* Hidden until selection */
  align-items: flex-start;
  justify-content: flex-start;
}

.selection-layout.has-selection .layout-details {
  display: flex;
}

/* Details entrance animation wrapper. */
.details-entrance {
  will-change: transform, opacity;
}

/* Details visual container (panel). */
.details-shell {
  width: 100%;
  min-height: 200px;
  background: rgba(22, 27, 34, 0.9);
  border: 1px solid var(--palette-divider);
  border-radius: 12px;
  padding: 24px;
}

/* ============================================
   RESPONSIVE BREAKPOINTS
   ============================================ */

/* Tablet/Medium: hide preview, show grid + details side-by-side.
   Preview is a luxury for large screens (1200px+). */
@media (max-width: 1200px) {
  .selection-layout.has-selection {
    grid-template-columns: 1fr var(--layout-details-width);
    grid-template-areas: "grid details";
  }
  
  .selection-layout.has-selection .layout-preview {
    display: none;
  }
}

/* Mobile: single column stack */
@media (max-width: 768px) {
  .selection-layout.has-selection {
    grid-template-columns: 1fr;
    grid-template-areas:
      "grid"
      "details";
    gap: 24px;
  }
  
  .selection-layout.has-selection .layout-preview {
    display: none;
  }
  
  .selection-layout.has-selection .layout-details {
    justify-content: center;
  }
  
  .details-shell {
    max-width: 100%;
  }
}

/* Footer */
.footer {
  text-align: center;
  margin-top: 40px;
  position: relative;
  z-index: 1;
}

.btn-ready {
  padding: 14px 56px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--palette-background-default);
  background: var(--palette-success-main);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-ready:hover:not(:disabled) {
  background: var(--palette-success-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(63, 185, 80, 0.4);
}

.btn-ready:disabled {
  background: var(--palette-divider);
  color: var(--palette-text-disabled);
  cursor: not-allowed;
}

/* ============================================
   ANIMATIONS - Separated concerns
   
   1. Container entrance: One-time slide-in when container first appears
   2. Content crossfade: Simple opacity transition when content changes
   ============================================ */

/* === CONTAINER ENTRANCE ANIMATIONS (one-time, on mount) === */

/* Preview entrance animation wrapper. */
.preview-entrance {
  will-change: transform, opacity;
}

.enter-anim-left {
  animation: enterFromLeft 0.35s ease-out;
}

.enter-anim-right {
  animation: enterFromRight 0.35s ease-out;
}

@keyframes enterFromLeft {
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes enterFromRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* === CONTENT CROSSFADE (on elemental change) === */

/* Grid stacking: both old and new content occupy same space during transition */
.crossfade-stack {
  display: grid;
}

.crossfade-stack > * {
  grid-area: 1 / 1;
}

/* Simple crossfade transition */
.crossfade-enter-active,
.crossfade-leave-active {
  transition: opacity 0.4s ease;
}

.crossfade-enter-from,
.crossfade-leave-to {
  opacity: 0;
}
</style>
