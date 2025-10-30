import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Tenant,
  T4UUser,
  Project,
  Feature,
  Story,
  TestCase,
  TestCaseStep,
  TestCaseStatus,
  UserPreferences,
  TestPlan,
  Run,
  RunTestCaseResult,
  TestCaseComment,
} from "@/types";

// ============================================
// Tenant Management
// ============================================

/**
 * Check if a user has an active tenant
 * First checks if user document exists, then fetches tenant from user's tenantId
 */
export async function getUserTenant(userId: string): Promise<Tenant | null> {
  try {
    // First, check if user document exists
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log("[T4U] User document not found, needs onboarding");
      return null;
    }

    const userData = userDoc.data() as T4UUser;
    
    if (!userData.tenant_id) {
      console.log("[T4U] User has no tenant_id, needs onboarding");
      return null;
    }

    // Fetch the tenant
    const tenantRef = doc(db, "tenants", userData.tenant_id);
    const tenantDoc = await getDoc(tenantRef);

    if (!tenantDoc.exists()) {
      console.error("[T4U] Tenant not found for user");
      return null;
    }

    const tenant = {
      id: tenantDoc.id,
      ...tenantDoc.data(),
    } as Tenant;

    return tenant;
  } catch (error) {
    console.error("[T4U] Error fetching user tenant:", error);
    throw error;
  }
}

/**
 * Create a new tenant with default test case statuses
 */
export async function createTenant(
  companyName: string,
  userId: string
): Promise<Tenant> {
  try {
    const now = new Date().toISOString();
    const tenantRef = doc(collection(db, "tenants"));
    const tenantId = tenantRef.id;

    const tenant: Tenant = {
      id: tenantId,
      name: companyName,
      owner_id: userId,
      created_at: now,
      updated_at: now,
    };

    await setDoc(tenantRef, tenant);

    // Create default test case statuses
    await createDefaultTestCaseStatuses(tenantId);

    console.log("[T4U] Tenant created:", tenantId);
    return tenant;
  } catch (error) {
    console.error("[T4U] Error creating tenant:", error);
    throw error;
  }
}

/**
 * Update tenant information
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Pick<Tenant, "name">>
): Promise<void> {
  try {
    const tenantRef = doc(db, "tenants", tenantId);
    await setDoc(
      tenantRef,
      {
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Tenant updated:", tenantId);
  } catch (error) {
    console.error("[T4U] Error updating tenant:", error);
    throw error;
  }
}

/**
 * Create default test case statuses for a tenant
 */
async function createDefaultTestCaseStatuses(
  tenantId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();

    const defaultStatuses: Omit<TestCaseStatus, "id">[] = [
      {
        tenant_id: tenantId,
        name: "Draft",
        color: "#94a3b8", // slate-400
        is_default: true,
        order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        tenant_id: tenantId,
        name: "Active",
        color: "#22c55e", // green-500
        is_default: true,
        order: 2,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const status of defaultStatuses) {
      const statusRef = doc(collection(db, "test_case_statuses"));
      await setDoc(statusRef, {
        ...status,
        id: statusRef.id,
      });
    }

    console.log("[T4U] Default statuses created for tenant:", tenantId);
  } catch (error) {
    console.error("[T4U] Error creating default statuses:", error);
    throw error;
  }
}

// ============================================
// User Management
// ============================================

/**
 * Create or update user profile
 */
export async function createOrUpdateUser(
  userId: string,
  tenantId: string,
  userData: {
    email: string;
    displayName: string;
    photoURL?: string;
  },
  isOwner: boolean = false
): Promise<T4UUser> {
  try {
    const now = new Date().toISOString();
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    const user: any = {
      id: userId,
      email: userData.email,
      display_name: userData.displayName,
      tenant_id: tenantId,
      role: isOwner ? "owner" : "member",
      created_at: (userDoc.exists() && userDoc.data()?.created_at) || now,
      updated_at: now,
      last_login_at: now,
    };

    // Only add photo_url if it's provided
    if (userData.photoURL) {
      user.photo_url = userData.photoURL;
    }

    await setDoc(userRef, user);
    console.log("[T4U] User created/updated:", userId, "with role:", user.role);
    return user;
  } catch (error) {
    console.error("[T4U] Error creating/updating user:", error);
    throw error;
  }
}

