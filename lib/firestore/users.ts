import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { T4UUser } from "@/types";

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
 * Fetch all users in a tenant
 */
export async function getTenantUsers(tenantId: string): Promise<T4UUser[]> {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("tenant_id", "==", tenantId));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })) as T4UUser[];

    return users.sort((a, b) => {
      const nameA = a.display_name?.toLowerCase() || "";
      const nameB = b.display_name?.toLowerCase() || "";
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error("[T4U] Error fetching tenant users:", error);
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

/**
 * Remove a user from the tenant
 * Deletes the user document from Firestore
 * A Cloud Function trigger will then delete the user from Firebase Auth
 */
export async function removeUserFromTenant(userId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data() as T4UUser;

    // Client-side safety check: Cannot remove owner
    if (userData.role === "owner") {
      throw new Error("Cannot remove the tenant owner");
    }

    // Delete user document (security rules enforce permissions)
    await deleteDoc(userRef);
    
    console.log("[T4U] User removed from tenant:", userId);
  } catch (error) {
    console.error("[T4U] Error removing user:", error);
    throw error;
  }
}

