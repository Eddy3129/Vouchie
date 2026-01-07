export interface Goal {
  id: number;
  title: string;
  stake: number;
  currency: string;
  deadline: number;
  createdAt?: number; // Timestamp when goal was created (for grace period)
  mode: "Squad" | "Solo";
  status: "pending" | "in_progress" | "verifying" | "done" | "failed";
  startTime: number | null;
  startImage: string | null;
  vouchies: Vouchie[];
  comments: Comment[];
  progress: number;
  color: string;
  accent: string;
  barColor: string;
  creator?: string; // Creator wallet address
  creatorUsername?: string; // Creator Farcaster username
  creatorAvatar?: string; // Creator avatar URL
  resolved: boolean;
  successful: boolean;
  userHasClaimed?: boolean;
  currentUserVouchieIndex?: number;
  proofText?: string;
}

// Grace period constant (10 minutes in ms) - must match contract
export const CANCEL_GRACE_PERIOD_MS = 10 * 60 * 1000;

export interface Vouchie {
  name: string;
  avatar: string;
  avatarColor?: string;
  status?: string;
  address?: string;
  fid?: number; // Farcaster ID for viewProfile and mentions
  username?: string; // Farcaster @username for cast mentions
}

export interface Comment {
  user: string;
  text: string;
}

export interface LongTermGoal {
  id: number;
  title: string;
  icon: string;
  color: string;
  deadline: Date;
  routines: Routine[];
}

export interface Routine {
  id: number;
  text: string;
  done: boolean;
  frequency: string;
}

export interface UserProfile {
  id: number;
  name: string;
  color?: string;
  avatar: string;
  avatarColor?: string;
  score: number;
  status: string;
  address?: string;
  streak?: number;
  saved?: number;
}

export interface Stats {
  tasksCompleted: number;
  usdcSaved: number;
  streak: number;
  reputation: number;
}
