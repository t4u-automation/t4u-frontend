import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

/**
 * Firestore Trigger: Update project stats when test_cases are created or deleted
 */
export const updateProjectStatsOnTestCase = functions.firestore
  .document("test_cases/{testCaseId}")
  .onWrite(async (change, context) => {
    try {
      const testCaseId = context.params.testCaseId;
      
      // Get the test case data (before for delete, after for create)
      const testCaseData = change.after.exists ? change.after.data() : change.before.data();
      
      if (!testCaseData) {
        console.log("No test case data found");
        return;
      }

      const tenantId = testCaseData.tenant_id;
      
      // Get project_id directly from test case data (now stored in schema)
      let projectId = testCaseData.project_id;

      // If test case was deleted, remove it from all test plans
      if (change.before.exists && !change.after.exists) {
        await removeTestCaseFromTestPlans(testCaseId, tenantId);
      }

      // Fallback: if project_id not in test case data (old records), try story/feature chain
      if (!projectId) {
        const storyId = testCaseData.story_id;
        const storyDoc = await db.collection("stories").doc(storyId).get();
        
        if (!storyDoc.exists) {
          console.log("Story not found and no project_id in test case, skipping stats update");
          return;
        }

        const storyData = storyDoc.data();
        if (!storyData) {
          console.log("Story data is empty");
          return;
        }

        const featureId = storyData.feature_id;
        const featureDoc = await db.collection("features").doc(featureId).get();
        
        if (!featureDoc.exists) {
          console.log("Feature not found:", featureId);
          return;
        }

        const featureData = featureDoc.data();
        if (!featureData) {
          console.log("Feature data is empty");
          return;
        }

        projectId = featureData.project_id;
      }

      // Now count all features, stories, and test cases for this project
      if (projectId) {
        await updateProjectStats(projectId, tenantId);
      }

      console.log(`Project stats updated for project: ${projectId}`);
    } catch (error) {
      console.error("Error updating project stats:", error);
    }
  });

/**
 * Helper function to count and update project stats
 */
async function updateProjectStats(projectId: string, tenantId: string): Promise<void> {
  // Count features for this project
  const featuresSnapshot = await db
    .collection("features")
    .where("project_id", "==", projectId)
    .where("tenant_id", "==", tenantId)
    .get();

  const featuresCount = featuresSnapshot.size;

  // Get all feature IDs
  const featureIds = featuresSnapshot.docs.map((doc) => doc.id);

  let storiesCount = 0;
  let testCasesCount = 0;

  if (featureIds.length > 0) {
    // Count stories for all features in this project
    // Firestore doesn't support array-contains with 'in' operator, so we batch
    const batchSize = 10; // Firestore 'in' query limit
    
    for (let i = 0; i < featureIds.length; i += batchSize) {
      const batch = featureIds.slice(i, i + batchSize);
      
      const storiesSnapshot = await db
        .collection("stories")
        .where("feature_id", "in", batch)
        .where("tenant_id", "==", tenantId)
        .get();

      storiesCount += storiesSnapshot.size;

      // Get all story IDs from this batch
      const storyIds = storiesSnapshot.docs.map((doc) => doc.id);

      if (storyIds.length > 0) {
        // Count test cases for all stories in this batch
        for (let j = 0; j < storyIds.length; j += batchSize) {
          const storyBatch = storyIds.slice(j, j + batchSize);
          
          const testCasesSnapshot = await db
            .collection("test_cases")
            .where("story_id", "in", storyBatch)
            .where("tenant_id", "==", tenantId)
            .get();

          testCasesCount += testCasesSnapshot.size;
        }
      }
    }
  }

  // Update the project document with stats
  await db.collection("projects").doc(projectId).update({
    stats: {
      features: featuresCount,
      stories: storiesCount,
      test_cases: testCasesCount,
    },
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Updated stats for project ${projectId}: Features=${featuresCount}, Stories=${storiesCount}, TestCases=${testCasesCount}`);
}

/**
 * Helper function to remove a test case from all test plans
 */
async function removeTestCaseFromTestPlans(
  testCaseId: string, 
  tenantId: string
): Promise<void> {
  try {
    // Find all test plans that contain this test case
    const testPlansSnapshot = await db
      .collection("test_plans")
      .where("tenant_id", "==", tenantId)
      .where("test_case_ids", "array-contains", testCaseId)
      .get();

    if (testPlansSnapshot.empty) {
      console.log(`Test case ${testCaseId} not found in any test plans`);
      return;
    }

    // Update each test plan to remove the test case
    const batch = db.batch();
    
    testPlansSnapshot.forEach((doc) => {
      const testPlanData = doc.data();
      const currentTestCaseIds = testPlanData.test_case_ids || [];
      
      // Remove the deleted test case ID from the array
      const updatedTestCaseIds = currentTestCaseIds.filter((id: string) => id !== testCaseId);
      
      batch.update(doc.ref, {
        test_case_ids: updatedTestCaseIds,
        test_cases_count: updatedTestCaseIds.length,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`Removed test case ${testCaseId} from ${testPlansSnapshot.size} test plan(s)`);
  } catch (error) {
    console.error("Error removing test case from test plans:", error);
    throw error;
  }
}

