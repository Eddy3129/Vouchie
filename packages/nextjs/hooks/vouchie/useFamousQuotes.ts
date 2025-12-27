import { useState } from "react";

interface Quote {
  text: string;
  author: string;
}

const famousQuotes: Quote[] = [
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  {
    text: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: "Arnold Schwarzenegger",
  },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Discipline is doing what needs to be done, even if you don't want to do it.", author: "Unknown" },
  { text: "The distance between dreams and reality is called action.", author: "Unknown" },
  { text: "Every day is a new chance to get stronger.", author: "Unknown" },
  { text: "Small steps every day lead to big results.", author: "Unknown" },
  { text: "Focus on the step in front of you, not the whole staircase.", author: "Unknown" },
  { text: "You didn't come this far to only come this far.", author: "Unknown" },
  { text: "Your future self will thank you.", author: "Unknown" },
  { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
];

export const useFamousQuotes = () => {
  const [dailyQuote, setDailyQuote] = useState<Quote>(famousQuotes[0]);

  const refreshQuote = () => {
    const randomIndex = Math.floor(Math.random() * famousQuotes.length);
    setDailyQuote(famousQuotes[randomIndex]);
  };

  return { dailyQuote, refreshQuote };
};
