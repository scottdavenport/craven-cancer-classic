// TODO: Implement useUnsavedChanges hook (Sprint 21 · #236)
// Bolt: implement this hook so it:
//   - attaches a window beforeunload listener when isDirty=true
//   - calls event.preventDefault() and sets event.returnValue in the handler
//   - removes the listener when isDirty becomes false or component unmounts
export function useUnsavedChanges(_isDirty: boolean): void {
  // stub — not implemented
}
