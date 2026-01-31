import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { ScreenDefinition, ScreenEvalState, ScreenFlowContext } from './types'
import { useGameStore } from '../stores/game'

export interface UseScreenFlowReturn {
  /** Currently active screen definition */
  currentScreen: ComputedRef<ScreenDefinition>
  /** Is a transition in progress? */
  isTransitioning: Ref<boolean>
  /** Direction of transition (for CSS) */
  transitionDirection: Ref<'forward' | 'backward'>
  /** Context to provide to child screens */
  screenFlowContext: ScreenFlowContext
}

/**
 * Manages screen transitions based on game state.
 * Evaluates screen triggers, handles animation timing, queues transitions.
 */
export function useScreenFlow(screens: ScreenDefinition[]): UseScreenFlowReturn {
  const gameStore = useGameStore()

  // UI-only state (not in store - presentation concern)
  const vsComplete = ref(false)

  // Transition state
  const currentScreenId = ref<string>(screens[0]?.id ?? 'play')
  const isTransitioning = ref(false)
  const transitionDirection = ref<'forward' | 'backward'>('forward')
  const pendingScreenId = ref<string | null>(null)
  const screenActivatedAt = ref<number>(Date.now())

  // Build evaluation state from store + UI state
  const evalState = computed<ScreenEvalState>(() => ({
    phase: gameStore.phase,
    matchId: gameStore.matchId,
    vsComplete: vsComplete.value,
  }))

  // Derive target screen from current state
  const targetScreen = computed(() => {
    const matching = screens
      .filter(s => s.activateWhen(evalState.value))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    return matching[0] ?? screens[0]
  })

  // Current screen definition
  const currentScreen = computed(() =>
    screens.find(s => s.id === currentScreenId.value) ?? screens[0]
  )

  // React to target screen changes
  watch(targetScreen, async (next) => {
    if (!next || next.id === currentScreenId.value) return

    const current = currentScreen.value

    // Check minDisplayTime
    const elapsed = Date.now() - screenActivatedAt.value
    const minTime = current.minDisplayTime ?? 0

    if (elapsed < minTime) {
      // Queue and wait - will be processed when onScreenReady is called
      pendingScreenId.value = next.id
      return
    }

    // Check interruptibility
    if (isTransitioning.value && current.interruptible === false) {
      pendingScreenId.value = next.id
      return
    }

    await transitionTo(next)
  })

  async function transitionTo(screen: ScreenDefinition): Promise<void> {
    const current = currentScreen.value

    // Determine direction (simple heuristic: higher priority = forward)
    transitionDirection.value =
      (screen.priority ?? 0) >= (current.priority ?? 0) ? 'forward' : 'backward'

    isTransitioning.value = true

    // Wait for exit animation
    const exitDuration = current.exit?.duration ?? 0

    if (exitDuration > 0) {
      await sleep(exitDuration)
    }

    // Switch screen
    currentScreenId.value = screen.id
    screenActivatedAt.value = Date.now()

    // Wait for enter animation
    const enterDuration = screen.enter?.duration ?? 0

    if (enterDuration > 0) {
      await sleep(enterDuration)
    }

    isTransitioning.value = false

    // Process queue
    if (pendingScreenId.value) {
      const pending = screens.find(s => s.id === pendingScreenId.value)
      pendingScreenId.value = null

      if (pending && pending.activateWhen(evalState.value)) {
        await transitionTo(pending)
      }
    }
  }

  /**
   * Called by screen when its minimum display time is satisfied.
   * Processes any queued transition.
   */
  function onScreenReady(): void {
    if (pendingScreenId.value) {
      const pending = screens.find(s => s.id === pendingScreenId.value)
      pendingScreenId.value = null

      if (pending && pending.activateWhen(evalState.value)) {
        transitionTo(pending)
      }
    }
  }

  /**
   * Set VS complete state.
   * Called by VS screen when animation finishes.
   */
  function setVsComplete(value: boolean): void {
    vsComplete.value = value
  }

  // Reset vsComplete when returning to menu
  watch(() => gameStore.phase, (phase) => {
    if (phase === 'menu') {
      vsComplete.value = false
    }
  })

  // Context object to provide to child screens
  const screenFlowContext: ScreenFlowContext = {
    onScreenReady,
    get vsComplete() { return vsComplete.value },
    setVsComplete,
  }

  return {
    currentScreen,
    isTransitioning,
    transitionDirection,
    screenFlowContext,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
