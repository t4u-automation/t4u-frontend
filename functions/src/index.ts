import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import type { BeforeCreateResponse, BeforeSignInResponse } from "firebase-functions/lib/common/providers/identity";

admin.initializeApp();

const db = admin.firestore();

// Configuration using environment variables (works with both v1 and v2 functions)
const DEFAULT_APP_BASE_URL = "https://t4u.dev";
const DEFAULT_INVITATION_PATH = "/login";
const DEFAULT_FROM_EMAIL = "no-reply@t4u.dev";
const DEFAULT_FROM_NAME = "T4U";

// For v1 functions, we'll access config dynamically when needed
// For v2 functions (blocking functions), only environment variables work
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || DEFAULT_FROM_EMAIL;
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || DEFAULT_FROM_NAME;
const APP_BASE_URL = process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL;
const INVITATION_PATH = process.env.INVITATION_PATH || DEFAULT_INVITATION_PATH;

const IS_SENDGRID_CONFIGURED = typeof SENDGRID_API_KEY === "string" && SENDGRID_API_KEY.length > 0;

if (IS_SENDGRID_CONFIGURED) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("[init] SendGrid API key not configured; invitation emails are disabled.");
}

function normalizeBaseUrl(baseUrl: string): string {
  if (!/^https?:\/\//i.test(baseUrl)) {
    return `https://${baseUrl}`;
  }
  return baseUrl;
}

function buildInvitationUrl(invitationId: string, email?: string | null): string {
  const normalizedBase = normalizeBaseUrl(APP_BASE_URL);
  const targetPath = INVITATION_PATH || DEFAULT_INVITATION_PATH;
  const invitationUrl = new URL(targetPath, normalizedBase);
  invitationUrl.searchParams.set("invitation", invitationId);

  if (email) {
    invitationUrl.searchParams.set("email", email.toLowerCase());
  }

  return invitationUrl.toString();
}

async function getTenantDisplayName(tenantId: string | undefined): Promise<string> {
  if (!tenantId) {
    return "your T4U workspace";
  }

  try {
    const tenantDoc = await db.collection("tenants").doc(tenantId).get();

    if (tenantDoc.exists) {
      const tenantData = tenantDoc.data() as { name?: string } | undefined;
      if (tenantData?.name) {
        return tenantData.name;
      }
    }
  } catch (error) {
    console.error(`[sendInvitationEmail] Failed to fetch tenant ${tenantId}:`, error);
  }

  return "your T4U workspace";
}

async function getInviterDisplayName(inviterUserId: string | undefined): Promise<string | null> {
  if (!inviterUserId) {
    return null;
  }

  try {
    const inviterDoc = await db.collection("users").doc(inviterUserId).get();

    if (inviterDoc.exists) {
      const inviterData = inviterDoc.data() as { display_name?: string; email?: string } | undefined;

      if (inviterData?.display_name) {
        return inviterData.display_name;
      }

      if (inviterData?.email) {
        return inviterData.email;
      }
    }
  } catch (error) {
    console.error(`[sendInvitationEmail] Failed to fetch inviter ${inviterUserId}:`, error);
  }

  return null;
}

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
// Invitation Email Trigger
// ============================================

