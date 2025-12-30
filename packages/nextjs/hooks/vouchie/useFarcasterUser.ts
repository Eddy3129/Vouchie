"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Farcaster user data from Neynar API
 */
export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress: string;
  verifiedAddresses: string[];
  followerCount: number;
  followingCount: number;
}

// In-memory cache for wallet→FID lookups
const userCache = new Map<string, FarcasterUser | null>();

/**
 * Hook to lookup Farcaster users by wallet address using Neynar API
 * Uses bulk ETH/SOL address endpoint which finds users by verified addresses
 */
export const useFarcasterUser = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Lookup users by wallet addresses using bulk endpoint
   * Returns a map of address → FarcasterUser
   */
  const lookupBatch = useCallback(async (addresses: string[]): Promise<Map<string, FarcasterUser | null>> => {
    const results = new Map<string, FarcasterUser | null>();

    if (!addresses || addresses.length === 0) return results;

    // Filter to unique addresses not in cache
    const uniqueAddresses = [...new Set(addresses.map(a => a.toLowerCase()))];

    // Check cache and identify missing
    const missing: string[] = [];
    for (const addr of uniqueAddresses) {
      if (userCache.has(addr)) {
        results.set(addr, userCache.get(addr) ?? null);
      } else {
        missing.push(addr);
      }
    }

    if (missing.length === 0) return results;

    try {
      setLoading(true);

      const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      if (!apiKey) {
        console.warn("NEXT_PUBLIC_NEYNAR_API_KEY not set");
        missing.forEach(addr => {
          userCache.set(addr, null);
          results.set(addr, null);
        });
        return results;
      }

      // Batch lookup - Neynar supports up to 350 addresses per request
      const batchSize = 100;
      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        const addressesParam = batch.join(",");

        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}`,
          {
            headers: {
              accept: "application/json",
              "x-api-key": apiKey,
            },
          },
        );

        if (!response.ok) {
          console.error("Neynar API error:", response.status);
          batch.forEach(addr => {
            userCache.set(addr, null);
            results.set(addr, null);
          });
          continue;
        }

        const data = await response.json();

        // Response is { [address]: User[] } - each address can have multiple users
        // We take the first user for each address
        for (const addr of batch) {
          const users = data[addr] || data[addr.toLowerCase()];
          if (users && users.length > 0) {
            const u = users[0];
            const user: FarcasterUser = {
              fid: u.fid,
              username: u.username || "",
              displayName: u.display_name || "",
              pfpUrl: u.pfp_url || "",
              custodyAddress: u.custody_address || "",
              verifiedAddresses: u.verified_addresses?.eth_addresses || [],
              followerCount: u.follower_count || 0,
              followingCount: u.following_count || 0,
            };
            userCache.set(addr.toLowerCase(), user);
            results.set(addr.toLowerCase(), user);
          } else {
            userCache.set(addr.toLowerCase(), null);
            results.set(addr.toLowerCase(), null);
          }
        }
      }
    } catch (error) {
      console.error("Error looking up Farcaster users:", error);
      missing.forEach(addr => {
        userCache.set(addr, null);
        results.set(addr, null);
      });
    } finally {
      setLoading(false);
    }

    return results;
  }, []);

  /**
   * Lookup a single wallet address → Farcaster user
   */
  const lookupByAddress = useCallback(
    async (address: string): Promise<FarcasterUser | null> => {
      if (!address) return null;
      const results = await lookupBatch([address]);
      return results.get(address.toLowerCase()) ?? null;
    },
    [lookupBatch],
  );

  /**
   * Get cached user if available (synchronous)
   */
  const getCached = useCallback((address: string): FarcasterUser | null | undefined => {
    return userCache.get(address.toLowerCase());
  }, []);

  /**
   * Clear cache (useful for testing)
   */
  const clearCache = useCallback(() => {
    userCache.clear();
  }, []);

  return useMemo(
    () => ({
      lookupByAddress,
      lookupBatch,
      getCached,
      clearCache,
      loading,
    }),
    [lookupByAddress, lookupBatch, getCached, clearCache, loading],
  );
};

export default useFarcasterUser;
