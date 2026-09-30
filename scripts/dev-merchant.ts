// Crea un comercio de pruebas con su cartera de cobro y le da una API key de test.
// Sirve para probar la API a mano mientras no existe el dashboard (fase 8).
// Uso: DATABASE_URL=… node scripts/dev-merchant.ts <email> <cartera 0x…>
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey } from "../lib/api-keys.ts";

const [email, payoutAddress] = process.argv.slice(2);
if (!email || !/^0x[0-9a-fA-F]{40}$/.test(payoutAddress ?? "")) {
  console.error("Uso: node scripts/dev-merchant.ts <email> <cartera 0x…>");
  process.exit(1);
}

const merchantId = newId("mer");
await sql`
  INSERT INTO merchants (id, clerk_user_id, email, name, payout_address)
  VALUES (${merchantId}, ${"dev_" + merchantId}, ${email}, 'Comercio de pruebas', ${payoutAddress})`;
const key = await createApiKey(merchantId, false);
await sql.end();

console.log(`Comercio: ${merchantId}`);
console.log(`API key (solo se muestra ahora): ${key}`);
