import { query } from "./_generated/server";

// Esta función lista todos los pagos
// El decorador "query" le dice a Convex que es una lectura de datos
export const list = query({
  handler: async (ctx) => {
    // ctx.db.query es como hacer SELECT * FROM payments
    return await ctx.db.query("payments").collect();
  },
});