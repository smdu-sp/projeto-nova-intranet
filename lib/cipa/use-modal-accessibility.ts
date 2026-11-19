"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

/**
 * Gerencia acessibilidade de modais:
 * - Salva o elemento focado antes da abertura e restaura o foco ao fechar
 * - Prende a navegação Tab / Shift+Tab dentro do modal (focus trap)
 * - Trava o scroll da página e trata Escape / ArrowLeft / ArrowRight
 */
export function useModalAccessibility({
  isOpen,
  containerRef,
  onClose,
  onArrowLeft,
  onArrowRight,
}: UseModalAccessibilityOptions) {
  const onCloseRef = useRef(onClose);
  const onArrowLeftRef = useRef(onArrowLeft);
  const onArrowRightRef = useRef(onArrowRight);

  onCloseRef.current = onClose;
  onArrowLeftRef.current = onArrowLeft;
  onArrowRightRef.current = onArrowRight;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      const container = containerRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    };

    const timer = window.setTimeout(focusFirst, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (!isTextInput && e.key === "ArrowLeft" && onArrowLeftRef.current) {
        e.preventDefault();
        onArrowLeftRef.current();
        return;
      }

      if (!isTextInput && e.key === "ArrowRight" && onArrowRightRef.current) {
        e.preventDefault();
        onArrowRightRef.current();
        return;
      }

      if (e.key === "Tab") {
        const container = containerRef.current;
        if (!container) return;

        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !container.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !container.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef]);
}

