/**
 * S10-5 RED phase: Assert that deleteTeam is no longer exported from
 * src/app/admin/registrations/actions.ts once Bolt moves it to teams/actions.ts.
 *
 * This test FAILS against main because deleteTeam is still exported from
 * registrations/actions.ts. It should turn green after Bolt's implementation.
 */

import { describe, it, expect } from "vitest";
import * as registrationsActions from "@/app/admin/registrations/actions";

describe("registrations/actions.ts post-S10-5", () => {
  it("no longer exports deleteTeam (moved to teams/actions)", () => {
    expect((registrationsActions as any).deleteTeam).toBeUndefined();
  });
});
