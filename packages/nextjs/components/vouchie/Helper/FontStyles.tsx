import React from "react";

const FontStyles = () => (
  <style jsx global>{`
    @import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap");
    @import url("https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css");

    body {
      font-family: "Nunito", sans-serif;
      background-color: var(--fallback-bg, #faf7f2);
    }

    [data-theme="dark"] body {
      background-color: #1a1a1a;
    }

    /* Ensure all cards use theme colors */
    .bg-white {
      background-color: #ffffff;
    }

    [data-theme="dark"] .bg-white {
      background-color: #2d2d2d;
    }

    .bg-white\\/70 {
      background-color: rgba(255, 255, 255, 0.7);
    }

    [data-theme="dark"] .bg-white\\/70 {
      background-color: rgba(45, 45, 45, 0.7);
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
      background: #e8e1d5;
      border-radius: 10px;
    }

    [data-theme="dark"] ::-webkit-scrollbar-thumb {
      background: #3a3a3a;
    }

    /* Urgent Glow - Professional orange glow */
    .urgent-glow {
      box-shadow: 0 0 20px rgba(255, 152, 0, 0.3);
      border: 2px solid rgba(255, 152, 0, 0.5);
      animation: glow-pulse 2s infinite alternate;
    }

    [data-theme="dark"] .urgent-glow {
      box-shadow: 0 0 20px rgba(255, 167, 38, 0.4);
      border: 2px solid rgba(255, 167, 38, 0.6);
    }

    @keyframes glow-pulse {
      from {
        box-shadow: 0 0 10px rgba(255, 152, 0, 0.2);
      }
      to {
        box-shadow: 0 0 25px rgba(255, 152, 0, 0.4);
      }
    }

    /* Smooth hover transitions */
    .hover-lift {
      transition:
        transform 0.2s ease-out,
        box-shadow 0.2s ease-out;
    }

    .hover-lift:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    /* Loading spinner */
    .spinner {
      border: 3px solid rgba(139, 90, 43, 0.1);
      border-left-color: #8b5a2b;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 0.8s linear infinite;
    }

    [data-theme="dark"] .spinner {
      border-color: rgba(255, 167, 38, 0.1);
      border-left-color: #ffa726;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Skeleton loader */
    .skeleton {
      background: linear-gradient(90deg, #f5f1ea 25%, #e8e1d5 50%, #f5f1ea 75%);
      background-size: 1000px 100%;
      animation: shimmer 1.5s ease-in-out infinite;
    }

    [data-theme="dark"] .skeleton {
      background: linear-gradient(90deg, #2d2d2d 25%, #3a3a3a 50%, #2d2d2d 75%);
      background-size: 1000px 100%;
    }

    /* Modal animations */
    .modal-enter {
      animation: modal-in 0.3s ease-out;
    }

    .modal-exit {
      animation: modal-out 0.2s ease-in;
    }

    @keyframes modal-in {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes modal-out {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(100%);
        opacity: 0;
      }
    }
  `}</style>
);

export default FontStyles;
