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
import { TestCase, TestCaseStep } from "@/types";
import { generateUniqueName } from "./helpers/naming";

/**
 * Get all test cases for a story
 */
export async function getStoryTestCases(
  storyId: string,
  tenantId: string
): Promise<TestCase[]> {
  try {
    const testCasesRef = collection(db, "test_cases");
    const q = query(
      testCasesRef,
      where("story_id", "==", storyId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TestCase[];
  } catch (error) {
    console.error("[T4U] Error fetching test cases:", error);
    throw error;
  }
}

/**
 * Create a new test case
 */
export async function createTestCase(
  tenantId: string,
  storyId: string,
  userId: string,
  name: string,
  statusId: string,
  projectId: string,
  description?: string,
  scenario?: string | TestCaseStep[]
): Promise<TestCase> {
  try {
    const now = new Date().toISOString();
    const testCaseRef = doc(collection(db, "test_cases"));

    const testCase: any = {
      id: testCaseRef.id,
      tenant_id: tenantId,
      project_id: projectId,
      story_id: storyId,
      name,
      status_id: statusId,
      scenario: scenario || "",
      created_at: now,
      updated_at: now,
      created_by: userId,
    };

    // Only add description if it's provided
    if (description) {
      testCase.description = description;
    }

    await setDoc(testCaseRef, testCase);
    console.log("[T4U] Test case created:", testCase.id);
    return testCase as TestCase;
  } catch (error) {
    console.error("[T4U] Error creating test case:", error);
    throw error;
  }
}

/**
 * Delete a test case (permanently remove from database)
 */
export async function deleteTestCase(testCaseId: string): Promise<void> {
  try {
    const testCaseRef = doc(db, "test_cases", testCaseId);
    await deleteDoc(testCaseRef);
    console.log("[T4U] Test case deleted:", testCaseId);
  } catch (error) {
    console.error("[T4U] Error deleting test case:", error);
    throw error;
  }
}

/**
 * Update test case status (change which status is assigned to a test case)
 */
export async function updateTestCaseStatusId(
  testCaseId: string,
  statusId: string
): Promise<void> {
  try {
    const testCaseRef = doc(db, "test_cases", testCaseId);
    await setDoc(
      testCaseRef,
      {
        status_id: statusId,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Test case status updated:", testCaseId, "to", statusId);
  } catch (error) {
    console.error("[T4U] Error updating test case status:", error);
    throw error;
  }
}

/**
 * Update test case fields (description, scenario, etc.)
 */
export async function updateTestCase(
  testCaseId: string,
  updates: Partial<Pick<TestCase, "name" | "description" | "scenario" | "status_id">>
): Promise<void> {
  try {
    const testCaseRef = doc(db, "test_cases", testCaseId);
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await setDoc(testCaseRef, updateData, { merge: true });
    console.log("[T4U] Test case updated:", testCaseId);
  } catch (error) {
    console.error("[T4U] Error updating test case:", error);
    throw error;
  }
}

/**
 * Clear proven steps from a test case
 */
export async function clearTestCaseProvenSteps(testCaseId: string): Promise<void> {
  try {
    const testCaseRef = doc(db, "test_cases", testCaseId);
    await setDoc(
      testCaseRef,
      {
        proven_steps: [],
        proven_steps_count: 0,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Proven steps cleared for test case:", testCaseId);
  } catch (error) {
    console.error("[T4U] Error clearing proven steps:", error);
    throw error;
  }
}

/**
 * Clone a test case (creates duplicate in the same story)
 */
export async function cloneTestCase(
  testCaseId: string,
  tenantId: string,
  userId: string
): Promise<TestCase> {
  try {
    // Get the original test case
    const testCaseRef = doc(db, "test_cases", testCaseId);
    const testCaseDoc = await getDoc(testCaseRef);
    
    if (!testCaseDoc.exists()) {
      throw new Error("Test case not found");
    }
    
    const originalTestCase = testCaseDoc.data() as TestCase;
    
    // Get existing test cases in the same story to generate unique name
    const existingTestCases = await getStoryTestCases(originalTestCase.story_id, tenantId);
    const existingNames = existingTestCases.map((tc) => tc.name);
    const uniqueName = generateUniqueName(`${originalTestCase.name} (copy)`, existingNames);
    
    // Create cloned test case
    const clonedTestCase = await createTestCase(
      tenantId,
      originalTestCase.story_id,
      userId,
      uniqueName,
      originalTestCase.status_id,
      originalTestCase.project_id,
      originalTestCase.description,
      originalTestCase.scenario
    );
    
    console.log("[T4U] Test case cloned:", clonedTestCase.id);
    return clonedTestCase;
  } catch (error) {
    console.error("[T4U] Error cloning test case:", error);
    throw error;
  }
}

/**
 * Move a test case to another project (also moves parent Story and Feature)
 */
export async function moveTestCaseToProject(
  testCaseId: string,
  targetProjectId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  try {
    const { getFeatureById } = await import('./features');
    const { getProjectFeatures } = await import('./features');
    const { getFeatureStories } = await import('./stories');
    const { createFeature } = await import('./features');
    const { createStory } = await import('./stories');

    // Get the test case
    const testCaseRef = doc(db, "test_cases", testCaseId);
    const testCaseDoc = await getDoc(testCaseRef);
    
    if (!testCaseDoc.exists()) {
      throw new Error("Test case not found");
    }
    
    const testCase = testCaseDoc.data() as TestCase;
    
    // Get parent story
    const { getStoryById } = await import('./stories');
    const story = await getStoryById(testCase.story_id);
    
    if (!story) {
      throw new Error("Parent story not found");
    }
    
    // Get parent feature
    const feature = await getFeatureById(story.feature_id);
    
    if (!feature) {
      throw new Error("Parent feature not found");
    }
    
    // Get existing features in target project
    const targetFeatures = await getProjectFeatures(targetProjectId, tenantId);
    const targetFeatureNames = targetFeatures.map((f) => f.name);
    const uniqueFeatureName = generateUniqueName(feature.name, targetFeatureNames);
    
    // Create feature in target project
    const newFeature = await createFeature(
      tenantId,
      targetProjectId,
      userId,
      uniqueFeatureName,
      feature.description
    );
    
    // Get existing stories in new feature
    const targetStories = await getFeatureStories(newFeature.id, tenantId);
    const targetStoryNames = targetStories.map((s) => s.name);
    const uniqueStoryName = generateUniqueName(story.name, targetStoryNames);
    
    // Create story in new feature
    const newStory = await createStory(
      tenantId,
      newFeature.id,
      userId,
      uniqueStoryName,
      story.description
    );
    
    // Update test case to point to new story
    const testCaseUpdateRef = doc(db, "test_cases", testCaseId);
    await setDoc(
      testCaseUpdateRef,
      {
        story_id: newStory.id,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    
    console.log("[T4U] Test case moved to project:", targetProjectId);
  } catch (error) {
    console.error("[T4U] Error moving test case:", error);
    throw error;
  }
}

/**
 * Get a single test case by ID
 */
export async function getTestCaseById(testCaseId: string): Promise<TestCase | null> {
  try {
    const testCaseRef = doc(db, "test_cases", testCaseId);
    const testCaseDoc = await getDoc(testCaseRef);

    if (!testCaseDoc.exists()) {
      return null;
    }

    return {
      id: testCaseDoc.id,
      ...testCaseDoc.data(),
    } as TestCase;
  } catch (error) {
    console.error("[T4U] Error fetching test case:", error);
    throw error;
  }
}
