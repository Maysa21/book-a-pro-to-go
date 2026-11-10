import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage } }));
import { uploadBusinessPhoto, validateBusinessPhoto } from "./business-photos";

beforeEach(() => {
  vi.clearAllMocks();
  storage.from.mockReturnValue(storage);
  storage.upload.mockResolvedValue({ error: null });
});

describe("Establishment photo upload", () => {
  it("uploads the selected photo under its owner's folder", async () => {
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    const path = await uploadBusinessPhoto("owner-id", file);
    expect(path).toMatch(/^owner-id\/[\w-]+\.jpg$/);
    expect(storage.from).toHaveBeenCalledWith("business-photos");
    expect(storage.upload).toHaveBeenCalledWith(path, file, { contentType: "image/jpeg", upsert: false });
  });
  it("rejects an upload rejected by storage", async () => {
    storage.upload.mockResolvedValue({ error: new Error("denied") });
    await expect(uploadBusinessPhoto("owner-id", new File(["photo"], "photo.png", { type: "image/png" }))).rejects.toThrow("denied");
  });
  it("accepts images up to 5 MB and rejects larger files", () => {
    expect(() => validateBusinessPhoto({ type: "image/jpeg", size: 5 * 1024 * 1024 })).not.toThrow();
    expect(() => validateBusinessPhoto({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toThrow("5 MB");
  });
  it("rejects non-image files", () => {
    expect(() => validateBusinessPhoto({ type: "text/html", size: 10 })).toThrow("JPG, PNG ou WebP");
  });
});