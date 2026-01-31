import { defineAsyncComponent } from 'vue'
import type { ScreenDefinition } from '../types'

export const playScreenDef: ScreenDefinition = {
  id: 'play',
  component: defineAsyncComponent(() => import('./PlayScreen.vue')),

  activateWhen: (state) => state.phase === 'menu',

  priority: 0,

  exit: {
    duration: 300,
    animation: 'fade'
  }
}
