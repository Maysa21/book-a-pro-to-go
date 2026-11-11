import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deleteAuthenticatedAccount } from "./delete-account.server";

function setup() {
  const list = vi.fn().mockResolvedValue({ data: [], error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn().mockReturnValue({ list, remove });
  const admin = { storage: { from }, auth: { admin: { deleteUser } } } as unknown as SupabaseClient<Database>;
  return { admin, list, remove, deleteUser };
}
describe("Self account deletion", () => {
  it("deletes only the authenticated identity after removing its photos", async () => {
    const { admin, list, remove, deleteUser } = setup();
    list.mockResolvedValueOnce({ data: [{ name: "photo.jpg" }], error: null });
    await deleteAuthenticatedAccount(admin, "caller-id");
    expect(remove).toHaveBeenCalledWith(["caller-id/photo.jpg"]);
    expect(deleteUser).toHaveBeenCalledWith("caller-id");
  });
  it("does not delete the account if photo cleanup fails", async () => {
    const { admin, list, deleteUser } = setup();
    list.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(deleteAuthenticatedAccount(admin, "caller-id")).rejects.toThrow();
    expect(deleteUser).not.toHaveBeenCalled();
  });
  it("reports Auth deletion failure instead of success", async () => {
    const { admin, deleteUser } = setup();
    deleteUser.mockResolvedValue({ error: new Error("failed") });
    await expect(deleteAuthenticatedAccount(admin, "caller-id")).rejects.toThrow();
  });
});