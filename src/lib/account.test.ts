import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), rpc: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: client }));
import { changeAccountType, saveAccountProfile } from "./account";

beforeEach(() => {
  vi.clearAllMocks();
  client.from.mockReturnValue(client);
  client.update.mockReturnValue(client);
  client.eq.mockReturnValue(client);
  client.select.mockReturnValue(client);
  client.single.mockResolvedValue({ data: { id: "owner-id" }, error: null });
  client.rpc.mockResolvedValue({ error: null });
});

describe("Account type switching", () => {
  it.each(["client", "professional"] as const)("allows switching to %s on the authenticated account", async (role) => {
    await changeAccountType(role);
    expect(client.rpc).toHaveBeenCalledWith("set_my_account_type", { _account_type: role });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rejects admin elevation", async () => {
    // @ts-expect-error Verify runtime validation for tampered input.
    await expect(changeAccountType("admin")).rejects.toThrow("Tipo de conta inválido.");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("reports a rejected role change", async () => {
    client.rpc.mockResolvedValue({ error: new Error("denied") });
    await expect(changeAccountType("professional")).rejects.toThrow("denied");
  });
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