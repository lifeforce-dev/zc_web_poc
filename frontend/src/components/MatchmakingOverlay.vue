<script setup lang="ts">
import type { ElementalData } from '../types/game-data'

defineProps<{
  elemental: ElementalData
}>()

const emit = defineEmits<{
  cancel: []
}>()
</script>

<template>
  <Transition name="overlay-fade">
    <div class="matchmaking-overlay">
      <div class="search-content">
        <!-- Orbital loading animation -->
        <div class="orbital-container">
          <div class="orbital-ring">
            <div class="orbital-dot dot-1"></div>
            <div class="orbital-dot dot-2"></div>
            <div class="orbital-dot dot-3"></div>
          </div>
          <div class="orbital-center">
            <img
              :src="elemental.display_data.icon_url"
              :alt="elemental.name"
              class="search-icon"
            />
          </div>
        </div>
        
        <p class="search-text">Searching for opponent...</p>
        
        <button class="btn-cancel" @click="emit('cancel')">
          Cancel
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.matchmaking-overlay {
  /*
    Designer Knobs:
    - Orbital size and animation speed
    - Colors inherit from --theme-color (set by parent)
  */
  --orbital-size: 140px;
  --orbital-dot-size: 12px;
  --orbital-spin-duration: 3s;
  --icon-size: 48px;
  
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.search-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

/* Orbital animation container */
.orbital-container {
  position: relative;
  width: var(--orbital-size);
  height: var(--orbital-size);
}

.orbital-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  animation: orbitSpin var(--orbital-spin-duration) linear infinite;
}

.orbital-dot {
  position: absolute;
  width: var(--orbital-dot-size);
  height: var(--orbital-dot-size);
  background: var(--theme-color, var(--palette-primary-main));
  border-radius: 50%;
  box-shadow: 0 0 12px var(--theme-color, var(--palette-primary-main));
}

.dot-1 {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.dot-2 {
  bottom: 15%;
  left: 10%;
}

.dot-3 {
  bottom: 15%;
  right: 10%;
}

@keyframes orbitSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.orbital-center {
  position: absolute;
  inset: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 27, 34, 0.9);
  border-radius: 50%;
  border: 2px solid var(--theme-color, var(--palette-primary-main));
  box-shadow: 0 0 30px color-mix(in srgb, var(--theme-color) 30%, transparent);
}

.search-icon {
  width: var(--icon-size);
  height: var(--icon-size);
  object-fit: contain;
  filter: drop-shadow(0 0 8px var(--theme-color));
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.search-text {
  font-size: 20px;
  color: var(--palette-text-primary);
  letter-spacing: 1px;
  animation: textPulse 2s ease-in-out infinite;
}

@keyframes textPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.btn-cancel {
  padding: 12px 40px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  color: var(--palette-text-secondary);
  background: transparent;
  border: 1px solid var(--palette-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  color: var(--palette-text-primary);
  border-color: var(--palette-text-secondary);
  background: rgba(255, 255, 255, 0.05);
}

/* Overlay fade transition */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
