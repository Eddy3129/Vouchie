import { useMemo } from "react";
import { formatUnits } from "viem";
import { Goal } from "~~/types/vouchie";

export interface PersonalNotification {
  id: string;
  type:
    | "verify_request"
    | "claim_available"
    | "vouchie_invite"
    | "goal_resolved"
    | "view"
    | "history_success"
    | "history_failure";
  title: string;
  description: string;
  timestamp: number;
  goalId: number;
  goal: Goal;
  action?: "verify" | "claim" | "view";
  amount?: number;
  castHash?: string;
  read?: boolean;
}

/**
 * Props for usePersonalActivities hook.
 * @param creatorGoals - Goals where current user is the CREATOR (for claim notifications)
 * @param vouchieGoals - Goals where current user is a VOUCHIE (for verify notifications)
 * @param activities - Raw Ponder activities for looking up original stake amounts
 * @param userAddress - Current user's wallet address
 * @param decimals - USDC decimals (18 for local, 6 for mainnet)
 */
interface UsePersonalActivitiesProps {
  creatorGoals: Goal[];
  vouchieGoals: Goal[];
  activities?: any[]; // Raw Ponder activities
  userAddress?: string;
  decimals?: number;
}

export const usePersonalActivities = ({
  creatorGoals,
  vouchieGoals,
  activities = [],
  userAddress,
  decimals = 6,
}: UsePersonalActivitiesProps) => {
  const notifications = useMemo(() => {
    const items: PersonalNotification[] = [];

    // --- Helper: Get original stake from activities if current stake is 0 ---
    const getOriginalStake = (goalId: number, currentStake: number): number => {
      if (currentStake > 0) return currentStake;
      // Look up from goal_created activity
      const activity = activities?.find(a => Number(a.goalId) === goalId && a.type === "goal_created");
      if (activity && activity.stakeAmount) {
        return Number(formatUnits(BigInt(activity.stakeAmount), decimals));
      }
      return currentStake;
    };

    // --- 1. Vouchie Actions (Verify & History) ---
    vouchieGoals.forEach(goal => {
      const totalVotes = (goal.votesValid || 0) + (goal.votesInvalid || 0);
      const allVoted = goal.vouchies.length > 0 && totalVotes >= goal.vouchies.length;
      const originalStake = getOriginalStake(goal.id, goal.stake);

      // A. Verify Request (Pending)
      if (!goal.resolved && (goal.proofText || goal.deadline < Date.now()) && !allVoted) {
        items.push({
          id: `verify-${goal.id}`,
          type: "verify_request",
          title: goal.proofText ? "Proof Submitted" : "Ready to Settle",
          description: `${goal.creatorUsername || "Someone"} needs your verification for "${goal.title}"`,
          timestamp: goal.createdAt || Date.now(),
          goalId: goal.id,
          goal,
          action: "verify",
          amount: originalStake,
          castHash: goal.proofCastHash,
        });
      }

      // B. Vouchie Claims (Goal Failed -> Earn Share)
      // Check if goal is resolved, failed, and user is entitled to share
      if (goal.resolved && !goal.successful && goal.mode === "Squad") {
        const share = originalStake / (goal.vouchies.length || 1);
        if (!goal.userHasClaimed && goal.stake > 0) {
          // Pending claim
          items.push({
            id: `claim-vouchie-${goal.id}`,
            type: "claim_available",
            title: "Claim Your Share",
            description: `Slashing @${goal.creatorUsername || "creator"} for failure of "${goal.title}". Claim your $${share.toFixed(2)} share!`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "claim",
            amount: share,
          });
        } else if (goal.userHasClaimed || goal.stake === 0) {
          // Already claimed - show history
          items.push({
            id: `history-vouchie-${goal.id}`,
            type: "history_success",
            title: "Share Claimed",
            description: `You slashed @${goal.creatorUsername || "creator"} and earned $${share.toFixed(2)}.`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "view",
            amount: share,
          });
        }
      }

      // C. Vouchie Verified (Goal Successful -> History)
      if (goal.resolved && goal.successful) {
        items.push({
          id: `history-verified-${goal.id}`,
          type: "view",
          title: `Verification Successful for "${goal.title}"`,
          description: `You verified @${goal.creatorUsername || "creator"}. Goal completed!`,
          timestamp: goal.deadline,
          goalId: goal.id,
          goal,
          action: "view",
          amount: originalStake, // Show the stake amount for context
          castHash: goal.proofCastHash,
        });
      }

      // D. Invite (Pending, No Proof Yet)
      if (!goal.resolved && !goal.proofText && goal.deadline >= Date.now()) {
        items.push({
          id: `invite-${goal.id}`,
          type: "vouchie_invite",
          title: "You're a Vouchie!",
          description: `@${goal.creatorUsername || "Someone"} added you to "${goal.title}"`,
          timestamp: goal.createdAt || Date.now(),
          goalId: goal.id,
          goal,
          action: "view",
          amount: originalStake,
        });
      }
    });

    // --- 2. Creator Actions (Claims & History) ---
    creatorGoals.forEach(goal => {
      const originalStake = getOriginalStake(goal.id, goal.stake);

      // A. Creator Claims (Goal Successful -> Refund)
      if (goal.resolved && goal.successful) {
        if (!goal.userHasClaimed && goal.stake > 0) {
          // Pending refund claim
          items.push({
            id: `claim-creator-${goal.id}`,
            type: "claim_available",
            title: "Claim Your Refund",
            description: `Squad approved "${goal.title}"! Claim your $${originalStake.toFixed(2)} refund.`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "claim",
            amount: originalStake,
          });
        } else {
          // History: Refunded (already claimed or stake is 0)
          items.push({
            id: `history-refund-${goal.id}`,
            type: "history_success",
            title: "Refund Claimed",
            description: `You reclaimed $${originalStake.toFixed(2)} from "${goal.title}".`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "view",
            amount: originalStake,
            castHash: goal.proofCastHash,
          });
        }
      }

      // B. Creator Failure (Goal Failed -> Lost Stake)
      if (goal.resolved && !goal.successful) {
        items.push({
          id: `history-failed-${goal.id}`,
          type: "history_failure",
          title: "Goal Failed",
          description: `Goal "${goal.title}" was rejected. Stake of $${originalStake.toFixed(2)} lost.`,
          timestamp: goal.deadline,
          goalId: goal.id,
          goal,
          action: "view",
          amount: originalStake,
          castHash: goal.proofCastHash,
        });
      }
    });

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return items;
  }, [creatorGoals, vouchieGoals, activities, userAddress, decimals]);

  // Count actionable (unread) notifications
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.type === "verify_request" || n.type === "claim_available").length;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    hasNotifications: notifications.length > 0,
  };
};
