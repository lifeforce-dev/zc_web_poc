import type { Component } from 'vue'
import type { GamePhase } from '../stores/game'

/**
 * Configuration for enter/exit animations.
 */
export interface TransitionConfig {
  /** Duration in milliseconds */
  duration: number
  /** CSS transition name (matches Vue <Transition> name prop) */
  animation: 'fade' | 'slide-up' | 'slide-down' | 'scale'
}

/**
 * State passed to screen trigger evaluation.
 * Derived from store + any UI-only state.
 */
export interface ScreenEvalState {
  phase: GamePhase
  matchId: string | null
  vsComplete: boolean
}

/**
 * Definition of a screen and when it should activate.
 */
export interface ScreenDefinition {
  /** Unique identifier */
  id: string

  /** Component to render */
  component: Component

  /**
   * Predicate: when should this screen be active?
   * Receives current game/UI state, returns true if this screen should show.
   */
  activateWhen: (state: ScreenEvalState) => boolean

  /**
   * Priority for conflict resolution.
   * When multiple screens match, highest priority wins.
   * Default: 0
   */
  priority?: number

  /**
   * Enter transition config.
   * Applied when this screen becomes active.
   */
  enter?: TransitionConfig

  /**
   * Exit transition config.
   * Applied when this screen is leaving.
   */
  exit?: TransitionConfig

  /**
   * Can this screen's exit be interrupted by a new screen request?
   * If false, transition queues until current screen completes.
   * Default: true
   */
  interruptible?: boolean

  /**
   * Minimum time (ms) this screen must display before allowing transition.
   * Useful for screens like VS reveal that need a minimum display time.
   * Default: 0
   */
  minDisplayTime?: number
}

/**
 * Return type from useScreenFlow composable.
 */
export interface ScreenFlowContext {
  /** Signal that current screen completed its minimum display time / animation */
  onScreenReady: () => void
  /** UI-only state: has VS animation completed? */
  vsComplete: boolean
  /** Set vsComplete state */
  setVsComplete: (value: boolean) => void
}
