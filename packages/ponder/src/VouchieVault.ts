import { ponder } from "ponder:registry";
import { goal, activity, userStats } from "ponder:schema";

// Helper to ensure user stats exist
async function ensureUserStats(db: any, address: `0x${string}`) {
  const existing = await db.find(userStats, { id: address });
  if (!existing) {
    await db.insert(userStats).values({
      id: address,
      goalsCreated: 0,
      goalsCompleted: 0,
      goalsFailed: 0,
      totalStaked: 0n,
      totalSaved: 0n,
      totalLost: 0n,
      currentStreak: 0,
      longestStreak: 0,
      lastGoalAt: null,
    });
  }
}

// GoalCreated event handler
ponder.on("VouchieVault:GoalCreated", async ({ event, context }) => {
  const { goalId, creator, stakeAmount, deadline, isSolo } = event.args;

  // Fetch the goal description from the contract
  let description = "";
  try {
    const goalData = await context.client.readContract({
      abi: context.contracts.VouchieVault.abi,
      address: context.contracts.VouchieVault.address,
      functionName: "goals",
      args: [goalId],
    });
    // goalData is a tuple: [id, creator, stakeAmount, deadline, createdAt, description, ...]
    description = (goalData as any)[5] || "";
  } catch (e) {
    console.error("Failed to fetch goal description:", e);
  }

  // Insert goal record
  await context.db.insert(goal).values({
    id: goalId,
    creator,
    stakeAmount,
    deadline,
    description,
    isSolo,
    resolved: false,
    successful: false,
    createdAt: event.block.timestamp,
    resolvedAt: null,
  });

  // Insert activity record
  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "goal_created",
    user: creator,
    goalId,
    goalTitle: description,
    stakeAmount,
    deadline,
    isSolo,
    successful: null,
    isValid: null,
    claimAmount: null,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Update user stats
  await ensureUserStats(context.db, creator);
  await context.db
    .update(userStats, { id: creator })
    .set((row: any) => ({
      goalsCreated: row.goalsCreated + 1,
      totalStaked: row.totalStaked + stakeAmount,
      lastGoalAt: event.block.timestamp,
    }));
});

// GoalResolved event handler
ponder.on("VouchieVault:GoalResolved", async ({ event, context }) => {
  const { goalId, successful, isSolo } = event.args;

  // Get the goal to find the creator, stake, and title
  const existingGoal = await context.db.find(goal, { id: goalId });

  // Update goal record
  await context.db.update(goal, { id: goalId }).set({
    resolved: true,
    successful,
    resolvedAt: event.block.timestamp,
  });

  // Insert activity record
  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "goal_resolved",
    user: existingGoal?.creator ?? "0x0000000000000000000000000000000000000000",
    goalId,
    goalTitle: existingGoal?.description ?? null,
    stakeAmount: existingGoal?.stakeAmount ?? 0n,
    deadline: existingGoal?.deadline ?? 0n,
    isSolo,
    successful,
    isValid: null,
    claimAmount: null,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Update user stats
  if (existingGoal) {
    await ensureUserStats(context.db, existingGoal.creator);

    if (successful) {
      await context.db
        .update(userStats, { id: existingGoal.creator })
        .set((row: any) => ({
          goalsCompleted: row.goalsCompleted + 1,
          totalSaved: row.totalSaved + existingGoal.stakeAmount,
          currentStreak: row.currentStreak + 1,
          longestStreak: Math.max(row.longestStreak, row.currentStreak + 1),
        }));
    } else {
      await context.db
        .update(userStats, { id: existingGoal.creator })
        .set((row: any) => ({
          goalsFailed: row.goalsFailed + 1,
          totalLost: row.totalLost + existingGoal.stakeAmount,
          currentStreak: 0, // Reset streak on failure
        }));
    }
  }
});

// VoteCast event handler
ponder.on("VouchieVault:VoteCast", async ({ event, context }) => {
  const { goalId, voter, isValid } = event.args;

  // Get the goal to find the title
  const existingGoal = await context.db.find(goal, { id: goalId });

  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "vote_cast",
    user: voter,
    goalId,
    goalTitle: existingGoal?.description ?? null,
    stakeAmount: null,
    deadline: null,
    isSolo: false,
    successful: null,
    isValid,
    claimAmount: null,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

// FundsClaimed event handler
ponder.on("VouchieVault:FundsClaimed", async ({ event, context }) => {
  const { goalId, claimant, amount } = event.args;

  // Get the goal to find the title
  const existingGoal = await context.db.find(goal, { id: goalId });

  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "funds_claimed",
    user: claimant,
    goalId,
    goalTitle: existingGoal?.description ?? null,
    stakeAmount: null,
    deadline: null,
    isSolo: null,
    successful: null,
    isValid: null,
    claimAmount: amount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

// StreakFrozen event handler
ponder.on("VouchieVault:StreakFrozen", async ({ event, context }) => {
  const { goalId, newDeadline, feePaid } = event.args;

  // Get the goal to find the creator and title
  const existingGoal = await context.db.find(goal, { id: goalId });

  // Update goal deadline
  await context.db.update(goal, { id: goalId }).set({
    deadline: newDeadline,
  });

  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "streak_frozen",
    user: existingGoal?.creator ?? "0x0000000000000000000000000000000000000000",
    goalId,
    goalTitle: existingGoal?.description ?? null,
    stakeAmount: feePaid,
    deadline: newDeadline,
    isSolo: null,
    successful: null,
    isValid: null,
    claimAmount: null,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

// BadgeClaimed event handler
ponder.on("VouchieVault:BadgeClaimed", async ({ event, context }) => {
  const { goalId, creator } = event.args;

  // Get the goal to find the title
  const existingGoal = await context.db.find(goal, { id: goalId });

  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "badge_claimed",
    user: creator,
    goalId,
    goalTitle: existingGoal?.description ?? null,
    stakeAmount: null,
    deadline: null,
    isSolo: null,
    successful: null,
    isValid: null,
    claimAmount: null,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

// GoalCanceled event handler
ponder.on("VouchieVault:GoalCanceled", async ({ event, context }) => {
  const { goalId, creator, refundAmount } = event.args;

  // Get the goal to find the title before updating
  const existingGoal = await context.db.find(goal, { id: goalId });

  // Update goal as resolved (canceled)
  await context.db.update(goal, { id: goalId }).set({
    resolved: true,
    successful: false,
    resolvedAt: event.block.timestamp,
  });

  await context.db.insert(activity).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    type: "goal_canceled",
    user: creator,
    goalId,
    goalTitle: existingGoal?.description ?? null,
    stakeAmount: null,
    deadline: null,
    isSolo: null,
    successful: null,
    isValid: null,
    claimAmount: refundAmount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Update user stats - reduce goals created count (canceled goal)
  await ensureUserStats(context.db, creator);
  await context.db
    .update(userStats, { id: creator })
    .set((row: any) => ({
      goalsCreated: Math.max(0, row.goalsCreated - 1),
      totalStaked: row.totalStaked - refundAmount > 0n ? row.totalStaked - refundAmount : 0n,
    }));
});
