import { describe, it, expect } from "vitest";
import { HELP_ROUTES, helpContent } from "../../content/helpContent";

describe("helpContent", () => {
  for (const route of HELP_ROUTES) {
    it(`has a non-empty entry for ${route}`, () => {
      const entry = helpContent[route];
      expect(entry).toBeDefined();
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.intro.length).toBeGreaterThan(0);
      expect(entry.options.length).toBeGreaterThan(0);
      expect(entry.next.length).toBeGreaterThan(0);
      for (const option of entry.options) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(option.description.length).toBeGreaterThan(0);
      }
    });
  }
});
