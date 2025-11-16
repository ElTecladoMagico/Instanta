// every user has a collection of buttons
// every button has a collection of payments
import { mutation } from "./_generated/server"; // mutation is a an action that can be performed in the database
import { v } from "convex/values"; // v is a validator for the arguments of the mutation

// Data for each payment is going to be the following:
// paymentId: string
// amount: number
// currency: string
// toAddress: string          This is the wallet address of the person who is receiving the payment
// merchantId: string         This is the id of the merchant who is creating the button
// callbackUrl: string        This is the url that will be called when the payment is confirmed
// status: string             This is the status of the payment
// txHash: string             This is the hash of the transaction that is being confirmed
// blockNumber: number        This is the number of the block that the transaction is being confirmed in
// createdAt: number          This is the date and time when the payment was created
// completedAt: number        This is the date and time when the payment was completed
// expiresAt: number          This is the date and time when the payment will expire
export const createPayment = mutation({
    args: {
        paymentId: v.string(),
        amount: v.number(),
        currency: v.string(),
        toAddress: v.string(),
        merchantId: v.string(),
        callbackUrl: v.string(),
        status: v.string(),
        txHash: v.string(),
        blockNumber: v.number(),
        createdAt: v.number(),
        completedAt: v.number(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        console.log("Creating payment...", args);
        // Pongo solo las variables para el pago, las otras variables van a otras tablas para no llenar la tabla de payments con variables que no son relevantes para el pago
        await ctx.db.insert(
            "payments",
            {
                paymentId: args.paymentId,
                amount: args.amount,
                currency: args.currency,
                toAddress: args.toAddress,
                merchantId: args.merchantId,
                callbackUrl: args.callbackUrl,
            }
        );
    },
});



// Indexing for the payments collection is going to be the following:
// by_merchant: [merchantId]
// by_status: [status]
// by_paymentId: [paymentId]
// by_txHash: [txHash]
// by_createdAt: [createdAt]
// by_expiresAt: [expiresAt]
// by_completedAt: [completedAt]
// by_toAddress: [toAddress]