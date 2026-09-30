import { randomBytes } from "node:crypto";

// Ids públicos con prefijo y 128 bits aleatorios en hexadecimal: pi_…, evt_…, req_… (ADR-004, T9).
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}
