import { onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { HOTKEYS, type HotkeyId, type HotkeyDefinition } from './types'

type HotkeyHandler = () => void

/**
 * Composable for registering global hotkey handlers.
 * 
 * Usage:
 * ```ts
 * useHotkeys({
 *   TOGGLE_DEBUG_SIDEBAR: () => { showSidebar.value = !showSidebar.value }
 * })
 * ```
 * 
 * Handlers are automatically cleaned up when component unmounts.
 */
export function useHotkeys(handlers: Partial<Record<HotkeyId, HotkeyHandler>>): void {
  const instance = getCurrentInstance()

  function handleKeyDown(event: KeyboardEvent): void {
    // Check each registered hotkey
    for (const [id, handler] of Object.entries(handlers)) {
      const def = HOTKEYS[id as HotkeyId] as HotkeyDefinition

      if (!def || !handler) continue

      // Check if key matches (support both code and key for flexibility)
      const keyMatches = event.code === def.key || event.key === def.key
      if (!keyMatches) continue

      // Check modifiers if specified
      if (def.modifiers) {
        if (def.modifiers.ctrl !== undefined && event.ctrlKey !== def.modifiers.ctrl) continue
        if (def.modifiers.shift !== undefined && event.shiftKey !== def.modifiers.shift) continue
        if (def.modifiers.alt !== undefined && event.altKey !== def.modifiers.alt) continue
        if (def.modifiers.meta !== undefined && event.metaKey !== def.modifiers.meta) continue
      }

      // Check if we're in an input field
      if (!def.allowInInput) {
        const target = event.target as HTMLElement
        const tagName = target.tagName.toLowerCase()

        if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          continue
        }
      }

      // Prevent default browser behavior (e.g., F1 opening help)
      event.preventDefault()

      // Execute handler
      handler()
    }
  }

  // If we're in a component context, use lifecycle hooks
  if (instance) {
    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })
  } else {
    // If called outside component, attach immediately (e.g., in a module)
    window.addEventListener('keydown', handleKeyDown)
  }
}
