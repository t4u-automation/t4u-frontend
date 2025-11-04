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
import { Run, RunTestCaseResult } from "@/types";

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
