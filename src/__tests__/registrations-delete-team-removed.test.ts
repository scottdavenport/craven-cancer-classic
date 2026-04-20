/**
 * S10-5 assertion: deleteTeam lives in teams/actions.ts (not the deleted
 * registrations/actions.ts). The registrations directory was removed in S11-1.
 */

import { describe, it, expect } from "vitest";
import * as teamsActions from "@/app/admin/teams/actions";

describe("teams/actions.ts post-S10-5", () => {
  it("exports deleteTeam (moved from registrations/actions.ts)", () => {
    expect(typeof (teamsActions as any).deleteTeam).toBe("function");
  });
});
