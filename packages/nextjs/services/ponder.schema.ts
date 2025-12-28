import { index, onchainTable } from "ponder";

// Goals table - stores all goals created
export const goal = onchainTable(
  "goal",
  t => ({
    id: t.bigint().primaryKey(),
    creator: t.hex().notNull(),
    stakeAmount: t.bigint().notNull(),
    deadline: t.bigint().notNull(),
    description: t.text().notNull(),
    isSolo: t.boolean().notNull(),
    resolved: t.boolean().notNull(),
    successful: t.boolean().notNull(),
    createdAt: t.bigint().notNull(),
    resolvedAt: t.bigint(),
  }),
  table => ({
    creatorIdx: index().on(table.creator),
  }),
);

// Activities table - stores all activity events for the feed
export const activity = onchainTable(
  "activity",
  t => ({
    id: t.text().primaryKey(), // txHash-logIndex
    type: t.text().notNull(), // "goal_created" | "goal_resolved" | "vote_cast" | "funds_claimed" | "streak_frozen" | "badge_claimed"
    user: t.hex().notNull(),
    goalId: t.bigint(),
    goalTitle: t.text(), // denormalized for quick display
    stakeAmount: t.bigint(),
    deadline: t.bigint(),
    isSolo: t.boolean(),
    successful: t.boolean(),
    isValid: t.boolean(), // for votes
    claimAmount: t.bigint(), // for claims
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  table => ({
    userIdx: index().on(table.user),
    timestampIdx: index().on(table.timestamp),
    typeIdx: index().on(table.type),
  }),
);

// User stats table - aggregated stats per user for leaderboard
export const userStats = onchainTable("user_stats", t => ({
  id: t.hex().primaryKey(), // user address
  goalsCreated: t.integer().notNull(),
  goalsCompleted: t.integer().notNull(),
  goalsFailed: t.integer().notNull(),
  totalStaked: t.bigint().notNull(),
  totalSaved: t.bigint().notNull(), // amount saved from successful goals
  totalLost: t.bigint().notNull(), // amount lost from failed goals
  currentStreak: t.integer().notNull(),
  longestStreak: t.integer().notNull(),
  lastGoalAt: t.bigint(),
}));
