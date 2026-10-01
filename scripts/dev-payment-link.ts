// Crea un payment link de test para un comercio, para probar el botón embebible (hasta que exista el dashboard).
// Uso: DATABASE_URL=… node scripts/dev-payment-link.ts <mer_…> "<título>" <importe en unidades mínimas> <usdc|eth>
// Ejemplo: 0,01 USDC → 10000;  0,0001 ETH → 100000000000000
import { sql } from "../lib/db.ts";
import { createPaymentLink } from "../lib/payment-links.ts";

const [merchantId, title, amount, currency] = process.argv.slice(2);
if (!merchantId || !title || !/^[1-9][0-9]*$/.test(amount ?? "") || (currency !== "usdc" && currency !== "eth")) {
  console.error('Uso: node scripts/dev-payment-link.ts <mer_…> "<título>" <importe> <usdc|eth>');
  process.exit(1);
}

const id = await createPaymentLink({ merchantId, livemode: false }, { title, amount: BigInt(amount), currency });
await sql.end();
console.log(`Payment link: ${id}`);
console.log(`<button data-instanta-link="${id}">${title}</button>`);
