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
import { Story } from "@/types";
import { getStoryTestCases, createTestCase } from "./testCases";
import { generateUniqueName } from "./helpers/naming";

/**
 * Get all stories for a feature
 */
export async function getFeatureStories(
  featureId: string,
  tenantId: string
): Promise<Story[]> {
  try {
    const storiesRef = collection(db, "stories");
    const q = query(
      storiesRef,
      where("feature_id", "==", featureId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Story[];
  } catch (error) {
    console.error("[T4U] Error fetching stories:", error);
    throw error;
  }
}

/**
 * Create a new story
 */
export async function createStory(
  tenantId: string,
  featureId: string,
  userId: string,
  name: string,
  description?: string
): Promise<Story> {
  try {
    const now = new Date().toISOString();
    const storyRef = doc(collection(db, "stories"));

    const story: any = {
      id: storyRef.id,
      tenant_id: tenantId,
      feature_id: featureId,
      name,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };

    // Only add description if it's provided
    if (description) {
      story.description = description;
    }

    await setDoc(storyRef, story);
    console.log("[T4U] Story created:", story.id);
    return story as Story;
  } catch (error) {
    console.error("[T4U] Error creating story:", error);
    throw error;
  }
}

/**
 * Update a story's name
 */
export async function updateStory(
  storyId: string,
  updates: Partial<Pick<Story, "name" | "description">>
): Promise<void> {
  try {
    const storyRef = doc(db, "stories", storyId);
    await setDoc(
      storyRef,
      {
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Story updated:", storyId);
  } catch (error) {
    console.error("[T4U] Error updating story:", error);
    throw error;
  }
}

/**
 * Delete a story (permanently remove from database along with all child test cases)
 */
export async function deleteStory(
  storyId: string,
  tenantId: string
): Promise<void> {
  try {
    // Get all test cases in this story
    const testCases = await getStoryTestCases(storyId, tenantId);
    
    // Delete all test cases
    for (const testCase of testCases) {
      const testCaseRef = doc(db, "test_cases", testCase.id);
      await deleteDoc(testCaseRef);
    }
    
    // Delete the story
    const storyRef = doc(db, "stories", storyId);
    await deleteDoc(storyRef);
    console.log("[T4U] Story and all test cases deleted:", storyId);
  } catch (error) {
    console.error("[T4U] Error deleting story:", error);
    throw error;
  }
}

/**
 * Clone a story (creates duplicate with all test cases in the same feature)
 */
export async function cloneStory(
  storyId: string,
  tenantId: string,
  userId: string
): Promise<Story> {
  try {
    // Get the original story
    const storyRef = doc(db, "stories", storyId);
    const storyDoc = await getDoc(storyRef);
    
    if (!storyDoc.exists()) {
      throw new Error("Story not found");
    }
    
    const originalStory = storyDoc.data() as Story;
    
    // Get all test cases in this story
    const originalTestCases = await getStoryTestCases(storyId, tenantId);
    
    // Get existing stories in the same feature to generate unique name
    const existingStories = await getFeatureStories(originalStory.feature_id, tenantId);
    const existingNames = existingStories.map((s) => s.name);
    const uniqueName = generateUniqueName(`${originalStory.name} (copy)`, existingNames);
    
    // Create cloned story
    const clonedStory = await createStory(
      tenantId,
      originalStory.feature_id,
      userId,
      uniqueName,
      originalStory.description
    );
    
    // Clone all test cases to the new story
    for (const testCase of originalTestCases) {
      await createTestCase(
        tenantId,
        clonedStory.id,
        userId,
        testCase.name,
        testCase.status_id,
        testCase.project_id,
        testCase.description,
        testCase.scenario
      );
    }
    
    console.log("[T4U] Story cloned:", clonedStory.id);
    return clonedStory;
  } catch (error) {
    console.error("[T4U] Error cloning story:", error);
    throw error;
  }
}

/**
 * Get a single story by ID
 */
export async function getStoryById(storyId: string): Promise<Story | null> {
  try {
    const storyRef = doc(db, "stories", storyId);
    const storyDoc = await getDoc(storyRef);

    if (!storyDoc.exists()) {
      return null;
    }

    return {
      id: storyDoc.id,
      ...storyDoc.data(),
    } as Story;
  } catch (error) {
    console.error("[T4U] Error fetching story:", error);
    throw error;
  }
}
