import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserPreferences } from "@/types";

/**
 * Get user preferences
 */
export async function getUserPreferences(
  userId: string,
  tenantId: string
): Promise<UserPreferences> {
  try {
    const prefRef = doc(db, "user_preferences", userId);
    const prefDoc = await getDoc(prefRef);

    if (prefDoc.exists()) {
      return prefDoc.data() as UserPreferences;
    }

    // Create default preferences if not exists
    const now = new Date().toISOString();
    const defaultPrefs: UserPreferences = {
      id: userId,
      tenant_id: tenantId,
      favorite_projects: [],
      created_at: now,
      updated_at: now,
    };

    await setDoc(prefRef, defaultPrefs);
    return defaultPrefs;
  } catch (error) {
    console.error("[T4U] Error fetching user preferences:", error);
    throw error;
  }
}

/**
 * Toggle project favorite status
 */
export async function toggleProjectFavorite(
  userId: string,
  tenantId: string,
  projectId: string
): Promise<string[]> {
  try {
    const prefs = await getUserPreferences(userId, tenantId);
    const favorites = new Set(prefs.favorite_projects);

    if (favorites.has(projectId)) {
      favorites.delete(projectId);
    } else {
      favorites.add(projectId);
    }

    const newFavorites = Array.from(favorites);
    const prefRef = doc(db, "user_preferences", userId);
    
    await setDoc(
      prefRef,
      {
        favorite_projects: newFavorites,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log("[T4U] Favorites updated for user:", userId);
    return newFavorites;
  } catch (error) {
    console.error("[T4U] Error toggling favorite:", error);
    throw error;
  }
}

