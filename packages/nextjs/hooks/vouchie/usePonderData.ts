import { useQuery } from "@tanstack/react-query";

// Get Ponder URL from environment or default to localhost
const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || "http://localhost:42069";

// GraphQL query helper
async function fetchGraphQL<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch(PONDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0]?.message || "GraphQL error");
  }

  return result.data;
}

// Types for activity data
export interface Activity {
  id: string;
  type: string;
  user: string;
  goalId: string | null;
  goalTitle: string | null;
  stakeAmount: string | null;
  deadline: string | null;
  isSolo: boolean | null;
  successful: boolean | null;
  isValid: boolean | null;
  claimAmount: string | null;
  timestamp: string;
  blockNumber: string;
}

export interface UserStats {
  id: string;
  goalsCreated: number;
  goalsCompleted: number;
  goalsFailed: number;
  totalStaked: string;
  totalSaved: string;
  totalLost: string;
  currentStreak: number;
  longestStreak: number;
  lastGoalAt: string | null;
}

// Fetch recent activities for the feed
export function useActivities(limitCount: number = 20) {
  return useQuery({
    queryKey: ["activities", limitCount],
    queryFn: async () => {
      // Ponder uses 'limit' not 'first'
      const query = `
        query GetActivities($limitCount: Int!) {
          activitys(limit: $limitCount, orderBy: "timestamp", orderDirection: "desc") {
            items {
              id
              type
              user
              goalId
              goalTitle
              stakeAmount
              deadline
              isSolo
              successful
              isValid
              claimAmount
              timestamp
              blockNumber
            }
          }
        }
      `;

      const data = await fetchGraphQL<{ activitys: { items: Activity[] } }>(query, { limitCount });
      return data.activitys.items;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    staleTime: 2000,
  });
}

// Fetch user stats for a specific address
export function useUserStats(address: string | undefined) {
  return useQuery({
    queryKey: ["userStats", address],
    queryFn: async () => {
      if (!address) return null;

      const query = `
        query GetUserStats($address: String!) {
          userStats(id: $address) {
            id
            goalsCreated
            goalsCompleted
            goalsFailed
            totalStaked
            totalSaved
            totalLost
            currentStreak
            longestStreak
            lastGoalAt
          }
        }
      `;

      const data = await fetchGraphQL<{ userStats: UserStats | null }>(query, {
        address: address.toLowerCase(),
      });
      return data.userStats;
    },
    enabled: !!address,
    refetchInterval: 10000,
  });
}

// Fetch leaderboard data (all users sorted by streak or saved)
export function useLeaderboard(sortBy: "streak" | "saved" = "streak", limitCount: number = 10) {
  return useQuery({
    queryKey: ["leaderboard", sortBy, limitCount],
    queryFn: async () => {
      const orderByField = sortBy === "streak" ? "currentStreak" : "totalSaved";

      // Ponder uses 'limit' not 'first'
      const query = `
        query GetLeaderboard($limitCount: Int!) {
          userStatss(limit: $limitCount, orderBy: "${orderByField}", orderDirection: "desc") {
            items {
              id
              goalsCreated
              goalsCompleted
              goalsFailed
              totalStaked
              totalSaved
              totalLost
              currentStreak
              longestStreak
              lastGoalAt
            }
          }
        }
      `;

      const data = await fetchGraphQL<{ userStatss: { items: UserStats[] } }>(query, { limitCount });
      return data.userStatss.items;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Fetch activities for a specific user
export function useUserActivities(address: string | undefined, limitCount: number = 10) {
  return useQuery({
    queryKey: ["userActivities", address, limitCount],
    queryFn: async () => {
      if (!address) return [];

      // Ponder uses 'limit' not 'first'
      const query = `
        query GetUserActivities($address: String!, $limitCount: Int!) {
          activitys(
            limit: $limitCount,
            orderBy: "timestamp",
            orderDirection: "desc",
            where: { user: $address }
          ) {
            items {
              id
              type
              user
              goalId
              goalTitle
              stakeAmount
              deadline
              isSolo
              successful
              isValid
              claimAmount
              timestamp
              blockNumber
            }
          }
        }
      `;

      const data = await fetchGraphQL<{ activitys: { items: Activity[] } }>(query, {
        address: address.toLowerCase(),
        limitCount,
      });
      return data.activitys.items;
    },
    enabled: !!address,
    refetchInterval: 10000,
  });
}
