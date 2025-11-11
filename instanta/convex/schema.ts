import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Este esquema define cómo se verán nuestros pagos en la base de datos
export default defineSchema({
  payments: defineTable({
    paymentId: v.string(),
    // Información básica del pago
    amount: v.number(), // Cuánto debe pagar el usuario
    currency: v.string(), // ETH, USDC, etc.
    toAddress: v.string(), // A qué dirección se envía el pago
    merchantId: v.string(), // Quién está cobrando
    
    // URLs y callbacks
    callbackUrl: v.string(), // Dónde enviamos el webhook
    checkoutUrl: v.optional(v.string()), // URL del checkout generada
    
    // Estado del pago (esto cambia conforme avanza el proceso)
    status: v.string(), // pending_wallet, pending_confirmation, confirmed, failed
    
    // Información de la blockchain
    txHash: v.optional(v.string()), // Hash de la transacción una vez enviada
    blockNumber: v.optional(v.number()), // En qué bloque se confirmó
    confirmations: v.number(), // Cuántas confirmaciones tiene (empieza en 0)
    requiredConfirmations: v.number(), // Cuántas confirmaciones requiere el merchant
    
    // Metadata flexible (puede contener lo que el merchant quiera)
    metadata: v.optional(v.any()),
    
    // Timestamps automáticos
    createdAt: v.number(),
    expiresAt: v.number(), // Los pagos expiran tras 15 minutos
    completedAt: v.optional(v.number()),
  })
    // Índices para buscar rápido (como índice de un libro)
    .index("by_merchant", ["merchantId"])
    .index("by_status", ["status"])
    .index("by_txHash", ["txHash"])
    .index("by_paymentId", ["paymentId"]),
});