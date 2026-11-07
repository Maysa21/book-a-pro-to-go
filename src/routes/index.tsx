import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Star, MapPin, ShieldAlert, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slots";
import hero from "@/assets/hero-studio.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgendaFácil — encontre e agende profissionais" },
      { name: "description", content: "Encontre profissionais de beleza, veja horários livres e agende em segundos." },
      { property: "og:title", content: "AgendaFácil — encontre e agende profissionais" },
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
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary" /> Horários em tempo real</span>
              <span className="flex items-center gap-1.5"><ShieldAlert className="size-4 text-urgent" /> Chat de emergência</span>
            </div>
          </div>
          <div className="relative">
            <img src={hero} alt="Estúdio aconchegante" width={1280} height={960} className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-soft" />
            <div className="absolute -bottom-5 left-5 rounded-2xl bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">Próximo horário livre</p>
              <p className="font-display text-xl font-semibold">Hoje, 15:30</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto  px-4 py-6">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-semibold">Profissionais em destaque</h2>
          <Link to="/auth" className="text-sm font-semibold text-primary">É profissional? Cadastre seu espaço →</Link>
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
