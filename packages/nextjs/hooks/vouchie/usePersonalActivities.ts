import { useMemo } from "react";
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
 * @param userAddress - Current user's wallet address
 */
interface UsePersonalActivitiesProps {
  creatorGoals: Goal[];
  vouchieGoals: Goal[];
  userAddress?: string;
}

export const usePersonalActivities = ({ creatorGoals, vouchieGoals }: UsePersonalActivitiesProps) => {
  const notifications = useMemo(() => {
    const items: PersonalNotification[] = [];

    // --- 1. Vouchie Actions (Verify & History) ---
    vouchieGoals.forEach(goal => {
      const totalVotes = (goal.votesValid || 0) + (goal.votesInvalid || 0);
      const allVoted = goal.vouchies.length > 0 && totalVotes >= goal.vouchies.length;

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
          amount: goal.stake,
          castHash: goal.proofCastHash,
        });
      }

      // B. Vouchie Claims (Goal Failed -> Earn Share)
      // Check if goal is resolved, failed, and I haven't claimed yet (and I'm entitled to stake)
      if (goal.resolved && !goal.successful && goal.stake > 0 && goal.mode === "Squad") {
        const share = goal.stake / (goal.vouchies.length || 1);
        if (!goal.userHasClaimed) {
          items.push({
            id: `claim-vouchie-${goal.id}`,
            type: "claim_available",
            title: "Claim Your Share",
            description: `Goal "${goal.title}" failed. Claim your $${share.toFixed(2)} share!`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "claim",
            amount: share,
          });
        } else {
          // History: Claimed
          items.push({
            id: `history-vouchie-${goal.id}`,
            type: "history_success",
            title: "Share Claimed",
            description: `You earned $${share.toFixed(2)} from "${goal.title}" failure.`,
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
          title: "Verification Successful",
          description: `You verified "${goal.title}". Goal completed!`,
          timestamp: goal.deadline,
          goalId: goal.id,
          goal,
          action: "view",
          castHash: goal.proofCastHash, // Link to proof
        });
      }

      // D. Invite (Pending, No Proof Yet)
      if (!goal.resolved && !goal.proofText && goal.deadline >= Date.now()) {
        items.push({
          id: `invite-${goal.id}`,
          type: "vouchie_invite",
          title: "You're a Vouchie!",
          description: `${goal.creatorUsername || "Someone"} added you to "${goal.title}"`,
          timestamp: goal.createdAt || Date.now(),
          goalId: goal.id,
          goal,
          action: "view",
          amount: goal.stake,
        });
      }
    });

    // --- 2. Creator Actions (Claims & History) ---
    creatorGoals.forEach(goal => {
      // A. Creator Claims (Goal Successful -> Refund)
      if (goal.resolved && goal.successful && goal.stake > 0) {
        if (!goal.userHasClaimed) {
          items.push({
            id: `claim-creator-${goal.id}`,
            type: "claim_available",
            title: "Claim Your Refund",
            description: `Squad approved "${goal.title}"! Claim your $${goal.stake.toFixed(2)} refund.`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "claim",
            amount: goal.stake,
          });
        } else {
          // History: Refunded
          items.push({
            id: `history-refund-${goal.id}`,
            type: "history_success",
            title: "Refund Claimed",
            description: `You reclaimed $${goal.stake.toFixed(2)} from "${goal.title}".`,
            timestamp: goal.deadline,
            goalId: goal.id,
            goal,
            action: "view",
            amount: goal.stake,
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
          description: `Goal "${goal.title}" was rejected. Stake of $${(goal.stake || 0).toFixed(2)} lost.`,
          timestamp: goal.deadline,
          goalId: goal.id,
          goal,
          action: "view",
          amount: goal.stake,
          castHash: goal.proofCastHash,
        });
      }
    });

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return items;
  }, [creatorGoals, vouchieGoals]);

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
