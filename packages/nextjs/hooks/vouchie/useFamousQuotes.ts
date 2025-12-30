import { useState } from "react";

interface Quote {
  text: string;
  author: string;
  silhouette: string;
}

const famousQuotes: Quote[] = [
  // Discipline & Consistency
  {
    text: "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.",
    author: "Bruce Lee",
    silhouette: "/quotes/bruce.webp",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    silhouette: "/quotes/aristotle.webp",
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    silhouette: "/quotes/robert-collier.webp",
  },
  // Grind & Hard Things
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
    silhouette: "/quotes/jim-rohn.webp",
  },
  {
    text: "Nothing in the world is worth having or worth doing unless it means effort, pain, difficulty.",
    author: "Theodore Roosevelt",
    silhouette: "/quotes/theodore-roosevelt.webp",
  },
  // Time & Urgency
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
    silhouette: "/quotes/gandhi.webp",
  },
  {
    text: "Lost time is never found again.",
    author: "Benjamin Franklin",
    silhouette: "/quotes/benjamin-franklin.webp",
  },
  // Strength & Pressure
  {
    text: "What does not kill me makes me stronger.",
    author: "Friedrich Nietzsche",
    silhouette: "/quotes/nietzshce.webp",
  },
  {
    text: "Courage is resistance to fear, mastery of fear—not absence of fear.",
    author: "Mark Twain",
    silhouette: "/quotes/mark-twain.webp",
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
    silhouette: "/quotes/marcus-aurelis.webp",
  },
];

// Get a random quote
const getRandomQuote = () => famousQuotes[Math.floor(Math.random() * famousQuotes.length)];

export const useFamousQuotes = () => {
  // Initialize with a random quote on first load
  const [dailyQuote, setDailyQuote] = useState<Quote>(() => getRandomQuote());

  const refreshQuote = () => {
    setDailyQuote(getRandomQuote());
  };

  return { dailyQuote, refreshQuote };
};
