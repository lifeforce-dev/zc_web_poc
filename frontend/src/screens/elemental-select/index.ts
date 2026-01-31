import { defineAsyncComponent } from 'vue'
import type { ScreenDefinition } from '../types'

export const elementalSelectScreenDef: ScreenDefinition = {
  id: 'elemental-select',
  component: defineAsyncComponent(() => import('./ElementalSelectScreen.vue')),

  // Active during matchmaking (waiting) and elemental-select phases
  activateWhen: (state) =>
    state.phase === 'matchmaking' ||
    state.phase === 'elemental-select',

  priority: 0,

  enter: {
    duration: 400,
    animation: 'slide-up'
  },
  exit: {
    duration: 300,
    animation: 'fade'
  }
}
