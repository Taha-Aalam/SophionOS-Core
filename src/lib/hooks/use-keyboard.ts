import { useEffect, useRef } from "react";

export function useKeyboardShortcut(
  predicate: (e: KeyboardEvent) => boolean,
  handler: () => void,
): void {
  const handlerRef = useRef(handler);
  const predicateRef = useRef(predicate);

  handlerRef.current = handler;
  predicateRef.current = predicate;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (predicateRef.current(e)) {
        e.preventDefault();
        handlerRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
