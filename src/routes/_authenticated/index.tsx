import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Star, MapPin, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slots";
import { BusinessPhoto } from "@/components/BusinessPhoto";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Agende Já — encontre e agende profissionais" },
      { name: "description", content: "Encontre profissionais de beleza, veja horários livres e agende em segundos." },
      { property: "og:title", content: "Agende Já — encontre e agende profissionais" },
      { property: "og:description", content: "Veja horários livres e agende em segundos." },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*, services(price, active)")
        .eq("published", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const filtered = list.filter((b) =>
    `${b.name} ${b.category} ${b.location}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <main>
      <section className="bg-gradient-hero">
        <div className="mx-auto grid  items-center gap-6 px-4 py-6">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Sparkles className="size-3.5" /> Sem ligação, sem espera
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05]">
              Seu horário, <em className="text-primary">do seu jeito.</em>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Encontre profissionais perto de você, veja os horários livres e agende em segundos.
            </p>
            <div className="relative mt-8 max-w-md">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Unhas, barbearia, estética…"
                className="h-14 rounded-full bg-card pl-12 text-base shadow-soft"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto  px-4 py-6">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold">Profissionais em destaque</h2>
        </div>
        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Nenhum profissional encontrado.</p>
        ) : (
          <div className="mt-8 grid gap-5">
            {filtered.map((b, i) => {
              const prices = b.services.filter((s) => s.active).map((s) => Number(s.price));
              return (
                <Link
                  key={b.id}
                  to="/p/$id"
                  params={{ id: b.id }}
                  className="group animate-rise rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {b.photo_path && <BusinessPhoto path={b.photo_path} name={b.name} emoji={b.emoji} className="mb-4" />}
                  <div className="flex items-start justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl bg-accent text-3xl">{b.emoji}</span>
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm font-semibold">
                      <Star className="size-3.5 fill-primary text-primary" /> {Number(b.rating).toFixed(1)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{b.name}</h3>
                  <p className="text-sm text-muted-foreground">{b.category}</p>
                  {b.location && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {b.location}
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm">
                      {prices.length ? <>a partir de <strong>{brl(Math.min(...prices))}</strong></> : "Em breve"}
                    </span>
                    <Button size="sm" variant="ink" tabIndex={-1}>Agendar</Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
