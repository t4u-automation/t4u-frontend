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
import { TestPlan } from "@/types";

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
