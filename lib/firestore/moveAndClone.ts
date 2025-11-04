import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Feature, Story } from "@/types";
import { generateUniqueName } from "./helpers/naming";
import { getProjectFeatures, createFeature, deleteFeature } from "./features";
import { getFeatureStories, createStory, deleteStory } from "./stories";
import { getStoryTestCases, createTestCase } from "./testCases";

/**
 * Move a story to another project (also moves parent Feature and all test cases)
 */
export async function moveStoryToProject(
  storyId: string,
  targetProjectId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  try {
    // Get the story
    const { getStoryById } = await import('./stories');
    const story = await getStoryById(storyId);
    
    if (!story) {
      throw new Error("Story not found");
    }
    
    // Get parent feature
    const { getFeatureById } = await import('./features');
    const feature = await getFeatureById(story.feature_id);
    
    if (!feature) {
      throw new Error("Parent feature not found");
    }
    
    // Get all test cases in this story
    const testCases = await getStoryTestCases(storyId, tenantId);
    
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
    
    // Move all test cases to new story
    for (const testCase of testCases) {
      const testCaseRef = doc(db, "test_cases", testCase.id);
      await setDoc(
        testCaseRef,
        {
          story_id: newStory.id,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    
    // Delete old story (cascade deletes test cases)
    await deleteStory(storyId, tenantId);
    
    console.log("[T4U] Story moved to project:", targetProjectId);
  } catch (error) {
    console.error("[T4U] Error moving story:", error);
    throw error;
  }
}

/**
 * Move a feature to another project (also moves all stories and test cases)
 */
export async function moveFeatureToProject(
  featureId: string,
  targetProjectId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  try {
    // Get the feature
    const { getFeatureById } = await import('./features');
    const feature = await getFeatureById(featureId);
    
    if (!feature) {
      throw new Error("Feature not found");
    }
    
    // Get all stories in this feature
    const stories = await getFeatureStories(featureId, tenantId);
    
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
    
    // Move all stories and their test cases
    for (const story of stories) {
      // Get all test cases for this story
      const testCases = await getStoryTestCases(story.id, tenantId);
      
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
      
      // Move all test cases to new story
      for (const testCase of testCases) {
        const testCaseRef = doc(db, "test_cases", testCase.id);
        await setDoc(
          testCaseRef,
          {
            story_id: newStory.id,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      
      // Delete old story (cascade deletes test cases)
      await deleteStory(story.id, tenantId);
    }
    
    // Delete old feature
    await deleteFeature(featureId, tenantId);
    
    console.log("[T4U] Feature moved to project:", targetProjectId);
  } catch (error) {
    console.error("[T4U] Error moving feature:", error);
    throw error;
  }
}

/**
 * Clone a feature (creates duplicate with all stories and test cases in the same project)
 */
export async function cloneFeature(
  featureId: string,
  projectId: string,
  tenantId: string,
  userId: string
): Promise<Feature> {
  try {
    // Get the original feature
    const { getFeatureById } = await import('./features');
    const originalFeature = await getFeatureById(featureId);
    
    if (!originalFeature) {
      throw new Error("Feature not found");
    }
    
    // Get all stories in this feature
    const originalStories = await getFeatureStories(featureId, tenantId);
    
    // Get existing features in the same project to generate unique name
    const existingFeatures = await getProjectFeatures(projectId, tenantId);
    const existingNames = existingFeatures.map((f) => f.name);
    const uniqueName = generateUniqueName(`${originalFeature.name} (copy)`, existingNames);
    
    // Create cloned feature
    const clonedFeature = await createFeature(
      tenantId,
      projectId,
      userId,
      uniqueName,
      originalFeature.description
    );
    
    // Clone all stories and their test cases
    for (const story of originalStories) {
      // Get all test cases for this story
      const originalTestCases = await getStoryTestCases(story.id, tenantId);
      
      // Create cloned story
      const clonedStory = await createStory(
        tenantId,
        clonedFeature.id,
        userId,
        story.name,
        story.description
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
    }
    
    console.log("[T4U] Feature cloned:", clonedFeature.id);
    return clonedFeature;
  } catch (error) {
    console.error("[T4U] Error cloning feature:", error);
    throw error;
  }
}