/**
 * Update user's last login and profile info without changing role
 */
export async function updateUserLastLogin(
  userId: string,
  userData: {
    email: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const userRef = doc(db, "users", userId);
    
    // Only update profile info and last_login_at, preserve role and tenant_id
    const updates: any = {
      email: userData.email,
      display_name: userData.displayName,
      updated_at: now,
      last_login_at: now,
    };

    // Only add photo_url if it's provided
    if (userData.photoURL) {
      updates.photo_url = userData.photoURL;
    }

    await setDoc(userRef, updates, { merge: true });
    
    console.log("[T4U] User last login updated:", userId);
  } catch (error) {
    console.error("[T4U] Error updating user last login:", error);
    throw error;
  }
}

// ============================================
// Project Management
// ============================================

/**
 * Get all projects for a tenant
 */
export async function getTenantProjects(
  tenantId: string
): Promise<Project[]> {
  try {
    const projectsRef = collection(db, "projects");
    const q = query(
      projectsRef,
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
  } catch (error) {
    console.error("[T4U] Error fetching projects:", error);
    throw error;
  }
}

/**
 * Create a new project
 */
export async function createProject(
  tenantId: string,
  userId: string,
  name: string,
  description?: string
): Promise<Project> {
  try {
    console.log("[T4U] Creating project with tenantId:", tenantId, "userId:", userId);
    
    const now = new Date().toISOString();
    const projectRef = doc(collection(db, "projects"));

    const project: any = {
      id: projectRef.id,
      tenant_id: tenantId,
      name,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };

    // Only add description if it's provided
    if (description) {
      project.description = description;
    }

    console.log("[T4U] Project data:", project);
    await setDoc(projectRef, project);
    console.log("[T4U] Project created successfully:", project.id);
    return project as Project;
  } catch (error) {
    console.error("[T4U] Error creating project:", error);
    console.error("[T4U] Error details:", JSON.stringify(error, null, 2));
    throw error;
  }
}

// ============================================
// Feature Management
// ============================================

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

// ============================================
// Story Management
// ============================================

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

// ============================================
// User Preferences Management
// ============================================

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

// ============================================
// Helper Functions
// ============================================

/**
 * Generate unique name with suffix if name exists
 */
function generateUniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 2;
  let newName = `${baseName} (${counter})`;
  
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }
  
  return newName;
}

// ============================================
// Test Case Management
// ============================================

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
 * Get all test case statuses for a tenant
 */
