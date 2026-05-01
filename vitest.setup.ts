import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  // Remove any portal nodes (e.g. base-ui Select popups) that React portals into
  // document.body and that may persist after cleanup due to animation state in jsdom.
  document.body.innerHTML = "";
});
