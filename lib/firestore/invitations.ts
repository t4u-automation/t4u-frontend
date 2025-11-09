import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { Invitation } from "@/types";

export interface CreateInvitationOptions {
  expiresInDays?: number;
}

function sortInvitationsByCreatedAt(invites: Invitation[]): Invitation[] {
  return invites.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
}

export async function getTenantInvitations(
  tenantId: string,
  statuses?: Invitation["status"][]
): Promise<Invitation[]> {
  try {
    const invitationsRef = collection(db, "invitations");
    const q = query(invitationsRef, where("tenant_id", "==", tenantId));
    const snapshot = await getDocs(q);

    let invitations = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })) as Invitation[];

    if (statuses && statuses.length > 0) {
      const allowedStatuses = new Set(statuses);
      invitations = invitations.filter((invitation) =>
        allowedStatuses.has(invitation.status)
      );
    }

    return sortInvitationsByCreatedAt(invitations);
  } catch (error) {
    console.error("[T4U] Error fetching invitations:", error);
    throw error;
  }
}

export async function createInvitation(
  tenantId: string,
  invitedByUserId: string,
  email: string,
  role: Invitation["role"] = "member",
  options?: CreateInvitationOptions
): Promise<Invitation> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email address is required");
  }

  try {
    // Check if user already belongs to the tenant
    const existingUserSnapshot = await getDocs(
      query(
        collection(db, "users"), 
        where("email", "==", normalizedEmail),
        where("tenant_id", "==", tenantId)
      )
    );

    if (!existingUserSnapshot.empty) {
      throw new Error("User is already a member of this workspace");
    }

    // Prevent duplicate pending invitations for this tenant
    const existingInvitationsSnapshot = await getDocs(
      query(
        collection(db, "invitations"),
        where("email", "==", normalizedEmail),
        where("tenant_id", "==", tenantId),
        where("status", "==", "pending")
      )
    );

    if (!existingInvitationsSnapshot.empty) {
      throw new Error("An invitation has already been sent to this email");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    const expiresInDays = options?.expiresInDays ?? 7;
    expiresAt.setDate(now.getDate() + expiresInDays);

    const invitationRef = doc(collection(db, "invitations"));

    const invitation: Invitation = {
      id: invitationRef.id,
      email: normalizedEmail,
      tenant_id: tenantId,
      role,
      status: "pending",
      invited_by: invitedByUserId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      send_count: 0,
    };

    await setDoc(invitationRef, invitation);

    console.log("[T4U] Invitation created:", invitation.id);
    return invitation;
  } catch (error) {
    console.error("[T4U] Error creating invitation:", error);
    throw error;
  }
}

export async function cancelInvitation(
  invitationId: string,
  cancelledByUserId: string
): Promise<void> {
  try {
    const invitationRef = doc(db, "invitations", invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error("Invitation not found");
    }

    const invitation = invitationDoc.data() as Invitation;

    if (invitation.status !== "pending") {
      console.warn(
        `[T4U] Invitation ${invitationId} is ${invitation.status}; cancel skipped.`
      );
      return;
    }

    await setDoc(
      invitationRef,
      {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledByUserId,
      },
      { merge: true }
    );

    console.log("[T4U] Invitation cancelled:", invitationId);
  } catch (error) {
    console.error("[T4U] Error cancelling invitation:", error);
    throw error;
  }
}

export async function resendInvitation(
  invitationId: string,
  requestedByUserId: string,
  options?: CreateInvitationOptions
): Promise<Invitation> {
  try {
    const invitationRef = doc(db, "invitations", invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error("Invitation not found");
    }

    const invitation = invitationDoc.data() as Invitation;

    if (invitation.status !== "pending") {
      throw new Error("Only pending invitations can be resent");
    }

    await setDoc(
      invitationRef,
      {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: requestedByUserId,
      },
      { merge: true }
    );

    const role = invitation.role ?? "member";

    return createInvitation(
      invitation.tenant_id,
      requestedByUserId,
      invitation.email,
      role,
      options
    );
  } catch (error) {
    console.error("[T4U] Error resending invitation:", error);
    throw error;
  }
}

