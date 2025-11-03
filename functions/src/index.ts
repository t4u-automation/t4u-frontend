import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import type { BeforeCreateResponse, BeforeSignInResponse } from "firebase-functions/lib/common/providers/identity";

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

// ============================================
// Helper Functions for Blocking Functions
// ============================================

/**
 * Check if user has a pending invitation
 */
async function findPendingInvitation(email: string | null | undefined): Promise<any | null> {
  if (!email) {
    return null;
  }

  try {
    const invitationQuery = await db
      .collection("invitations")
      .where("email", "==", email.toLowerCase())
      .where("status", "==", "pending")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (invitationQuery.empty) {
      return null;
    }

    const invitationDoc = invitationQuery.docs[0];
    const invitation = invitationDoc.data();

    // Check if invitation has expired (optional - 7 days default)
    const expiresAt = invitation.expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      console.log(`Invitation for ${email} has expired`);
      await invitationDoc.ref.update({ status: "expired" });
      return null;
    }

    return {
      id: invitationDoc.id,
      ...invitation,
    };
  } catch (error) {
    console.error("Error finding invitation:", error);
    return null;
  }
}

/**
 * Create a new tenant for a user (owner flow)
 */
async function createNewTenantForUser(displayName: string, userId: string): Promise<string> {
  const tenantRef = db.collection("tenants").doc();
  const tenantId = tenantRef.id;

  await tenantRef.set({
    name: `${displayName}'s Team`, // Temporary name, user will update during onboarding
    owner_id: userId,
    is_active: true,
    needs_setup: true, // Flag to show company name input
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Created new tenant ${tenantId} for user ${userId}`);

  // Create default test case statuses for the new tenant
  await createDefaultTestCaseStatuses(tenantId);

  return tenantId;
}

/**
 * Create default test case statuses for a tenant
 */
async function createDefaultTestCaseStatuses(tenantId: string): Promise<void> {
  const defaultStatuses = [
    { name: "Draft", color: "#6B7280", order: 0 },
    { name: "Active", color: "#10B981", order: 1 },
  ];

  const batch = db.batch();

  for (const status of defaultStatuses) {
    const statusRef = db.collection("test_case_statuses").doc();
    batch.set(statusRef, {
      id: statusRef.id,
      name: status.name,
      color: status.color,
      order: status.order,
      tenant_id: tenantId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`Created default test case statuses for tenant ${tenantId}`);
}

// ============================================
// Blocking Functions
// ============================================

/**
 * Blocking Function 1: beforeUserCreated
 * 
 * Triggers ONLY on new user creation (first signup).
 * Handles tenant assignment:
 * - If user has a pending invitation → join existing tenant
 * - If no invitation → create new tenant (owner)
 * 
 * Returns custom claims (tenant_id, role) which are added to the ID token.
 */
// @ts-expect-error - Firebase types are incorrectly defined, this is the correct usage per docs
export const setupNewUser = beforeUserCreated(async (event): Promise<BeforeCreateResponse | void> => {
  const userEmail = event.data.email;
  const displayName = event.data.displayName || "User";
  const userId = event.data.uid;

  console.log(`[setupNewUser] Processing new user: ${userEmail}`);

  try {
    // Step 1: Check if user has a pending invitation
    const invitation = await findPendingInvitation(userEmail);

    if (invitation) {
      // User was invited - join existing tenant
      console.log(`[setupNewUser] User ${userEmail} joining tenant ${invitation.tenant_id} via invitation`);

      // Mark invitation as accepted
      await db.collection("invitations").doc(invitation.id).update({
        status: "accepted",
        accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        accepted_by_user_id: userId,
      });

      // Return custom claims for the invited user
      return {
        customClaims: {
          tenant_id: invitation.tenant_id,
          role: invitation.role || "member",
        },
      };
    }

    // Step 2: No invitation - create new tenant (owner flow)
    console.log(`[setupNewUser] Creating new tenant for ${userEmail}`);
    const tenantId = await createNewTenantForUser(displayName, userId);

    // Return custom claims for the owner
    return {
      customClaims: {
        tenant_id: tenantId,
        role: "owner",
      },
    };
  } catch (error) {
    console.error("[setupNewUser] Error:", error);
    // Don't block user creation, but they'll need to contact support
    // They can still sign in but won't have a tenant
    return;
  }
});

/**
 * Blocking Function 2: beforeUserSignedIn
 * 
 * Triggers on EVERY sign-in (including first sign-in after creation).
 * 
 * For NEW users (first sign-in):
 * - Creates Firestore user document using custom claims from setupNewUser
 * 
 * For EXISTING users:
 * - Returns custom claims from Firestore user document
 * 
 * This ensures the ID token always has the tenant_id claim for security rules.
 */
// @ts-expect-error - Firebase types are incorrectly defined, this is the correct usage per docs
export const addTenantClaim = beforeUserSignedIn(async (event): Promise<BeforeSignInResponse | void> => {
  const userId = event.data.uid;
  const userEmail = event.data.email;
  const displayName = event.data.displayName;

  console.log(`[addTenantClaim] Processing sign-in for user: ${userEmail}`);

  try {
    // Fetch user document from Firestore
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      // NEW USER: First sign-in after creation
      // Get tenant_id and role from custom claims set by setupNewUser
      const tenantId = event.data.customClaims?.tenant_id;
      const role = event.data.customClaims?.role;

      if (!tenantId) {
        // No tenant_id in claims - something went wrong in setupNewUser
        console.error(`[addTenantClaim] No tenant_id claim found for new user ${userId}`);
        return;
      }

      console.log(`[addTenantClaim] Creating Firestore user document for ${userId} in tenant ${tenantId}`);

      // Create Firestore user document
      await db.collection("users").doc(userId).set({
        id: userId,
        email: userEmail,
        display_name: displayName,
        tenant_id: tenantId,
        role: role || "member",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        last_login_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Claims already set by setupNewUser, just return them
      return {
        customClaims: {
          tenant_id: tenantId,
          role: role || "member",
        },
      };
    }

    // EXISTING USER: Return claims from Firestore
    const userData = userDoc.data();

    if (!userData || !userData.tenant_id) {
      console.error(`[addTenantClaim] User ${userId} exists but has no tenant_id`);
      return;
    }

    console.log(`[addTenantClaim] Existing user ${userId} signing in to tenant ${userData.tenant_id}`);

    // Update last login timestamp
    await db.collection("users").doc(userId).update({
      last_login_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return custom claims from Firestore
    return {
      customClaims: {
        tenant_id: userData.tenant_id,
        role: userData.role || "member",
      },
    };
  } catch (error) {
    console.error("[addTenantClaim] Error:", error);
    // Allow sign-in to continue even if there's an error
    return;
  }
});

