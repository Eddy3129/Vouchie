import React from "react";

const FontStyles = () => (
  <style jsx global>{`
    @import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap");

    body {
      font-family: "Nunito", sans-serif;
      background-color: #fdfbf7;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 0px;
    }

    @media (min-width: 768px) {
      ::-webkit-scrollbar {
        width: 8px;
      }
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 10px;
    }

    .chubby-text {
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .soft-shadow {
      box-shadow:
        8px 8px 16px #e6e1d6,
        -8px -8px 16px #ffffff;
    }

    .soft-shadow-pressed {
      box-shadow:
        inset 6px 6px 12px #e6e1d6,
        inset -6px -6px 12px #ffffff;
    }

    /* Animations */
    .bounce-hover {
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .bounce-hover:hover {
      transform: scale(1.05);
    }
    .bounce-active:active {
      transform: scale(0.95);
    }

    .urgent-glow {
      box-shadow: 0 0 20px rgba(255, 90, 30, 0.4);
      border: 2px solid rgba(255, 90, 30, 0.6);
      animation: glow-pulse 2s infinite alternate;
    }

    @keyframes glow-pulse {
      from {
        box-shadow: 0 0 10px rgba(255, 90, 30, 0.2);
      }
      to {
        box-shadow: 0 0 25px rgba(255, 90, 30, 0.6);
      }
    }
  `}</style>
);

export default FontStyles;
