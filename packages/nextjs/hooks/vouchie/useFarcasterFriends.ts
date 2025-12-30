"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Farcaster friend (reciprocal follower) data
 */
export interface FarcasterFriend {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress: string;
  verifiedAddresses: string[];
}

/**
 * Hook to fetch Farcaster reciprocal followers (mutuals) via Neynar API
 * These are people you follow who also follow you back
 */
export const useFarcasterFriends = (fid: number | undefined) => {
  const [friends, setFriends] = useState<FarcasterFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!fid) {
      setFriends([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Neynar reciprocal followers endpoint
      const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      if (!apiKey) {
        console.warn("NEXT_PUBLIC_NEYNAR_API_KEY not set, using fallback");
        setFriends([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`https://api.neynar.com/v2/farcaster/followers/reciprocal?fid=${fid}&limit=20`, {
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch friends: ${response.status}`);
      }

      const data = await response.json();

      // Transform response to FarcasterFriend format
      const friendsList: FarcasterFriend[] = (data.users || []).map((item: any) => {
        const user = item.user || item;
        return {
          fid: user.fid,
          username: user.username || "",
          displayName: user.display_name || user.username || "",
          pfpUrl: user.pfp_url || "",
          custodyAddress: user.custody_address || "",
          verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        };
      });

      setFriends(friendsList);
    } catch (err) {
      console.error("Error fetching Farcaster friends:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch friends");
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [fid]);

  // Fetch on mount and when FID changes
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Get top N friends
  const getTopFriends = useCallback(
    (count: number = 5) => {
      return friends.slice(0, count);
    },
    [friends],
  );

  return useMemo(
    () => ({
      friends,
      loading,
      error,
      refresh: fetchFriends,
      getTopFriends,
    }),
    [friends, loading, error, fetchFriends, getTopFriends],
  );
};

export default useFarcasterFriends;
