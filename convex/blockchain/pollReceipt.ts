import { internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Polls the blockchain to check if a transaction has been confirmed.
 * This is an internal action so it can only be called by cron jobs.
 * 
 * How it works:
 * 1. Takes a txHash (transaction hash)
 * 2. Calls the RPC endpoint to get the transaction receipt
 * 3. Returns the status and block number if found
 */
export default internalAction({
  args: {
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get RPC URL from environment variables
      // For Base Sepolia, you can use public RPCs or Alchemy/Infura
      const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://sepolia.base.org";
      
      // Make RPC call to get transaction receipt
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionReceipt",
          params: [args.txHash],
          id: 1,
        }),
      });

      const data = await response.json();
      
      // If receipt doesn't exist yet, transaction is still pending
      if (!data.result) {
        return { found: false };
      }

      const receipt = data.result;
      
      // Check if transaction was successful
      // status: "0x1" means success, "0x0" means failed
      const isSuccess = receipt.status === "0x1";
      const blockNumber = parseInt(receipt.blockNumber, 16);

      return {
        found: true,
        isSuccess,
        blockNumber,
        txHash: args.txHash,
      };
    } catch (error) {
      console.error("Error polling receipt:", error);
      return { found: false, error: String(error) };
    }
  },
});

