import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Internal action that checks all pending payments and updates their status.
 * This runs every 5 seconds via the cron job.
 * 
 * Process:
 * 1. Query all payments with status "pending"
 * 2. For each payment, check if the transaction has been confirmed
 * 3. Update the payment status to "confirmed" or "failed"
 */
export default internalAction(async (ctx) => {
  // Get all pending payments directly from payments module
  const pendingPayments = await ctx.runQuery(internal.payments.getPendingPayments);
  
  // Check each pending payment
  for (const payment of pendingPayments) {
    if (!payment.txHash) continue; // Skip if no transaction hash yet
    
    // Poll the blockchain for this transaction
    const result = await ctx.runAction(internal.blockchain.pollReceipt.default, {
      txHash: payment.txHash,
    });
    
    // If transaction is confirmed, update the payment via payments module
    if (result.found) {
      await ctx.runMutation(internal.payments.updatePaymentFromBlockchain, {
        paymentId: payment._id,
        status: result.isSuccess ? "confirmed" : "failed",
      });
    }
  }
});

