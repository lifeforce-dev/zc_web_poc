<script setup lang="ts">
import type { ElementalData } from '../../../types/game-data'

defineProps<{
  elementals: ElementalData[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [elemental: ElementalData]
}>()
</script>

<template>
  <section class="selection-panel">
    <div class="elemental-grid">
      <button
        v-for="elemental in elementals"
        :key="elemental.id"
        class="elemental-card"
        :class="{ selected: selectedId === elemental.id }"
        :style="{ '--elemental-color': elemental.color }"
        @click="emit('select', elemental)"
      >
        <div class="card-icon-wrapper">
          <img
            class="card-icon"
            :src="elemental.display_data.icon_url"
            :alt="elemental.name"
          />
        </div>
        <span class="card-name">{{ elemental.name }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.selection-panel {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.elemental-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.elemental-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  width: 120px;
  background: rgba(22, 27, 34, 0.8);
  border: 2px solid var(--palette-divider);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.elemental-card:hover {
  border-color: var(--elemental-color);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.elemental-card.selected {
  border-color: var(--elemental-color);
  background: rgba(28, 33, 40, 0.9);
  box-shadow:
    0 0 0 1px var(--elemental-color),
    0 8px 32px color-mix(in srgb, var(--elemental-color) 30%, transparent);
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--palette-text-primary);
}
</style>
