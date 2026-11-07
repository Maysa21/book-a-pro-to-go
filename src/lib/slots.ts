export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};
export const toTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type Busy = { start_time: string; duration: number };

/**
 * Horários livres: dentro do expediente, o serviço inteiro precisa caber antes do fechamento,
 * não pode encostar em outro agendamento e, se for hoje, precisa ser no futuro.
 */
export function availableSlots(opts: {
  opensAt: string;
  closesAt: string;
  interval: number;
  duration: number;
  busy: Busy[];
  nowMinutes?: number | null;
}): string[] {
  const open = toMin(opts.opensAt);
  const close = toMin(opts.closesAt);
  const busy = opts.busy.map((b) => [toMin(b.start_time), toMin(b.start_time) + b.duration] as const);
  const out: string[] = [];
  for (let s = open; s + opts.duration <= close; s += opts.interval) {
    if (opts.nowMinutes != null && s <= opts.nowMinutes) continue;
    const e = s + opts.duration;
    if (busy.some(([bs, be]) => s < be && bs < e)) continue;
    out.push(toTime(s));
  }
  return out;
}

export const brl = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
