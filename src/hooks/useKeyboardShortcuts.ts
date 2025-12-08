import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  handler: () => void;
  preventDefault?: boolean;
}

/**
 * Custom hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in input fields, textareas, or contentEditable elements
      // UNLESS the shortcut has a modifier key (Ctrl, Alt, Meta)
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          // Skip shortcuts without modifiers when user is typing in input fields
          const hasModifier = shortcut.ctrl || shortcut.alt || shortcut.meta;
          if (isInputField && !hasModifier) {
            continue;
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push(navigator.platform.includes('Mac') ? '⇧' : 'Shift');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
}

/**
 * Common keyboard shortcuts used across the app
 */
export const COMMON_SHORTCUTS = {
  NEW_NOTE: { key: 'n', ctrl: true, description: 'Nouvelle note' },
  SEARCH: { key: 'k', ctrl: true, description: 'Rechercher' },
  QUICK_CAPTURE: { key: 'q', ctrl: true, description: 'Capture rapide' },
  TOGGLE_SIDEBAR: { key: 'b', ctrl: true, description: 'Basculer sidebar' },
  SAVE: { key: 's', ctrl: true, description: 'Sauvegarder' },
  CLOSE: { key: 'Escape', description: 'Fermer' },
  HELP: { key: '?', shift: true, description: 'Aide raccourcis' },
  ARCHIVE: { key: 'e', ctrl: true, description: 'Archiver note' },
  DELETE: { key: 'Delete', ctrl: true, description: 'Supprimer' },
  NEXT: { key: 'j', description: 'Suivant' },
  PREVIOUS: { key: 'k', description: 'Précédent' },
  TOGGLE_TODO: { key: 'Enter', ctrl: true, description: 'Toggle todo' },
  BOLD: { key: 'b', ctrl: true, description: 'Gras' },
  ITALIC: { key: 'i', ctrl: true, description: 'Italique' },
  LINK: { key: 'k', ctrl: true, shift: true, description: 'Lien' },
};
