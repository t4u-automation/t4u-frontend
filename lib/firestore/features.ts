import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { Feature } from "@/types";
import { getFeatureStories } from "./stories";
import { deleteStory } from "./stories";

/**
 * Get all features for a project
 */
export async function getProjectFeatures(
  projectId: string,
  tenantId: string
): Promise<Feature[]> {
  try {
    const featuresRef = collection(db, "features");
    const q = query(
      featuresRef,
      where("project_id", "==", projectId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Feature[];
  } catch (error) {
    console.error("[T4U] Error fetching features:", error);
    throw error;
  }
}

/**
 * Create a new feature
 */
export async function createFeature(
  tenantId: string,
  projectId: string,
  userId: string,
  name: string,
  description?: string
): Promise<Feature> {
  try {
    const now = new Date().toISOString();
    const featureRef = doc(collection(db, "features"));

    const feature: any = {
      id: featureRef.id,
      tenant_id: tenantId,
      project_id: projectId,
      name,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };

    // Only add description if it's provided
    if (description) {
      feature.description = description;
    }

    await setDoc(featureRef, feature);
    console.log("[T4U] Feature created:", feature.id);
    return feature as Feature;
  } catch (error) {
    console.error("[T4U] Error creating feature:", error);
    throw error;
  }
}

/**
 * Update a feature's name
 */
export async function updateFeature(
  featureId: string,
  updates: Partial<Pick<Feature, "name" | "description">>
): Promise<void> {
  try {
    const featureRef = doc(db, "features", featureId);
    await setDoc(
      featureRef,
      {
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Feature updated:", featureId);
  } catch (error) {
    console.error("[T4U] Error updating feature:", error);
    throw error;
  }
}

/**
 * Delete a feature (permanently remove from database along with all child stories and test cases)
 */
export async function deleteFeature(
  featureId: string,
  tenantId: string
): Promise<void> {
  try {
    // Get all stories in this feature
    const stories = await getFeatureStories(featureId, tenantId);
    
    // Delete all stories and their test cases
    for (const story of stories) {
      await deleteStory(story.id, tenantId);
    }
    
    // Delete the feature
    const featureRef = doc(db, "features", featureId);
    await deleteDoc(featureRef);
    console.log("[T4U] Feature and all children deleted:", featureId);
  } catch (error) {
    console.error("[T4U] Error deleting feature:", error);
    throw error;
  }
}

/**
 * Get a single feature by ID
 */
export async function getFeatureById(featureId: string): Promise<Feature | null> {
  try {
    const featureRef = doc(db, "features", featureId);
    const featureDoc = await getDoc(featureRef);

    if (!featureDoc.exists()) {
      return null;
    }

    return {
      id: featureDoc.id,
      ...featureDoc.data(),
    } as Feature;
  } catch (error) {
    console.error("[T4U] Error fetching feature:", error);
    throw error;
  }
}

