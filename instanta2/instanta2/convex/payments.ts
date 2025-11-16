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

/************************Functions to get information from the database**********************************/

/**
 * Retrieves a user's information by their ID.
 */
export const getUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        return user;
    },
});

/**
 * Retrieves a button's secure information by its ID.
 */
export const getButton = query({
    args: { buttonId: v.id("buttons") },
    handler: async (ctx, args) => {
        const button = await ctx.db.get(args.buttonId);
        return button;
    },
});

/**
 * Retrieves a payment record by its client-generated paymentId.
 */
export const getPayment = query({
    args: { paymentId: v.string() },
    handler: async (ctx, args) => {
        // Use the 'by_paymentId' index to find the specific payment
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
            .unique();
        return payment;
    },
});

/**
 * Updates a payment's status and transaction hash.
 * This is called by the frontend widget as the transaction progresses.
 */
export const updatePayment = mutation({
    args: {
        paymentId: v.string(), // The client-side generated 'pay_...' ID
        txHash: v.optional(v.string()),
        status: v.union(
            v.literal("pending"),
            v.literal("confirmed"),
            v.literal("failed")
        ),
    },
    handler: async (ctx, args) => {
        // Find the payment document using its unique paymentId
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
            .unique();

        if (!payment) {
            throw new Error("Payment not found");
        }

        // Use patch to update only the specified fields
        await ctx.db.patch(payment._id, {
            status: args.status,
            txHash: args.txHash,
        });
    },
});

/**
 * Retrieves a user record by their Clerk user ID.
 * This is useful for checking if a user already exists in the database.
 */
export const getUserByUserId = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .unique();
        return user;
    },
});

/************************Functions to get information from the database**********************************/
