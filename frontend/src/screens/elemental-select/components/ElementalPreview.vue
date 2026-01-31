<script setup lang="ts">
import type { ElementalData } from '../../../types/game-data'

defineProps<{
  elemental: ElementalData
}>()
</script>

<template>
  <div class="preview-backdrop">
    <div class="preview-icon-container">
      <img
        class="preview-icon"
        :src="elemental.display_data.icon_url"
        :alt="elemental.name"
      />
      <div class="preview-glow"></div>
    </div>
    <h2 class="preview-name">{{ elemental.name }} Elemental</h2>
  </div>
</template>

<style scoped>
.preview-backdrop {
  width: 260px;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  z-index: 0;
  pointer-events: none;
}

.preview-icon-container {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-icon {
  width: 160px;
  height: 160px;
  object-fit: contain;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
  position: relative;
  z-index: 1;
}

.preview-glow {
  position: absolute;
  inset: -40px;
  background: radial-gradient(
    circle at center,
    color-mix(in srgb, var(--theme-color) 40%, transparent) 0%,
    transparent 70%
  );
  filter: blur(30px);
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.preview-name {
  font-size: 28px;
  font-weight: 600;
  color: var(--palette-text-primary);
  margin: 0;
  text-align: center;
}
</style>
