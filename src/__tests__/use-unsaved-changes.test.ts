// RED: useUnsavedChanges hook — #236
// Fails until Bolt creates src/hooks/use-unsaved-changes.ts
// The hook must export useUnsavedChanges(isDirty: boolean): void
// and attach/detach a beforeunload listener based on the dirty flag.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

describe("useUnsavedChanges hook", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports a useUnsavedChanges function", () => {
    expect(typeof useUnsavedChanges).toBe("function");
  });

  it("attaches a beforeunload listener when isDirty=true", () => {
    renderHook(() => useUnsavedChanges(true));
    const calls = (addEventListenerSpy.mock.calls as [string, ...unknown[]][]).filter(
      (args) => args[0] === "beforeunload"
    );
    expect(calls.length).toBeGreaterThan(0);
  });

  it("does NOT attach a beforeunload listener when isDirty=false", () => {
    renderHook(() => useUnsavedChanges(false));
    const calls = (addEventListenerSpy.mock.calls as [string, ...unknown[]][]).filter(
      (args) => args[0] === "beforeunload"
    );
    expect(calls.length).toBe(0);
  });

  it("calls event.preventDefault() and sets returnValue on beforeunload when dirty", () => {
    renderHook(() => useUnsavedChanges(true));

    // Find the registered beforeunload handler
    const beforeunloadCalls = (addEventListenerSpy.mock.calls as [string, EventListener, ...unknown[]][]).filter(
      (args) => args[0] === "beforeunload"
    );
    expect(beforeunloadCalls.length).toBeGreaterThan(0);

    const handler = beforeunloadCalls[0][1];
    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    handler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    // returnValue must be set (browsers use this for the dialog)
    expect(mockEvent.returnValue).not.toBe("");
  });

  it("removes the beforeunload listener on cleanup (unmount)", () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    unmount();

    const calls = (removeEventListenerSpy.mock.calls as [string, ...unknown[]][]).filter(
      (args) => args[0] === "beforeunload"
    );
    expect(calls.length).toBeGreaterThan(0);
  });

  it("removes the listener when isDirty transitions from true to false", () => {
    const { rerender } = renderHook(({ dirty }: { dirty: boolean }) =>
      useUnsavedChanges(dirty),
      { initialProps: { dirty: true } }
    );

    // Transition to clean
    rerender({ dirty: false });

    // removeEventListener should have been called for beforeunload
    const calls = (removeEventListenerSpy.mock.calls as [string, ...unknown[]][]).filter(
      (args) => args[0] === "beforeunload"
    );
    expect(calls.length).toBeGreaterThan(0);
  });
});
