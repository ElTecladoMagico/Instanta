// Proceso worker (ADR-003): repite una vuelta de lib/worker.ts cada 5 segundos hasta que lo paren.
// En la VPS lo arranca Docker Compose (servicio "worker"); en local: npm run worker.
import { sql } from "../lib/db.ts";
import { runOnce } from "../lib/worker.ts";

const INTERVAL_MS = 5_000;

let running = true;
process.on("SIGTERM", () => (running = false)); // docker compose stop / nuevo despliegue
process.on("SIGINT", () => (running = false)); // Ctrl+C en local

console.log("worker: arrancado");
while (running) {
  try {
    await runOnce();
  } catch (err) {
    console.error("worker: error en la vuelta, se reintenta en la siguiente", err); // p. ej. la BD caída un momento
  }
  await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
}
await sql.end();
console.log("worker: parado");
