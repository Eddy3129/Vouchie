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
 * Format duration in a human-readable relative way (timezone agnostic)
 */
function formatRelativeDeadline(deadlineMs: number): string {
  const now = Date.now();
  const diffMs = deadlineMs - now;

  if (diffMs <= 0) return "now";

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return days === 1 ? "1 day" : `${days} days`;
  } else if (hours > 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  } else {
    return minutes <= 1 ? "1 min" : `${minutes} mins`;
  }
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
  const isSquad = params.mode === "Squad";
  const relativeTime = formatRelativeDeadline(params.deadline);

  // Build @mention list for Squad mode
  const mentions =
    isSquad && params.vouchieUsernames?.length
      ? params.vouchieUsernames
          .slice(0, 3)
          .map(u => `@${u}`)
          .join(" ")
      : "";

  let text: string;

  if (isSquad && mentions) {
    // Squad mode with vouchies
    text =
      `🎲 Betting $${params.stake} USDC that I'll finish "${params.title}" in ${relativeTime}!\n\n` +
      `${mentions} vouch for me! 🤝\n\n` +
      `If I fail, you get my stake 💸`;
  } else if (isSquad) {
    // Squad mode but no vouchies yet
    text =
      `🎲 Betting $${params.stake} USDC that I'll finish "${params.title}" in ${relativeTime}!\n\n` +
      `Who wants to be my vouchie? 🤝\n\n` +
      `If I fail, you get my stake 💸`;
  } else {
    // Solo mode
    text =
      `🎲 Betting $${params.stake} USDC that I'll finish "${params.title}" in ${relativeTime}!\n\n` +
      `Vouch for me fam! 💪`;
  }

  // Use app URL as embed for linking, and custom image for the preview
  // Farcaster uses the first embed's OG image, or you can add a second image embed
  const embedUrl = buildGoalShareUrl(baseUrl, params.goalId);
  const embedImageUrl = `${baseUrl}/thumbnail_miniapp.webp`;

  return {
    text,
    embeds: [embedUrl, embedImageUrl],
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

  if (isSquad && mentions) {
    // Squad mode: Ask vouchies to verify
    text = params.proofText
      ? `✅ Done! "${params.title}"\n\n${params.proofText}\n\n${mentions} verify me! 👆`
      : `✅ Shipped it! "${params.title}"\n\n${mentions} verify me and I get my $${params.stake} back! 🙏`;
  } else if (isSquad) {
    // Squad mode but no mentions
    text = params.proofText
      ? `✅ Done! "${params.title}"\n\n${params.proofText}\n\nWaiting for my vouchies to verify! 🙏`
      : `✅ Shipped it! "${params.title}"\n\nWaiting for verification to get my $${params.stake} back! 🔥`;
  } else {
    // Solo mode: Celebration announcement
    text =
      `✅ LFG! Crushed "${params.title}"!\n\n` +
      `💰 $${params.stake} USDC secured.\n\n` +
      `Stake your goals → Actually do them → Win 🏆`;
  }

  // Use app URL as embed for linking, and custom image for the preview
  const embedUrl = buildGoalShareUrl(baseUrl, params.goalId);
  const embedImageUrl = `${baseUrl}/vouchie.webp`;

  return {
    text,
    embeds: [embedUrl, embedImageUrl],
  };
}
