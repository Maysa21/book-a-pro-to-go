import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "business-photos";
const extensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

export function validateBusinessPhoto(file: Pick<File, "type" | "size">) {
  if (!extensions[file.type]) throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A foto deve ter até 5 MB.");
  if (file.size === 0) throw new Error("Esta foto está vazia. Escolha outra.");
}

export async function uploadBusinessPhoto(ownerId: string, file: File) {
  validateBusinessPhoto(file);
  const path = `${ownerId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeBusinessPhoto(path: string) {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}