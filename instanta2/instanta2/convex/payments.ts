import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";


/************************Functions to create payments, buttons and users**********************************/

/**
 * Creates a new payment button with secure details stored on the backend.
 * This would typically be called from your merchant dashboard.
 */
export const createButton = mutation({
  args: {
    // In a real app, you would get the userId from the authentication context
    // ctx.auth.getUserIdentity(), but for testing we'll pass it in.
    userId: v.id("users"), 
    amount: v.number(),
    toAddress: v.string(),
    currency: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert the secure button details into the 'buttons' table
    const buttonId = await ctx.db.insert("buttons", {
      userId: args.userId,
      amount: args.amount,
      toAddress: args.toAddress,
      currency: args.currency,
      title: args.title,
    });
    return buttonId;
  },
});


/**
 * Creates a new payment record from a public buttonId.
 * This is the secure function the payment widget will call.
 */
export const createPayment = mutation({
    args: {
        buttonId: v.id("buttons"),
        paymentId: v.string(), // The client-side generated 'pay_...' ID
    },
    handler: async (ctx, args) => {
        // 1. Find the button in the database using the ID from the client
        const button = await ctx.db.get(args.buttonId);

        if (!button) {
            throw new Error("Button not found. Cannot process payment.");
        }

        // 2. Create the payment record with an initial "pending" status
        // Notice we are using the button's data, not the client's.
        await ctx.db.insert("payments", {
            buttonId: args.buttonId,
            userId: button.userId,
            paymentId: args.paymentId,
            status: "pending",
        });

        // 3. Return the secure details to be used by the payment widget
        // The client never knew this information until now.
        return {
            amount: button.amount,
            toAddress: button.toAddress,
            currency: button.currency,
            title: button.title,
        }
    },
});

// We also need a way to create a user for testing
export const createUser = mutation({
    args: {
        email: v.string(),
        userId: v.string(), // This would be the Clerk ID
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("users", {
            email: args.email,
            userId: args.userId,
        });
    },
});

/************************Functions to create payments, buttons and users**********************************/
