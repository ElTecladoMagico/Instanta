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

// Al escribir importes, usar siempre numeric(importe). El driver envía los bigint de JS como int8,
// que no pasa de 2^63 (≈ 9,2 ETH en wei); así se envían como NUMERIC y cabe cualquier uint256.
export const numeric = (value: bigint) => sql.typed.numeric(value);
