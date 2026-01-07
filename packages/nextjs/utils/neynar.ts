export const fetchProofCasts = async (
  goalId: number,
  creatorFid: number,
  apiKey: string,
): Promise<{ text: string; hash: string } | null> => {
  if (!apiKey) {
    console.warn("fetchProofCasts: No API key provided");
    return null;
  }

  try {
    // Construct the goal frame URL that we expect to be embedded
    const frameUrl = `https://vouchie.app/api/frame/goal/${goalId}`;

    // Query Neynar for recent casts by the creator using the free endpoint
    // v2/farcaster/feed/user/casts (4 credits per call)
    const url = `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${creatorFid}&limit=15&include_replies=false&include_recasts=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        api_key: apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`fetchProofCasts failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const casts = data.casts;

    if (casts && Array.isArray(casts)) {
      // Client-side filtering for the specific frame URL
      const proofCast = casts.find((cast: any) => cast.embeds?.some((embed: any) => embed.url === frameUrl));

      if (proofCast) {
        return {
          text: proofCast.text,
          hash: proofCast.hash,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn("Error fetching proof casts:", error);
    return null;
  }
};
