"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserPreferences } from "@/types";
import { getUserPreferences, toggleProjectFavorite } from "@/lib/firestore/userPreferences";

export function useUserPreferences(userId: string | undefined, tenantId: string | undefined) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !tenantId) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for preferences
    const prefRef = doc(db, "user_preferences", userId);
    const unsubscribe = onSnapshot(
      prefRef,
      async (doc) => {
        if (doc.exists()) {
          setPreferences(doc.data() as UserPreferences);
          setLoading(false);
        } else {
          // Create default preferences if they don't exist
          try {
            const prefs = await getUserPreferences(userId, tenantId);
            setPreferences(prefs);
            setLoading(false);
          } catch (error) {
            console.error("[useUserPreferences] Error creating preferences:", error);
            setPreferences(null);
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error("[useUserPreferences] ❌ PERMISSION ERROR - userId:", userId, "tenantId:", tenantId);
        console.error("[useUserPreferences] Full error:", error);
        setPreferences(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, tenantId]);

  const toggleFavorite = async (projectId: string) => {
    if (!userId || !tenantId) return;

    try {
      const newFavorites = await toggleProjectFavorite(userId, tenantId, projectId);
      // The real-time listener will update the state automatically
      console.log("[useUserPreferences] Favorite toggled:", projectId);
    } catch (error) {
      console.error("[useUserPreferences] Error toggling favorite:", error);
      throw error;
    }
  };

  return {
    preferences,
    loading,
    favoriteProjects: preferences?.favorite_projects || [],
    toggleFavorite,
  };
}

