import { useState } from "react";

interface Quote {
  text: string;
  author: string;
  silhouette: string;
}

// Generate silhouette URL using DiceBear API
const getSilhouette = (seed: string) =>
  `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&clothingColor=ffffff&hairColor=ffffff&skinColor=ffffff`;

const famousQuotes: Quote[] = [
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
    silhouette: getSilhouette("gandhi"),
  },
  {
    text: "Your time is limited, so don't waste it living someone else's life.",
    author: "Steve Jobs",
    silhouette: getSilhouette("jobs"),
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    silhouette: getSilhouette("jobs"),
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    silhouette: getSilhouette("roosevelt"),
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    silhouette: getSilhouette("twain"),
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
    silhouette: getSilhouette("levenson"),
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    silhouette: getSilhouette("collier"),
  },
  {
    text: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: "Arnold Schwarzenegger",
    silhouette: getSilhouette("arnold"),
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    silhouette: getSilhouette("confucius"),
  },
  {
    text: "Discipline is doing what needs to be done, even if you don't want to do it.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom1"),
  },
  {
    text: "The distance between dreams and reality is called action.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom2"),
  },
  {
    text: "Every day is a new chance to get stronger.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom3"),
  },
  {
    text: "Small steps every day lead to big results.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom4"),
  },
  {
    text: "Focus on the step in front of you, not the whole staircase.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom5"),
  },
  {
    text: "You didn't come this far to only come this far.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom6"),
  },
  {
    text: "Your future self will thank you.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom7"),
  },
  {
    text: "Consistency is what transforms average into excellence.",
    author: "Unknown",
    silhouette: getSilhouette("wisdom8"),
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
    silhouette: getSilhouette("proverb"),
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    silhouette: getSilhouette("ziglar"),
  },
  {
    text: "The secret of your future is hidden in your daily routine.",
    author: "Mike Murdock",
    silhouette: getSilhouette("murdock"),
  },
];

export const useFamousQuotes = () => {
  const [dailyQuote, setDailyQuote] = useState<Quote>(famousQuotes[0]);

  const refreshQuote = () => {
    const randomIndex = Math.floor(Math.random() * famousQuotes.length);
    setDailyQuote(famousQuotes[randomIndex]);
  };

  return { dailyQuote, refreshQuote };
};
