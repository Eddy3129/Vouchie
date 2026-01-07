"use client";

import React, { useEffect, useRef, useState } from "react";

interface Tab {
  id: string;
  label: React.ReactNode;
}

interface SlidingTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

const SlidingTabs = ({ tabs, activeTab, onChange, className = "" }: SlidingTabsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [tabStyle, setTabStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const index = tabs.findIndex(t => t.id === activeTab);
    setActiveIndex(index === -1 ? 0 : index);
  }, [activeTab, tabs]);

  useEffect(() => {
    const currentTab = tabsRef.current[activeIndex];
    if (currentTab) {
      setTabStyle({
        left: currentTab.offsetLeft,
        width: currentTab.clientWidth,
      });
    }
  }, [activeIndex, tabs.length]);

  return (
    <div className={`relative flex p-1 bg-stone-100 dark:bg-stone-800 rounded-full ${className}`}>
      {/* Sliding Capsule Background */}
      <div
        className="absolute top-1 bottom-1 bg-white dark:bg-stone-700 shadow-sm rounded-full transition-all duration-300 ease-out"
        style={{
          left: tabStyle.left,
          width: tabStyle.width,
        }}
      />

      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={el => {
            tabsRef.current[index] = el;
          }}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 py-3 text-sm font-bold z-10 transition-colors duration-200 flex items-center justify-center gap-2 ${
            activeTab === tab.id
              ? "text-stone-800 dark:text-white"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default SlidingTabs;
