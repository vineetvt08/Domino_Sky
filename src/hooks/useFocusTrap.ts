import { useEffect, useRef } from 'react';

interface FocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Custom hook to trap keyboard focus within a modal or drawer container.
 *
 * Capabilities:
 * - Traps Tab and Shift+Tab navigation within the container.
 * - Dismisses dialog on Escape key.
 * - Restores focus to the triggering element when the dialog closes.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
}: FocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
        previouslyFocusedElement.current = null;
      }
      return;
    }

    // Save previous active element to restore later
    if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedElement.current = document.activeElement;
    }

    const container = containerRef.current;
    if (!container) return;

    // Focus first focusable element inside container
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
    if (focusableElements.length > 0) {
      focusableElements[0]?.focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const currentFocusables = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      );

      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = currentFocusables[0];
      const lastElement = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement || document.activeElement === container) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return containerRef;
}
