<script setup lang="ts">
import type { ElementalData, AbilityData } from '../../../types/game-data'

defineProps<{
  elemental: ElementalData
  primaryAbility: AbilityData | undefined
}>()
</script>

<template>
  <div class="details-content">
    <div class="details-header">
      <h3 class="details-title" :style="{ color: elemental.color }">
        {{ elemental.name }}
      </h3>
      <p class="details-description">{{ elemental.description }}</p>
    </div>

    <div class="details-abilities">
      <h4 class="section-label">Abilities</h4>
      <div v-if="primaryAbility" class="ability-item">
        <div class="ability-row">
          <img class="ability-icon" :src="primaryAbility.display_data.icon_url" :alt="primaryAbility.name" />
          <span class="ability-name" :style="{ color: elemental.color }">{{ primaryAbility.name }}</span>
        </div>
        <p class="ability-description">{{ primaryAbility.description }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.details-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.details-description {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--palette-text-secondary);
}

.section-label {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--palette-text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.details-abilities {
  display: flex;
  flex-direction: column;
}

.ability-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ability-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ability-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.ability-name {
  font-size: 15px;
  font-weight: 600;
}

.ability-description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--palette-text-secondary);
}
</style>
