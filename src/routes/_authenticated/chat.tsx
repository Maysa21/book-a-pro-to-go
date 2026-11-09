import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Search = { b?: string | undefined; c?: string | undefined };

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    b: typeof s["b"] === "string" ? s["b"] : undefined,
    c: typeof s["c"] === "string" ? s["c"] : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Chat — AgendaFácil" },
      { name: "description", content: "Converse com o profissional ou cliente, inclusive em emergências." },
      { property: "og:title", content: "Chat — AgendaFácil" },
      { property: "og:description", content: "Converse com o profissional, inclusive em emergências." },
    ],
  }),
  component: ChatPage,
});

type Conv = { business_id: string; client_id: string; title: string; emoji: string; urgent: boolean; last: string };

function ChatPage() {
  const { user, role } = useAuth();
  const { b, c } = Route.useSearch();
  const isPro = role === "professional";
  const qc = useQueryClient();

  const { data: myBiz } = useQuery({
    queryKey: ["my-business-id", user?.id],
    enabled: !!user && isPro,
    queryFn: async () => (await supabase.from("businesses").select("id").eq("owner_id", user!.id).maybeSingle()).data,
  });

  const activeBiz = isPro ? myBiz?.id : b;
  const activeClient = isPro ? c : user?.id;

  const { data: convs = [] } = useQuery({
    queryKey: ["convs", user?.id, role, myBiz?.id],
    enabled: !!user && !!role && (!isPro || !!myBiz),
    queryFn: async () => {
      const [{ data: msgs }, { data: bks }] = await Promise.all([
        supabase.from("messages").select("business_id, client_id, body, urgent, created_at").order("created_at", { ascending: false }),
        supabase.from("bookings").select("business_id, client_id"),
      ]);
      const map = new Map<string, Conv>();
      for (const m of msgs ?? []) {
        const k = `${m.business_id}|${m.client_id}`;
        const prev = map.get(k);
        if (!prev) map.set(k, { business_id: m.business_id, client_id: m.client_id, title: "", emoji: "", urgent: m.urgent, last: m.body });
        else if (m.urgent) prev.urgent = true;
      }
      for (const x of bks ?? []) {
        const k = `${x.business_id}|${x.client_id}`;
        if (!map.has(k)) map.set(k, { ...x, title: "", emoji: "", urgent: false, last: "" });
      }
      const list = [...map.values()];
      if (isPro) {
        const ids = list.map((l) => l.client_id);
        const { data: p } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
        list.forEach((l) => { l.title = p?.find((x) => x.id === l.client_id)?.full_name || "Cliente"; l.emoji = "👤"; });
      } else {
        const ids = list.map((l) => l.business_id);
        const { data: bz } = ids.length ? await supabase.from("businesses").select("id, name, emoji, owner_id").in("id", ids) : { data: [] };
        list.forEach((l) => { const z = bz?.find((x) => x.id === l.business_id); l.title = z?.name ?? "Profissional"; l.emoji = z?.emoji ?? "✨"; });
      }
      return list;
    },
  });

  const { data: bizInfo } = useQuery({
    queryKey: ["chat-biz", b],
    enabled: !!b && !isPro,
    queryFn: async () => (await supabase.from("businesses").select("id, name, emoji, owner_id").eq("id", b!).maybeSingle()).data,
  });

  const ready = !!activeBiz && !!activeClient;
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeBiz, activeClient],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("business_id", activeBiz!).eq("client_id", activeClient!).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`messages-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as { sender_id: string; urgent: boolean };
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["convs"] });
        if (m.sender_id !== user.id && m.urgent) toast.error("🚨 Nova mensagem de emergência!");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  const send = async (body: string, isUrgent: boolean) => {
    if (!ready || !body.trim()) return;
    const { error } = await supabase.from("messages").insert({ business_id: activeBiz!, client_id: activeClient!, sender_id: user!.id, body: body.trim(), urgent: isUrgent });
    if (error) { toast.error(error.message); return; }
    setText("");
    setUrgent(false);
    qc.invalidateQueries({ queryKey: ["messages", activeBiz, activeClient] });
    qc.invalidateQueries({ queryKey: ["convs"] });
  };

  const current = convs.find((x) => x.business_id === activeBiz && x.client_id === activeClient);
  const title = current?.title ?? bizInfo?.name ?? "Conversa";
  const noOwner = !isPro && bizInfo && !bizInfo.owner_id;

  return (
    <main className="mx-auto grid h-[calc(100dvh-8.5rem)]  gap-4 px-4 py-6">
      <aside className={cn("overflow-y-auto rounded-3xl border border-border bg-card p-3 shadow-soft", ready && "hidden md:block")}>
        <h2 className="px-2 py-2 text-xl font-semibold">Conversas</h2>
        {convs.length === 0 && <p className="px-2 text-sm text-muted-foreground">Nenhuma conversa ainda. Elas aparecem quando há um agendamento.</p>}
        {convs.map((cv) => {
          const on = cv.business_id === activeBiz && cv.client_id === activeClient;
          return (
            <Link key={cv.business_id + cv.client_id} to="/chat" search={isPro ? { c: cv.client_id } : { b: cv.business_id }}
              className={cn("flex items-center gap-3 rounded-2xl p-3 transition-colors", on ? "bg-accent" : "hover:bg-muted")}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-xl">{cv.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{cv.title}</p>
                <p className="truncate text-xs text-muted-foreground">{cv.last || "Iniciar conversa"}</p>
              </div>
              {cv.urgent && <span className="size-2.5 rounded-full bg-urgent animate-pulse-ring" />}
            </Link>
          );
        })}
      </aside>

      <section className={cn("flex min-h-0 flex-col rounded-3xl border border-border bg-card shadow-soft", !ready && "hidden md:flex")}>
        {!ready ? (
          <div className="grid flex-1 place-items-center text-center text-muted-foreground">
            <div><MessageCircle className="mx-auto size-10" /><p className="mt-2">Escolha uma conversa</p></div>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <Link to="/chat" className="text-sm text-muted-foreground md:hidden">←</Link>
                <h1 className="text-xl font-semibold">{title}</h1>
              </div>
              {!isPro && !noOwner && (
                <Button variant="urgent" size="sm" className="animate-pulse-ring" onClick={() => send("🚨 EMERGÊNCIA: preciso falar com você agora, por favor!", true)}>
                  <AlertTriangle /> Emergência
                </Button>
              )}
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {noOwner && <p className="rounded-2xl bg-muted p-3 text-center text-sm text-muted-foreground">Este espaço de demonstração ainda não tem um profissional conectado ao chat.</p>}
              {messages.length === 0 && !noOwner && <p className="text-center text-sm text-muted-foreground">Envie a primeira mensagem.</p>}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      m.urgent ? "bg-urgent text-urgent-foreground" : mine ? "bg-primary text-primary-foreground" : "bg-muted",
                      mine ? "rounded-br-sm" : "rounded-bl-sm",
                    )}>
                      {m.urgent && <p className="mb-0.5 flex items-center gap-1 text-xs font-bold uppercase"><AlertTriangle className="size-3" /> Urgente</p>}
                      <p>{m.body}</p>
                      <p className="mt-1 text-right text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text, urgent); }} className="flex items-center gap-2 border-t border-border p-3">
              <button type="button" onClick={() => setUrgent(!urgent)} aria-label="Marcar como urgente"
                className={cn("grid size-10 shrink-0 place-items-center rounded-full border-2", urgent ? "border-urgent bg-urgent text-urgent-foreground" : "border-border text-muted-foreground")}>
                <AlertTriangle className="size-4" />
              </button>
              <Input disabled={!!noOwner} value={text} onChange={(e) => setText(e.target.value)} placeholder={urgent ? "Mensagem urgente…" : "Escreva uma mensagem…"} className="h-10 rounded-full" />
              <Button type="submit" size="icon" className="size-10" disabled={!text.trim() || !!noOwner} aria-label="Enviar"><Send /></Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
