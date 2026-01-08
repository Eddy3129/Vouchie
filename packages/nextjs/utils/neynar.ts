export const fetchProofCasts = async (
  goalId: number,
  creatorFid: number,
  apiKey: string,
): Promise<{ text: string; hash: string; timestamp?: string } | null> => {
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

    if (casts && Array.isArray(casts)) {
      // Client-side filtering - check if ANY of the possible URLs match
      const proofCast = casts.find((cast: any) =>
        cast.embeds?.some((embed: any) => possibleUrls.some(expectedUrl => embed.url === expectedUrl)),
      );

      if (proofCast) {
        return {
          text: proofCast.text,
          hash: proofCast.hash,
          timestamp: proofCast.timestamp, // ISO timestamp from Neynar
        };
      } else {
      }
    }

    return null;
  } catch (error) {
    console.warn("[PROOF] Error fetching proof casts:", error);
    return null;
  }
};

/**
 * Fetch cast details by hash to get timestamp and other metadata
 */
export const fetchCastByHash = async (
  castHash: string,
  apiKey: string,
): Promise<{ text: string; timestamp: string; author: { fid: number; username?: string } } | null> => {
  if (!apiKey || !castHash) {
    return null;
  }

  try {
    const url = `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`[CAST] fetchCastByHash failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const cast = data.cast;

    if (cast) {
      return {
        text: cast.text,
        timestamp: cast.timestamp,
        author: {
          fid: cast.author?.fid,
          username: cast.author?.username,
        },
      };
    }

    return null;
  } catch (error) {
    console.warn("[CAST] Error fetching cast by hash:", error);
    return null;
  }
};
