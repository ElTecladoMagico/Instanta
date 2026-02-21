import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Cron jobs for Instanta payment system
 * 
 * This file defines scheduled tasks that run automatically:
 * - checkPendingPayments: Runs every 5 seconds to check if pending payments are confirmed
 */
const crons = cronJobs();

// Check for confirmed payments every 5 seconds
crons.interval(
  "check pending payments",
  { seconds: 5 }, // Run every 5 seconds
  internal.blockchain.checkPendingPayments.default
);

export default crons;

