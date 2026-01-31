import type { InjectionKey } from 'vue'
import type { ScreenFlowContext } from './screens/types'

/**
 * Typed injection keys for Vue provide/inject.
 * Using InjectionKey<T> gives type inference at inject() sites
 * and clearer errors if the key isn't provided.
 */

/** Interface for matchmaking transport functions */
export interface MatchmakingContext {
  startMatchmaking: () => void
  cancelMatchmaking: () => void
  sendPing: () => void
  cleanup: () => void
}

/** Key for injecting matchmaking transport */
export const matchmakingKey: InjectionKey<MatchmakingContext> = Symbol('matchmaking')

/** Key for injecting screen flow context */
export const screenFlowKey: InjectionKey<ScreenFlowContext> = Symbol('screenFlow')
