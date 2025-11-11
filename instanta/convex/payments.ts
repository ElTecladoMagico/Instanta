import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Esta función crea un nuevo pago
export const create = mutation({
  args: {
    amount: v.number(),
    currency: v.string(),
    toAddress: v.string(),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verificar si ya existe un pago con este ID
    const existing = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("paymentId"), args.paymentId))
      .first();
    
    if (existing) {
      // Si ya existe, retornar el existente
      return existing._id;
    }
    
    // Crear el nuevo pago
    const paymentDoc = await ctx.db.insert("payments", {
      paymentId: args.paymentId,
      amount: args.amount,
      currency: args.currency,
      toAddress: args.toAddress,
      status: "pending_wallet", // El usuario aún no ha conectado su wallet
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // Expira en 15 minutos
      confirmations: 0,
      requiredConfirmations: 1, // Por ahora requerimos 1 confirmación
    });
    
    console.log("Pago creado:", args.paymentId, "$" + args.amount);
    
    return paymentDoc;
  },
});

// Esta función obtiene un pago por su ID
export const get = query({
  args: {
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("paymentId"), args.paymentId))
      .first();
    
    return payment;
  },
});

// Esta función lista todos los pagos (útil para debugging)
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("payments").order("desc").take(100);
  },
});