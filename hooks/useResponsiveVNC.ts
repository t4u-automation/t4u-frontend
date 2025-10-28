"use client";

import { useEffect, useState } from "react";

export function useResponsiveVNC() {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showVNCDropdown, setShowVNCDropdown] = useState(false);
  const [hasOpenedDropdown, setHasOpenedDropdown] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1024;
      setIsSmallScreen(isSmall);

      // If screen becomes large, close dropdown and reset state
      if (!isSmall) {
        setShowVNCDropdown(false);
        setHasOpenedDropdown(false);
      }
    };

    // Check initial screen size
    checkScreenSize();

    // Listen for window resize
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const openVNCDropdown = () => {
    setShowVNCDropdown(true);
    setHasOpenedDropdown(true);
  };

  const closeVNCDropdown = () => {
    setShowVNCDropdown(false);
    // Keep hasOpenedDropdown true to maintain DOM
  };

  return {
    isSmallScreen,
    showVNCDropdown,
    hasOpenedDropdown,
    openVNCDropdown,
    closeVNCDropdown,
  };
}
