import { createHash, randomBytes } from "node:crypto";

// Ids públicos con prefijo y 128 bits aleatorios en hexadecimal: pi_…, evt_…, req_… (ADR-004, T9).
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

// Hash de los secretos que no se guardan en claro (API keys, client_secret).
// SHA-256 basta (no hace falta bcrypt): son valores aleatorios largos, no contraseñas que adivinar.
export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
