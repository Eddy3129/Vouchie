"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

/**
 * Site header - Vouchie, 1st Social Productivity App
 */
export const Header = () => {
  return (
    <div className="py-4 sticky top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-md shadow-secondary px-2 sm:px-4">
      <div className="navbar-start w-auto">
        <Link href="/" passHref className="flex items-center gap-2 shrink-0">
          <div className="flex relative w-10 h-10 sm:w-10 sm:h-10">
            <Image alt="Vouchie logo" className="cursor-pointer" fill src="/logo.png" priority sizes="40px" />
          </div>
          <span className="font-bold text-xl sm:text-xl leading-tight">Vouchie</span>
        </Link>
      </div>
      <div className="navbar-end grow justify-end">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
