import { defineAsyncComponent } from 'vue'
import type { ScreenDefinition } from '../types'

export const vsScreenDef: ScreenDefinition = {
  id: 'vs',
  component: defineAsyncComponent(() => import('./VSScreen.vue')),

  // Active when matched and VS animation hasn't completed
  activateWhen: (state) => state.phase === 'vs-screen' && !state.vsComplete,

  // Higher priority than elemental-select - takes over when match found
  priority: 10,

  enter: {
    duration: 300,
    animation: 'scale'
  },
  exit: {
    duration: 300,
    animation: 'fade'
  },

  // Don't interrupt VS animation even if backend advances
  interruptible: false,

  // Must show for at least 3 seconds
  minDisplayTime: 3000
}
