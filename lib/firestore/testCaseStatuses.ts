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
import { TestCaseStatus } from "@/types";

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
