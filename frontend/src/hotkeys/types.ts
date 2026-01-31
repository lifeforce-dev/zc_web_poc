/**
 * Hotkey system for global keyboard shortcuts.
 * 
 * Architecture:
 * - HotkeyDefinition: Describes a hotkey (key, action, description)
 * - useHotkeys: Composable that registers listeners and handles dispatch
 * - Hotkeys are defined in a central registry, not scattered across components
 */

export interface HotkeyDefinition {
  /** The key to listen for (e.g., 'F1', 'Escape', 'KeyD') */
  key: string
  /** Human-readable description for UI/help */
  description: string
  /** 
   * Modifier requirements. All specified modifiers must match.
   * Unspecified modifiers are ignored (won't block the hotkey).
   */
  modifiers?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
  /**
   * If true, hotkey works even when an input/textarea is focused.
   * Default: false (hotkeys are ignored when typing)
   */
  allowInInput?: boolean
}

/**
 * Registry of all hotkeys in the application.
 * Add new hotkeys here - keeps them discoverable and documented.
 */
export const HOTKEYS = {
  TOGGLE_DEBUG_SIDEBAR: {
    key: 'F1',
    description: 'Toggle debug sidebar',
    allowInInput: true,
  },
  // Future hotkeys:
  // TOGGLE_ZONE_OVERLAY: { key: 'F2', description: 'Toggle zone overlay' },
  // TOGGLE_TILE_IDS: { key: 'F3', description: 'Toggle tile ID display' },
} as const satisfies Record<string, HotkeyDefinition>

export type HotkeyId = keyof typeof HOTKEYS
