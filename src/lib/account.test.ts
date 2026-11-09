import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: client }));
import { saveAccountProfile } from "./account";

beforeEach(() => {
  vi.clearAllMocks();
  client.from.mockReturnValue(client);
  client.update.mockReturnValue(client);
  client.eq.mockReturnValue(client);
  client.select.mockReturnValue(client);
  client.single.mockResolvedValue({ data: { id: "owner-id" }, error: null });
});

describe("Self-account updates", () => {
  it("updates only the signed-in owner's name and phone, never roles", async () => {
    await saveAccountProfile("owner-id", " Maysa ", " 11999999999 ");
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.update).toHaveBeenCalledWith({ full_name: "Maysa", phone: "11999999999" });
    expect(client.eq).toHaveBeenCalledWith("id", "owner-id");
  });
  it("does not report success when the database rejects the update", async () => {
    client.single.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(saveAccountProfile("owner-id", "Maysa", "")).rejects.toThrow("denied");
  });
});