export const sendInvitationEmail = functions.firestore
  .document("invitations/{invitationId}")
  .onCreate(async (snapshot, context) => {
    const invitationId = context.params.invitationId;

    // For v1 functions, try to get SendGrid API key from config if not in env
    let sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      try {
        const config = functions.config();
        sendgridApiKey = config?.sendgrid?.api_key;
        if (sendgridApiKey) {
          sgMail.setApiKey(sendgridApiKey);
        }
      } catch (error) {
        console.warn("[sendInvitationEmail] Could not access functions.config():", error);
      }
    }

    if (!sendgridApiKey) {
      console.warn(
        `[sendInvitationEmail] SendGrid API key not configured; skipping invitation ${invitationId}`
      );
      return;
    }

    const invitation = snapshot.data();

    if (!invitation) {
      console.warn(`[sendInvitationEmail] Invitation ${invitationId} has no data; skipping email.`);
      return;
    }

    const email = (invitation.email as string | undefined)?.toLowerCase();
    const status = invitation.status as string | undefined;
    const tenantId = invitation.tenant_id as string | undefined;
    const invitedBy = invitation.invited_by as string | undefined;

    if (!email) {
      console.error(`[sendInvitationEmail] Invitation ${invitationId} is missing an email value.`);
      return;
    }

    if (status && status !== "pending") {
      console.log(
        `[sendInvitationEmail] Invitation ${invitationId} has status ${status}; not sending email.`
      );
      return;
    }

    const invitationUrl = buildInvitationUrl(invitationId, email);

    try {
      const [tenantName, inviterName] = await Promise.all([
        getTenantDisplayName(tenantId),
        getInviterDisplayName(invitedBy),
      ]);

      const subjectWorkspaceName =
        tenantName === "your T4U workspace" ? "T4U" : tenantName;

      const subject = inviterName
        ? `${inviterName} invited you to join ${subjectWorkspaceName} on T4U`
        : `You're invited to join ${subjectWorkspaceName} on T4U`;

      const textLines = [
        "Hello,",
        "",
        inviterName
          ? `${inviterName} has invited you to join ${tenantName} on T4U.`
          : `You have been invited to join ${tenantName} on T4U.`,
        "",
        `Accept your invitation: ${invitationUrl}`,
        "",
        "If you did not expect this invitation, you can ignore this email.",
      ].filter(Boolean) as string[];

      const text = textLines.join("\n");

      const html = `
        <p>Hello,</p>
        <p>${
          inviterName
            ? `<strong>${inviterName}</strong> has invited you`
            : "You have been invited"
        } to join <strong>${tenantName}</strong> on T4U.</p>
        <p>
          <a href="${invitationUrl}" style="display:inline-block;padding:12px 20px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">
            Accept invitation
          </a>
        </p>
        <p>Or copy and paste this link into your browser:<br/><a href="${invitationUrl}">${invitationUrl}</a></p>
        <p>If you did not expect this invitation, you can ignore this email.</p>
      `;

      const msg = {
        to: email,
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        subject,
        text,
        html,
      };

      await sgMail.send(msg);

      await snapshot.ref.set(
        {
          last_email_attempt_at: admin.firestore.FieldValue.serverTimestamp(),
          last_email_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          last_email_error: admin.firestore.FieldValue.delete(),
          send_count: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      );

      console.log(
        `[sendInvitationEmail] Invitation email sent to ${email} for invitation ${invitationId}`
      );
    } catch (error) {
      console.error(`[sendInvitationEmail] Failed to send invitation ${invitationId}:`, error);

      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

      await snapshot.ref.set(
        {
          last_email_attempt_at: admin.firestore.FieldValue.serverTimestamp(),
          last_email_error: errorMessage,
          send_count: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
      );
    }
  });

// ============================================
// Helper Functions for Blocking Functions
// ============================================

/**
 * Check if user has a pending invitation
 */
async function findPendingInvitation(email: string | null | undefined): Promise<any | null> {
  if (!email) {
    console.log("[findPendingInvitation] No email provided");
    return null;
  }

  const normalizedEmail = email.toLowerCase();
  console.log(`[findPendingInvitation] Searching for invitation for: ${normalizedEmail}`);

  try {
    const invitationQuery = await db
      .collection("invitations")
      .where("email", "==", normalizedEmail)
      .where("status", "==", "pending")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    console.log(`[findPendingInvitation] Found ${invitationQuery.size} pending invitations`);

    if (invitationQuery.empty) {
      console.log(`[findPendingInvitation] No pending invitation found for ${normalizedEmail}`);
      return null;
    }

    const invitationDoc = invitationQuery.docs[0];
    const invitation = invitationDoc.data();

    console.log(`[findPendingInvitation] Found invitation ${invitationDoc.id} for tenant ${invitation.tenant_id}`);

    // Check if invitation has expired (optional - 7 days default)
    const expiresAt = invitation.expires_at;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      console.log(`[findPendingInvitation] Invitation for ${normalizedEmail} has expired`);
      await invitationDoc.ref.update({ status: "expired" });
      return null;
    }

    return {
      id: invitationDoc.id,
      ...invitation,
    };
  } catch (error) {
    console.error("[findPendingInvitation] Error finding invitation:", error);
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
// User Management Functions
// ============================================

/**
 * Firestore Trigger: Delete user from Firebase Auth when user doc is deleted
 * Security rules ensure only owners/admins can delete user docs
 */
export const deleteUserFromAuth = functions.firestore
  .document("users/{userId}")
  .onDelete(async (snapshot, context) => {
    const userId = context.params.userId;
    const userData = snapshot.data();

    console.log(`[deleteUserFromAuth] User document deleted for ${userId} (${userData?.email})`);

    // Additional safety check: Don't delete tenant owners
    if (userData?.role === "owner") {
      console.error(`[deleteUserFromAuth] Attempted to delete owner ${userId}, skipping Auth deletion`);
      return;
    }

    try {
      // Delete user from Firebase Auth
      await admin.auth().deleteUser(userId);
      console.log(`[deleteUserFromAuth] Successfully deleted Firebase Auth user ${userId}`);
    } catch (error: any) {
      // Log error but don't fail - Firestore doc is already deleted
      if (error.code === "auth/user-not-found") {
        console.log(`[deleteUserFromAuth] User ${userId} already deleted from Auth`);
      } else {
        console.error(`[deleteUserFromAuth] Failed to delete Auth user ${userId}:`, error);
      }
    }
  });

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
  const displayName = event.data.displayName || userEmail || "User";
  const userId = event.data.uid;

  console.log(`[setupNewUser] Processing new user: ${userEmail}`);

  try {
    // Step 1: Check if user has a pending invitation
    console.log(`[setupNewUser] Checking for pending invitation for ${userEmail}`);
    const invitation = await findPendingInvitation(userEmail);

    if (invitation) {
      // User was invited - join existing tenant
      console.log(`[setupNewUser] ✅ User ${userEmail} joining tenant ${invitation.tenant_id} via invitation ${invitation.id} with role ${invitation.role}`);

      // Mark invitation as accepted
      await db.collection("invitations").doc(invitation.id).update({
        status: "accepted",
        accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        accepted_by_user_id: userId,
      });

      console.log(`[setupNewUser] Invitation ${invitation.id} marked as accepted`);

      // Return custom claims for the invited user
      return {
        customClaims: {
          tenant_id: invitation.tenant_id,
          role: invitation.role || "member",
        },
      };
    }

    // Step 2: No invitation - create new tenant (owner flow)
    console.log(`[setupNewUser] ⚠️ No invitation found, creating new tenant for ${userEmail}`);
    const tenantId = await createNewTenantForUser(displayName, userId);

    console.log(`[setupNewUser] Created new tenant ${tenantId} for user ${userId} as owner`);

    // Return custom claims for the owner
    return {
      customClaims: {
        tenant_id: tenantId,
        role: "owner",
      },
    };
  } catch (error) {
    console.error("[setupNewUser] ❌ Error:", error);
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
  const displayName = event.data.displayName || userEmail || "User";

  console.log(`[addTenantClaim] Processing sign-in for user: ${userEmail}`);

  try {
    // Fetch user document from Firestore
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      // NEW USER: First sign-in after creation
      // First, check if there's a pending invitation (fallback if setupNewUser didn't handle it)
      console.log(`[addTenantClaim] New user ${userEmail}, checking for pending invitation`);
      const invitation = await findPendingInvitation(userEmail);

      let tenantId: string | undefined;
      let role: string;

      if (invitation) {
        // Found invitation - use invitation's tenant and role
        console.log(`[addTenantClaim] 🎉 Found pending invitation for ${userEmail}, joining tenant ${invitation.tenant_id}`);
        tenantId = invitation.tenant_id;
        role = invitation.role || "member";

        // Mark invitation as accepted
        await db.collection("invitations").doc(invitation.id).update({
          status: "accepted",
          accepted_at: admin.firestore.FieldValue.serverTimestamp(),
          accepted_by_user_id: userId,
        });
      } else {
        // No invitation - use claims from setupNewUser
        tenantId = event.data.customClaims?.tenant_id;
        role = event.data.customClaims?.role || "member";

        if (!tenantId) {
          // No tenant_id in claims and no invitation - something went wrong
          console.error(`[addTenantClaim] No tenant_id claim found and no invitation for new user ${userId}`);
          return;
        }
      }

      console.log(`[addTenantClaim] Creating Firestore user document for ${userId} in tenant ${tenantId} with role ${role}`);

      // Create Firestore user document
      await db.collection("users").doc(userId).set({
        id: userId,
        email: userEmail,
        display_name: displayName,
        tenant_id: tenantId,
        role: role,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        last_login_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Return the correct claims
      return {
        customClaims: {
          tenant_id: tenantId,
          role: role,
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

