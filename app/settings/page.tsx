"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import TenantSettings from "@/components/TenantSettings";
import { useToast } from "@/contexts/ToastContext";
import { TestCaseStatus, T4UUser, Invitation } from "@/types";
import { getTenantUsers } from "@/lib/firestore/users";
import { getTenantInvitations } from "@/lib/firestore/invitations";
import { createInvitation } from "@/lib/firestore/invitations";
import { cancelInvitation, resendInvitation } from "@/lib/firestore/invitations";
import { removeUserFromTenant } from "@/lib/firestore/users";
import {
  getTenantTestCaseStatuses,
  createTestCaseStatus,
  updateTestCaseStatus,
  deleteTestCaseStatus as deleteTestCaseStatusConfig,
} from "@/lib/firestore/testCaseStatuses";
import { updateTenant } from "@/lib/firestore/tenants";
import { Settings } from "lucide-react";

function SettingsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, needsOnboarding } = useTenant(user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const settingsTabParam = searchParams.get('tab') as "general" | "team" | "statuses" | null;

  const [statuses, setStatuses] = useState<TestCaseStatus[]>([]);
  const [members, setMembers] = useState<T4UUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<T4UUser["role"] | null>(null);

  const { showSuccess, showError } = useToast();
  const combinedLoading = authLoading || tenantLoading;

  useEffect(() => {
    if (!combinedLoading) {
      if (!user) {
        router.push("/login");
      } else if (needsOnboarding) {
        router.push("/");
      }
    }
  }, [user, combinedLoading, needsOnboarding, router]);

  useEffect(() => {
    if (tenant && user) {
      loadSettingsData();
      checkUserRole();
    }
  }, [tenant, user]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as T4UUser;
        setUserRole(userData.role);
        
        // If user is not admin/owner, redirect to projects
        if (userData.role !== "owner" && userData.role !== "admin") {
          router.push("/projects");
        }
      }
    } catch (error) {
      console.error("[SettingsPage] Error checking user role:", error);
    }
  };

  const loadSettingsData = async () => {
    if (!tenant) return;

    try {
      setLoading(true);

      // Load all settings data in parallel
      const [fetchedStatuses, tenantUsers, tenantInvitations] = await Promise.all([
        getTenantTestCaseStatuses(tenant.id),
        getTenantUsers(tenant.id),
        getTenantInvitations(tenant.id),
      ]);

      setStatuses(fetchedStatuses);
      setMembers(tenantUsers);
      setInvitations(tenantInvitations);
    } catch (error) {
      console.error("[SettingsPage] Error loading settings data:", error);
      showError("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamData = async (showSpinner: boolean = true) => {
    if (!tenant) return;

    try {
      if (showSpinner) {
        setTeamLoading(true);
      }

      const [tenantUsers, tenantInvitations] = await Promise.all([
        getTenantUsers(tenant.id),
        getTenantInvitations(tenant.id),
      ]);

      setMembers(tenantUsers);
      setInvitations(tenantInvitations);
    } catch (error) {
      console.error("[SettingsPage] Error loading team data:", error);
    } finally {
      if (showSpinner) {
        setTeamLoading(false);
      }
    }
  };

  const canManageTeam = userRole === "owner" || userRole === "admin";
  const currentUserId = user?.uid ?? null;

  const handleUpdateTenant = async (name: string) => {
    if (!tenant) return;

    try {
      await updateTenant(tenant.id, { name });
      console.log("[SettingsPage] Tenant name updated successfully");
    } catch (error) {
      console.error("[SettingsPage] Error updating tenant:", error);
      throw error;
    }
  };

  const handleCreateStatus = async (name: string, color: string) => {
    if (!tenant) return;

    try {
      const newStatus = await createTestCaseStatus(tenant.id, name, color);
      setStatuses([...statuses, newStatus]);
      console.log("[SettingsPage] Status created:", newStatus.id);
    } catch (error) {
      console.error("[SettingsPage] Error creating status:", error);
      throw error;
    }
  };

  const handleUpdateStatus = async (statusId: string, name: string, color: string) => {
    try {
      await updateTestCaseStatus(statusId, { name, color });
      // Update local state
      setStatuses(
        statuses.map((s) => (s.id === statusId ? { ...s, name, color } : s))
      );
      console.log("[SettingsPage] Status updated:", statusId);
    } catch (error) {
      console.error("[SettingsPage] Error updating status:", error);
      throw error;
    }
  };

  const handleInviteMember = async (email: string, role: Invitation["role"]) => {
    if (!tenant || !user) {
      throw new Error("Unable to send invitation without tenant context");
    }

    try {
      await createInvitation(tenant.id, user.uid, email, role);
      await loadTeamData(false);
    } catch (error) {
      console.error("[SettingsPage] Error creating invitation:", error);
      throw error;
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) {
      throw new Error("Unable to cancel invitation without user context");
    }

    try {
      await cancelInvitation(invitationId, user.uid);
      await loadTeamData(false);
    } catch (error) {
      console.error("[SettingsPage] Error cancelling invitation:", error);
      throw error;
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!user) {
      throw new Error("Unable to resend invitation without user context");
    }

    try {
      await resendInvitation(invitationId, user.uid);
      await loadTeamData(false);
    } catch (error) {
      console.error("[SettingsPage] Error resending invitation:", error);
      throw error;
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUserFromTenant(userId);
      await loadTeamData(false);
      showSuccess("User removed successfully");
    } catch (error) {
      console.error("[SettingsPage] Error removing user:", error);
      throw error;
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await deleteTestCaseStatusConfig(statusId);
      // Remove from local state
      setStatuses(statuses.filter((s) => s.id !== statusId));
      console.log("[SettingsPage] Status deleted:", statusId);
    } catch (error) {
      console.error("[SettingsPage] Error deleting status:", error);
      throw error;
    }
  };

  const handleSettingsTabChange = (tab: "general" | "team" | "statuses") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/settings?${params.toString()}`);
  };

  if (combinedLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">No tenant found</div>
      </div>
    );
  }

  return (
    <div id="SettingsPage" className="flex flex-col h-screen bg-[var(--background-gray-main)]">
      <Header showSidebarToggle={false} isSmallScreen={false} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          id="SettingsSidebar"
          className="w-48 bg-white border-r border-[var(--border-main)] flex flex-col flex-shrink-0"
        >
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] bg-[var(--fill-tsp-gray-main)] text-[var(--text-primary)] font-medium"
            >
              <Settings size={16} />
              <span className="text-sm">Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <TenantSettings
          tenant={tenant}
          statuses={statuses}
          members={members}
          invitations={invitations}
          isTeamLoading={teamLoading}
          onUpdateTenant={handleUpdateTenant}
          onCreateStatus={handleCreateStatus}
          onUpdateStatus={handleUpdateStatus}
          onDeleteStatus={handleDeleteStatus}
          onInviteMember={handleInviteMember}
          onCancelInvitation={handleCancelInvitation}
          onResendInvitation={handleResendInvitation}
          onRemoveUser={handleRemoveUser}
          canManageTeam={canManageTeam}
          currentUserId={currentUserId}
          onSettingsTabChange={handleSettingsTabChange}
          activeSettingsTab={settingsTabParam || "general"}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}

