import type { ScreenDefinition } from './types'
import { playScreenDef } from './play'
import { elementalSelectScreenDef } from './elemental-select'
import { vsScreenDef } from './vs'
import { gameScreenDef } from './game'

export const allScreens: ScreenDefinition[] = [
  playScreenDef,
  elementalSelectScreenDef,
  vsScreenDef,
  gameScreenDef,
]

export { default as ScreenManager } from './ScreenManager.vue'
export * from './types'
