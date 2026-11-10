import { describe, expect, it } from "vitest";
import { studioNavigation } from "./studio-navigation";

describe("Meu espaço navigation", () => {
  it("opens the creation form only after choosing create", () => {
    expect(studioNavigation("overview", { type: "create", hasBusiness: false })).toBe("create");
  });
  it("cannot open services before the establishment exists", () => {
    expect(studioNavigation("overview", { type: "open", hasBusiness: false })).toBe("overview");
  });
  it("returns to the establishment overview after creation", () => {
    expect(studioNavigation("create", { type: "saved", hasBusiness: true })).toBe("overview");
  });
  it("opens the created establishment and its services on selection", () => {
    expect(studioNavigation("overview", { type: "open", hasBusiness: true })).toBe("details");
  });
});