export interface Goal {
  id: number;
  title: string;
  stake: number;
  currency: string;
  deadline: number; // timestamp
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
}

export interface Vouchie {
  name: string;
  avatar: string;
  status?: string;
  address?: string;
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
  color: string;
  avatar: string;
  score: number;
  status: string;
  address?: string;
}

export interface Stats {
  tasksCompleted: number;
  usdcSaved: number;
  streak: number;
  reputation: number;
}
