import {
  collection,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Tenant, T4UUser, TestCaseStatus } from "@/types";

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
      is_active: true,
      needs_setup: false,
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
 * Update tenant name after initial setup (completes onboarding)
 * Tenant is auto-created by blocking function with temporary name
 */
export async function updateTenantName(
  tenantId: string,
  companyName: string
): Promise<void> {
  try {
    const tenantRef = doc(db, "tenants", tenantId);
    await setDoc(
      tenantRef,
      {
        name: companyName,
        needs_setup: false,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log("[T4U] Tenant name updated and setup completed:", tenantId, companyName);
  } catch (error) {
    console.error("[T4U] Error updating tenant name:", error);
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

