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

    // Query Neynar for casts by the creator containing this URL
    // Using fetchFeed with filter: embed_url (based on Neynar docs/search results)
    const url = `https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=embed_url&embed_url=${encodeURIComponent(frameUrl)}&fids=${creatorFid}&limit=1`;

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

    if (casts && casts.length > 0) {
      return {
        text: casts[0].text,
        hash: casts[0].hash,
      };
    }

    return null;
  } catch (error) {
    console.warn("Error fetching proof casts:", error);
    return null;
  }
};
