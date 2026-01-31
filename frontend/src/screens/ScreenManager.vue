<script setup lang="ts">
import { provide } from 'vue'
import { useScreenFlow } from './useScreenFlow'
import { allScreens } from './index'
import { screenFlowKey } from '../injection-keys'

const { currentScreen, transitionDirection, screenFlowContext } = useScreenFlow(allScreens)

// Provide screen flow context to child screens
provide(screenFlowKey, screenFlowContext)
</script>

<template>
  <Transition
    :name="`screen-${transitionDirection}`"
    mode="out-in"
  >
    <component
      :is="currentScreen.component"
      :key="currentScreen.id"
    />
  </Transition>
</template>

<style>
/* Forward transitions (entering next phase) */
.screen-forward-enter-active,
.screen-forward-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.screen-forward-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.screen-forward-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Backward transitions (returning to previous phase) */
.screen-backward-enter-active,
.screen-backward-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.screen-backward-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.screen-backward-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Scale transition (for VS screen) */
.screen-scale-enter-active,
.screen-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.screen-scale-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.screen-scale-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

/* Fade transition */
.screen-fade-enter-active,
.screen-fade-leave-active {
  transition: opacity 0.3s ease;
}

.screen-fade-enter-from,
.screen-fade-leave-to {
  opacity: 0;
}
</style>
