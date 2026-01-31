import { defineAsyncComponent } from 'vue'
import type { ScreenDefinition } from '../types'

export const gameScreenDef: ScreenDefinition = {
  id: 'game',
  component: defineAsyncComponent(() => import('./GameScreen.vue')),

  // Active when in-game OR when VS is complete
  activateWhen: (state) =>
    state.phase === 'in-game' ||
    (state.phase === 'vs-screen' && state.vsComplete),

  priority: 5,

  enter: {
    duration: 500,
    animation: 'slide-up'
  }
}
