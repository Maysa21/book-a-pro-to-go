import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PHOTO_BUCKET } from "@/lib/business-photos";
import { cn } from "@/lib/utils";
import { getPublishedPhotoUrl } from "@/lib/business-photo-url.functions";

export function BusinessPhoto({ path, preview, name, emoji, className }: {
  path: string | null; preview?: string | null; name: string; emoji: string; className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { data: url } = useQuery({
    queryKey: ["business-photo", path],
    enabled: !!path && !preview,
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
      const res = await getPublishedPhotoUrl({ data: { path } });
      return res.url;
    },
  });
  const src = preview || url;
  return (
    <div className={cn("grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg bg-accent text-5xl", className)}>
      {src && src !== failedUrl ? (
        <img src={src} alt={`Foto de ${name || "seu estabelecimento"}`} className="h-full w-full object-cover" onError={() => setFailedUrl(src)} />
      ) : <span aria-label={name}>{emoji}</span>}
    </div>
  );
}