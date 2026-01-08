export const fetchProofCasts = async (
  goalId: number,
  creatorFid: number,
  apiKey: string,
): Promise<{ text: string; hash: string } | null> => {
  if (!apiKey) {
    console.warn("[PROOF] fetchProofCasts: No API key provided");
    return null;
  }

  try {
    // Multiple possible URL formats for the proof cast
    const possibleUrls = [
      `https://vouchie.vercel.app?goal=${goalId}`, // Production vercel (query param)
      `https://vouchie.vercel.app/?goal=${goalId}`, // With trailing slash
      `https://vouchie.app?goal=${goalId}`, // Custom domain (query param)
      `https://vouchie.app/?goal=${goalId}`, // With trailing slash
      `https://vouchie.app/api/frame/goal/${goalId}`, // API frame format
    ];

    console.log(`[PROOF] Searching for proof cast: goalId=${goalId}, creatorFid=${creatorFid}`);
    console.log(`[PROOF] Looking for URLs: ${possibleUrls.join(" | ")}`);

    // Query Neynar for recent casts by the creator using the free endpoint
    const url = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${creatorFid}&limit=15&include_replies=false&include_recasts=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`[PROOF] fetchProofCasts failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const casts = data.casts;

    console.log(`[PROOF] Found ${casts?.length || 0} casts from creator`);

    if (casts && Array.isArray(casts)) {
      // Log all embeds for debugging
      casts.forEach((cast: any, idx: number) => {
        const embedUrls = cast.embeds?.map((e: any) => e.url).filter(Boolean) || [];
        if (embedUrls.length > 0) {
          console.log(`[PROOF] Cast ${idx}: "${cast.text?.slice(0, 50)}..." embeds: ${JSON.stringify(embedUrls)}`);
        }
      });

      // Client-side filtering - check if ANY of the possible URLs match
      const proofCast = casts.find((cast: any) =>
        cast.embeds?.some((embed: any) => possibleUrls.some(expectedUrl => embed.url === expectedUrl)),
      );

      if (proofCast) {
        console.log(`[PROOF] ✅ Found proof cast for goal ${goalId}: hash=${proofCast.hash}`);
        return {
          text: proofCast.text,
          hash: proofCast.hash,
        };
      } else {
        console.log(`[PROOF] ❌ No cast found with matching URL for goal ${goalId}`);
      }
    }

    return null;
  } catch (error) {
    console.warn("[PROOF] Error fetching proof casts:", error);
    return null;
  }
};
