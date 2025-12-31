/**
 * Cast Helper Utilities
 * Generates cast content and OG URLs for Farcaster sharing
 */

export interface GoalCastParams {
  goalId: number;
  title: string;
  stake: number;
  deadline: number; // timestamp in ms
  username?: string;
  mode: "Solo" | "Squad";
  vouchieUsernames?: string[]; // For @mentions
  proofText?: string;
}

/**
 * Build the OG image URL with all necessary parameters
 */
export function buildOgImageUrl(
  baseUrl: string,
  params: {
    type: "new" | "proof";
    title: string;
    stake: number;
    deadline?: number;
    username?: string;
    mode?: string;
  },
): string {
  const url = new URL("/api/og", baseUrl);
  url.searchParams.set("type", params.type);
  url.searchParams.set("title", params.title);
  url.searchParams.set("stake", params.stake.toString());
  if (params.deadline) {
    url.searchParams.set("deadline", params.deadline.toString());
  }
  if (params.username) {
    url.searchParams.set("username", params.username);
  }
  if (params.mode) {
    url.searchParams.set("mode", params.mode);
  }
  return url.toString();
}

/**
 * Build the goal share URL (embed link that opens the app)
 */
export function buildGoalShareUrl(baseUrl: string, goalId: number): string {
  return `${baseUrl}?goal=${goalId}`;
}

/**
 * Build cast content for new goal creation
 */
export function buildGoalCreatedCast(
  baseUrl: string,
  params: GoalCastParams,
): {
  text: string;
  embeds: string[];
} {
  const deadlineDate = new Date(params.deadline);
  const deadlineStr = deadlineDate.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const modeEmoji = params.mode === "Squad" ? "👥" : "🧍";
  const text =
    `🎯 Just locked $${params.stake} USDC on "${params.title}"!\n\n` +
    `${modeEmoji} ${params.mode} Mode | ⏰ Due: ${deadlineStr}\n\n` +
    `Hold me accountable! 💪`;

  // Use the app URL with goal param as embed (Farcaster will fetch OG from our API)
  const embedUrl = buildGoalShareUrl(baseUrl, params.goalId);

  return {
    text,
    embeds: [embedUrl],
  };
}

/**
 * Build cast content for proof submission (both Solo and Squad)
 */
export function buildProofSubmittedCast(
  baseUrl: string,
  params: GoalCastParams,
): {
  text: string;
  embeds: string[];
} {
  const isSquad = params.mode === "Squad";

  // Build @mention list for Squad mode
  const mentions =
    isSquad && params.vouchieUsernames?.length
      ? params.vouchieUsernames
          .slice(0, 3)
          .map(u => `@${u}`)
          .join(" ")
      : "";

  let text: string;

  if (isSquad) {
    // Squad mode: Ask vouchies to verify
    text = params.proofText
      ? `✅ Done! "${params.title}"\n\n${params.proofText}\n\n${mentions ? `${mentions} - ` : ""}Verify my proof! 👆`
      : `✅ Completed "${params.title}"!\n\n${mentions ? `${mentions} - ` : ""}Verify my proof! 👆`;
  } else {
    // Solo mode: Celebration announcement
    text =
      `✅ Crushed it! "${params.title}"\n\n` +
      `💰 Got my $${params.stake} USDC back!\n\n` +
      `Set goals → Stake money → Get it done 🔥`;
  }

  // Use the share URL with goal context
  const embedUrl = buildGoalShareUrl(baseUrl, params.goalId);

  return {
    text,
    embeds: [embedUrl],
  };
}
