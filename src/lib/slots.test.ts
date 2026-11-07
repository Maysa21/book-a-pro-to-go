import { describe, expect, it } from "vitest";
import { availableSlots } from "./slots";

const base = { opensAt: "09:00", closesAt: "11:00", interval: 30, busy: [] };

describe("horários disponíveis", () => {
  it("serviço precisa terminar antes do fechamento", () => {
    expect(availableSlots({ ...base, duration: 60 })).toEqual(["09:00", "09:30", "10:00"]);
  });
  it("não sobrepõe agendamentos existentes", () => {
    const r = availableSlots({ ...base, duration: 30, busy: [{ start_time: "09:30:00", duration: 45 }] });
    expect(r).toEqual(["09:00", "10:30"]);
  });
  it("hoje só mostra horários futuros", () => {
    expect(availableSlots({ ...base, duration: 30, nowMinutes: 9 * 60 + 40 })).toEqual(["10:00", "10:30"]);
  });
});
