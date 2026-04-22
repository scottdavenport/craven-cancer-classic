import { useEffect } from "react";

/**
 * useUnsavedChanges — attaches a `beforeunload` listener when `isDirty` is true,
 * preventing accidental navigation away from a form with unsaved changes.
 * Cleans up the listener on unmount or when `isDirty` transitions to false.
 *
 * @param isDirty - whether the form has unsaved changes
 */
export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}
