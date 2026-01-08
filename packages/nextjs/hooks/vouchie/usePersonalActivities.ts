import { useMemo } from "react";
import { Goal } from "~~/types/vouchie";

export interface PersonalNotification {
  id: string;
  type: "verify_request" | "claim_available" | "vouchie_invite" | "goal_resolved";
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

interface UsePersonalActivitiesProps {
  goals: Goal[];
  verificationGoals: Goal[];
  userAddress?: string;
}

export const usePersonalActivities = ({ goals, verificationGoals }: UsePersonalActivitiesProps) => {
  const notifications = useMemo(() => {
    const items: PersonalNotification[] = [];

    // 1. Pending verifications (vouchie duties with proof submitted)
    verificationGoals
      .filter(g => !g.resolved && (g.proofText || g.deadline < Date.now()))
      .forEach(goal => {
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
      });

    // 2. Pending claims (claimable funds from resolved goals)
    // As creator - successful goals with stake > 0
    goals
      .filter(g => g.resolved && g.successful && g.stake > 0 && !g.userHasClaimed)
      .forEach(goal => {
        items.push({
          id: `claim-creator-${goal.id}`,
          type: "claim_available",
          title: "Claim Your Refund",
          description: `Goal "${goal.title}" succeeded! Claim your $${goal.stake.toFixed(2)} USDC`,
          timestamp: goal.deadline,
          goalId: goal.id,
          goal,
          action: "claim",
          amount: goal.stake,
        });
      });

    // As vouchie - failed squad goals with stake > 0
    verificationGoals
      .filter(g => g.resolved && !g.successful && g.stake > 0 && !g.userHasClaimed && g.mode === "Squad")
      .forEach(goal => {
        const share = goal.stake / (goal.vouchies.length || 1);
        items.push({
          id: `claim-vouchie-${goal.id}`,
          type: "claim_available",
          title: "Claim Your Share",
          description: `Goal "${goal.title}" failed. Claim your $${share.toFixed(2)} USDC share`,
          timestamp: goal.deadline,
          goalId: goal.id,
          goal,
          action: "claim",
          amount: share,
        });
      });

    // 3. Vouchie invitations (pending goals where you're a vouchie but no proof yet)
    verificationGoals
      .filter(g => !g.resolved && !g.proofText && g.deadline >= Date.now())
      .forEach(goal => {
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
      });

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return items;
  }, [goals, verificationGoals]);

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
