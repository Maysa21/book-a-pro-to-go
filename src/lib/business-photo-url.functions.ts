import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public photos of published establishments are signed server-side so storage
// read access can stay bound to each photo's owner.
export const getPublishedPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(1).max(300).regex(/^[0-9a-f-]{36}\/[\w-]+\.(jpg|png|webp)$/) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = data.path.split("/")[0] ?? "";
    const { data: biz } = await supabaseAdmin.from("businesses").select("id")
      .eq("photo_path", data.path).eq("published", true).eq("owner_id", owner).maybeSingle();
    if (!biz) return { url: null as string | null };
    const { data: signed, error } = await supabaseAdmin.storage.from("business-photos").createSignedUrl(data.path, 3600);
    if (error) return { url: null as string | null };
    return { url: signed.signedUrl as string | null };
  });
