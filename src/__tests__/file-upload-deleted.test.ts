// RED: Dead file deletion hygiene — #236
// Fails until Bolt deletes src/components/ui/file-upload.tsx
// Decision: locked by Forge. File is unused; gallery uses raw <Input type="file">.
// Wiring it in is out of scope. See plans/sprint-21-236-admin-design-slips.md Issue 7.
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../");
const DEAD_FILE = path.join(REPO_ROOT, "src/components/ui/file-upload.tsx");

describe("Dead file: src/components/ui/file-upload.tsx", () => {
  it("file-upload.tsx has been deleted from the codebase", () => {
    expect(
      fs.existsSync(DEAD_FILE),
      `Expected ${DEAD_FILE} to be deleted but it still exists. ` +
        "Decision: file is unused. Delete it. See plans/sprint-21-236-admin-design-slips.md Issue 7."
    ).toBe(false);
  });

  it("no source files import from @/components/ui/file-upload", () => {
    // Belt-and-suspenders: if the file was deleted but something still imports it,
    // the build would fail anyway, but this test surfaces it earlier with a clear message.
    // NOTE: sponsor-form.tsx currently imports FileUploadField from file-upload.
    // Bolt must remove that import (using a raw <Input type="file"> instead) as part of
    // this cleanup. Test files that vi.mock the module are excluded here — they'll
    // also need updating, but vi.mock on a deleted file doesn't break the build.
    const srcDir = path.join(REPO_ROOT, "src");

    function findSourceImports(dir: string): string[] {
      const hits: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        // Skip __tests__ directories — vi.mock on deleted file is non-breaking
        if (entry.isDirectory() && !["node_modules", ".next", "__tests__"].includes(entry.name)) {
          hits.push(...findSourceImports(fullPath));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.tsx") && !entry.name.endsWith(".test.ts")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          // Match actual import statements (not comments or vi.mock strings in test files)
          if (/^import\s+.*from\s+["'].*file-upload["']/m.test(content)) {
            hits.push(fullPath);
          }
        }
      }
      return hits;
    }

    const importingFiles = findSourceImports(srcDir);
    expect(
      importingFiles,
      `Found source files still importing file-upload (remove these imports): ${importingFiles.join(", ")}`
    ).toHaveLength(0);
  });
});