export async function getTenantTestCaseStatuses(
  tenantId: string
): Promise<TestCaseStatus[]> {
  try {
    const statusesRef = collection(db, "test_case_statuses");
    const q = query(
      statusesRef,
      where("tenant_id", "==", tenantId),
      orderBy("order", "asc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TestCaseStatus[];
  } catch (error) {
    console.error("[T4U] Error fetching test case statuses:", error);
    throw error;
  }
}

/**
 * Create a new test case status
 */
export async function createTestCaseStatus(
  tenantId: string,
  name: string,
  color: string
): Promise<TestCaseStatus> {
  try {
    const now = new Date().toISOString();
    
    // Get current max order
    const existingStatuses = await getTenantTestCaseStatuses(tenantId);
    const maxOrder = existingStatuses.length > 0
      ? Math.max(...existingStatuses.map((s) => s.order))
      : 0;

    const statusRef = doc(collection(db, "test_case_statuses"));
    const status: TestCaseStatus = {
      id: statusRef.id,
      tenant_id: tenantId,
      name,
      color,
      is_default: false,
      order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    await setDoc(statusRef, status);
    console.log("[T4U] Test case status created:", status.id);
    return status;
  } catch (error) {
    console.error("[T4U] Error creating test case status:", error);
    throw error;
  }
}

/**
 * Update a test case status
 */
export async function updateTestCaseStatus(
  statusId: string,
  updates: Partial<Pick<TestCaseStatus, "name" | "color" | "order">>
): Promise<void> {
  try {
    const statusRef = doc(db, "test_case_statuses", statusId);
    await setDoc(
      statusRef,
      {
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Test case status updated:", statusId);
  } catch (error) {
    console.error("[T4U] Error updating test case status:", error);
    throw error;
  }
}

/**
 * Delete a test case status (only non-default statuses)
 */
export async function deleteTestCaseStatus(statusId: string): Promise<void> {
  try {
    const statusRef = doc(db, "test_case_statuses", statusId);
    const statusDoc = await getDoc(statusRef);

    if (!statusDoc.exists()) {
      throw new Error("Status not found");
    }

    const status = statusDoc.data() as TestCaseStatus;
    if (status.is_default) {
      throw new Error("Cannot delete default status");
    }

    await deleteDoc(statusRef);
    console.log("[T4U] Test case status deleted:", statusId);
  } catch (error) {
    console.error("[T4U] Error deleting test case status:", error);
    throw error;
  }
}

// ============================================
// Move to Project Functions
// ============================================

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
    // Get the test case
    const testCaseRef = doc(db, "test_cases", testCaseId);
    const testCaseDoc = await getDoc(testCaseRef);
    
    if (!testCaseDoc.exists()) {
      throw new Error("Test case not found");
    }
    
    const testCase = testCaseDoc.data() as TestCase;
    
    // Get parent story
    const storyRef = doc(db, "stories", testCase.story_id);
    const storyDoc = await getDoc(storyRef);
    
    if (!storyDoc.exists()) {
      throw new Error("Parent story not found");
    }
    
    const story = storyDoc.data() as Story;
    
    // Get parent feature
    const featureRef = doc(db, "features", story.feature_id);
    const featureDoc = await getDoc(featureRef);
    
    if (!featureDoc.exists()) {
      throw new Error("Parent feature not found");
    }
    
    const feature = featureDoc.data() as Feature;
    
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
    const storyRef = doc(db, "stories", storyId);
    const storyDoc = await getDoc(storyRef);
    
    if (!storyDoc.exists()) {
      throw new Error("Story not found");
    }
    
    const story = storyDoc.data() as Story;
    
    // Get parent feature
    const featureRef = doc(db, "features", story.feature_id);
    const featureDoc = await getDoc(featureRef);
    
    if (!featureDoc.exists()) {
      throw new Error("Parent feature not found");
    }
    
    const feature = featureDoc.data() as Feature;
    
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
    const featureRef = doc(db, "features", featureId);
    const featureDoc = await getDoc(featureRef);
    
    if (!featureDoc.exists()) {
      throw new Error("Feature not found");
    }
    
    const feature = featureDoc.data() as Feature;
    
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

// ============================================
// Clone Functions
// ============================================

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
    const featureRef = doc(db, "features", featureId);
    const featureDoc = await getDoc(featureRef);
    
    if (!featureDoc.exists()) {
      throw new Error("Feature not found");
    }
    
    const originalFeature = featureDoc.data() as Feature;
    
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

// ============================================
// Test Plan Management
// ============================================

/**
 * Get all test plans for a project
 */
export async function getProjectTestPlans(
  projectId: string,
  tenantId: string
): Promise<TestPlan[]> {
  try {
    const testPlansRef = collection(db, "test_plans");
    const q = query(
      testPlansRef,
      where("project_id", "==", projectId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc")
    );
    const snapshot = await getDocs(q);
    const testPlans = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TestPlan[];
    return testPlans;
  } catch (error) {
    console.error("[T4U] Error fetching test plans:", error);
    throw error;
  }
}

/**
 * Get a single test plan by ID
 */
export async function getTestPlan(testPlanId: string): Promise<TestPlan | null> {
  try {
    const testPlanRef = doc(db, "test_plans", testPlanId);
    const testPlanDoc = await getDoc(testPlanRef);
    
    if (!testPlanDoc.exists()) {
      return null;
    }
    
    return {
      id: testPlanDoc.id,
      ...testPlanDoc.data(),
    } as TestPlan;
  } catch (error) {
    console.error("[T4U] Error fetching test plan:", error);
    throw error;
  }
}

/**
 * Create a new test plan
 */
export async function createTestPlan(
  tenantId: string,
  projectId: string,
  userId: string,
  name: string,
  testCaseIds: string[],
  description?: string
): Promise<TestPlan> {
  try {
    const testPlanRef = doc(collection(db, "test_plans"));
    const now = new Date().toISOString();
    
    const testPlan: any = {
      id: testPlanRef.id,
      tenant_id: tenantId,
      project_id: projectId,
      name,
      test_case_ids: testCaseIds,
      test_cases_count: testCaseIds.length,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };
    
    // Only add description if it's provided
    if (description) {
      testPlan.description = description;
    }
    
    await setDoc(testPlanRef, testPlan);
    console.log("[T4U] Test plan created:", testPlan.id);
    return testPlan as TestPlan;
  } catch (error) {
    console.error("[T4U] Error creating test plan:", error);
    throw error;
  }
}

/**
 * Update a test plan
 */
export async function updateTestPlan(
  testPlanId: string,
  updates: Partial<Pick<TestPlan, "name" | "description" | "test_case_ids">>
): Promise<void> {
  try {
    const testPlanRef = doc(db, "test_plans", testPlanId);
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Only add fields that are defined
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.test_case_ids !== undefined) {
      updateData.test_case_ids = updates.test_case_ids;
      updateData.test_cases_count = updates.test_case_ids.length;
    }
    
    await setDoc(testPlanRef, updateData, { merge: true });
    console.log("[T4U] Test plan updated:", testPlanId);
  } catch (error) {
    console.error("[T4U] Error updating test plan:", error);
    throw error;
  }
}

/**
 * Delete a test plan
 */
export async function deleteTestPlan(testPlanId: string): Promise<void> {
  try {
    const testPlanRef = doc(db, "test_plans", testPlanId);
    await deleteDoc(testPlanRef);
    console.log("[T4U] Test plan deleted:", testPlanId);
  } catch (error) {
    console.error("[T4U] Error deleting test plan:", error);
    throw error;
  }
}

// ============================================
// Run Management
// ============================================

/**
 * Get all runs for a project
 */
export async function getProjectRuns(
  projectId: string,
  tenantId: string
): Promise<Run[]> {
  try {
    const runsRef = collection(db, "runs");
    const q = query(
      runsRef,
      where("project_id", "==", projectId),
      where("tenant_id", "==", tenantId),
      orderBy("created_at", "desc")
    );
    const snapshot = await getDocs(q);
    const runs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Run[];
    return runs;
  } catch (error) {
    console.error("[T4U] Error fetching runs:", error);
    throw error;
  }
}

/**
 * Get a single run by ID
 */
export async function getRun(runId: string): Promise<Run | null> {
  try {
    const runRef = doc(db, "runs", runId);
    const runDoc = await getDoc(runRef);
    
    if (!runDoc.exists()) {
      return null;
    }
    
    return {
      id: runDoc.id,
      ...runDoc.data(),
    } as Run;
  } catch (error) {
    console.error("[T4U] Error fetching run:", error);
    throw error;
  }
}

/**
 * Create a new run
 */
export async function createRun(
  tenantId: string,
  projectId: string,
  userId: string,
  name: string,
  testCaseIds: string[]
): Promise<Run> {
  try {
    const runRef = doc(collection(db, "runs"));
    const now = new Date().toISOString();
    
    // Initialize results for each test case
    const results: { [testCaseId: string]: RunTestCaseResult } = {};
    testCaseIds.forEach((tcId) => {
      results[tcId] = {
        test_case_id: tcId,
        status: "pending",
        current_step: 0,
        total_steps: 0,
      };
    });
    
    const run: Run = {
      id: runRef.id,
      tenant_id: tenantId,
      project_id: projectId,
      name,
      test_case_ids: testCaseIds,
      status: "pending",
      created_at: now,
      created_by: userId,
      current_test_case_index: 0,
      results,
    };
    
    await setDoc(runRef, run);
    console.log("[T4U] Run created:", run.id);
    return run;
  } catch (error) {
    console.error("[T4U] Error creating run:", error);
    throw error;
  }
}

/**
 * Update a run
 */
export async function updateRun(
  runId: string,
  updates: Partial<Run>
): Promise<void> {
  try {
    const runRef = doc(db, "runs", runId);
    await setDoc(runRef, updates, { merge: true });
    console.log("[T4U] Run updated:", runId);
  } catch (error) {
    console.error("[T4U] Error updating run:", error);
    throw error;
  }
}

/**
 * Delete a run
 */
export async function deleteRun(runId: string): Promise<void> {
  try {
    const runRef = doc(db, "runs", runId);
    await deleteDoc(runRef);
    console.log("[T4U] Run deleted:", runId);
  } catch (error) {
    console.error("[T4U] Error deleting run:", error);
    throw error;
  }
}

// ============================================
// Test Case Comments Management
// ============================================

/**
 * Create a new comment on a test case
 */
export async function createTestCaseComment(
  testCaseId: string,
  tenantId: string,
  userId: string,
  userEmail: string,
  userDisplayName: string,
  content: string
): Promise<TestCaseComment> {
  try {
    const commentRef = doc(collection(db, "test_case_comments"));
    const now = new Date().toISOString();
    
    const comment: TestCaseComment = {
      id: commentRef.id,
      test_case_id: testCaseId,
      tenant_id: tenantId,
      user_id: userId,
      user_email: userEmail,
      user_display_name: userDisplayName,
      content,
      created_at: now,
      updated_at: now,
    };
    
    await setDoc(commentRef, comment);
    console.log("[T4U] Comment created:", comment.id);
    return comment;
  } catch (error) {
    console.error("[T4U] Error creating comment:", error);
    throw error;
  }
}

/**
 * Get all comments for a test case
 */
export async function getTestCaseComments(
  testCaseId: string,
  tenantId: string
): Promise<TestCaseComment[]> {
  try {
    const commentsRef = collection(db, "test_case_comments");
    const q = query(
      commentsRef,
      where("test_case_id", "==", testCaseId),
      where("tenant_id", "==", tenantId),
      where("is_deleted", "!=", true),
      orderBy("is_deleted"),
      orderBy("created_at", "desc")
    );
    
    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TestCaseComment[];
    
    return comments;
  } catch (error) {
    console.error("[T4U] Error fetching comments:", error);
    throw error;
  }
}

/**
 * Update a comment (only the content)
 */
export async function updateTestCaseComment(
  commentId: string,
  content: string
): Promise<void> {
  try {
    const commentRef = doc(db, "test_case_comments", commentId);
    const updateData = {
      content,
      updated_at: new Date().toISOString(),
    };
    
    await setDoc(commentRef, updateData, { merge: true });
    console.log("[T4U] Comment updated:", commentId);
  } catch (error) {
    console.error("[T4U] Error updating comment:", error);
    throw error;
  }
}

/**
 * Delete a comment (soft delete by setting is_deleted flag)
 */
export async function deleteTestCaseComment(commentId: string): Promise<void> {
  try {
    const commentRef = doc(db, "test_case_comments", commentId);
    await deleteDoc(commentRef);
    console.log("[T4U] Comment deleted:", commentId);
  } catch (error) {
    console.error("[T4U] Error deleting comment:", error);
    throw error;
  }
}

// ============================================
// Helper Functions for Dynamic Routing
// ============================================

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

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projectRef = doc(db, "projects", projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      return null;
    }

    return {
      id: projectDoc.id,
      ...projectDoc.data(),
    } as Project;
  } catch (error) {
    console.error("[T4U] Error fetching project:", error);
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

