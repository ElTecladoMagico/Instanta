import postgres from "postgres";

// Una conexión (pool) por proceso.
// Los importes son NUMERIC(78,0) en la BD y bigint en JS, nunca number (ADR-007, ADR-013).
export const sql = postgres(process.env.DATABASE_URL as string, {
  types: {
    numeric: {
      to: 1700, // OID del tipo NUMERIC en Postgres
      from: [1700],
      serialize: (x: bigint) => x.toString(),
      parse: (x: string) => BigInt(x),
    },
  },
});
