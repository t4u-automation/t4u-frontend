"use client";

import { Tenant, TestCaseStatus, T4UUser, Invitation } from "@/types";
import { useState, FormEvent, useRef, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { Save, Plus, Trash2, Edit2, ChevronDown } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "./ConfirmDialog";

type TenantSettingsTab = "general" | "team" | "statuses";

interface TenantSettingsProps {
  tenant: Tenant;
  statuses: TestCaseStatus[];
  members: T4UUser[];
  invitations: Invitation[];
  onUpdateTenant: (name: string) => Promise<void>;
  onCreateStatus: (name: string, color: string) => Promise<void>;
  onUpdateStatus: (statusId: string, name: string, color: string) => Promise<void>;
  onDeleteStatus: (statusId: string) => Promise<void>;
  onInviteMember: (email: string, role: Invitation["role"]) => Promise<void>;
  onCancelInvitation: (invitationId: string) => Promise<void>;
  onResendInvitation: (invitationId: string) => Promise<void>;
  onRemoveUser: (userId: string) => Promise<void>;
  canManageTeam: boolean;
  currentUserId: string | null;
  isTeamLoading?: boolean;
  activeSettingsTab?: TenantSettingsTab;
  onSettingsTabChange?: (tab: TenantSettingsTab) => void;
}

export default function TenantSettings({
  tenant,
  statuses,
  members,
  invitations,
  onUpdateTenant,
  onCreateStatus,
  onUpdateStatus,
  onDeleteStatus,
  onInviteMember,
  onCancelInvitation,
  onResendInvitation,
  onRemoveUser,
  canManageTeam,
  currentUserId,
  isTeamLoading = false,
  activeSettingsTab,
  onSettingsTabChange,
}: TenantSettingsProps) {
  const { showSuccess: toastSuccess, showError: toastError } = useToast();
  const [localActiveTab, setLocalActiveTab] = useState<TenantSettingsTab>("general");
  
  const currentTab = activeSettingsTab || localActiveTab;
  
  const handleTabChange = (tab: TenantSettingsTab) => {
    setLocalActiveTab(tab);
    if (onSettingsTabChange) {
      onSettingsTabChange(tab);
    }
  };
  const [tenantName, setTenantName] = useState(tenant.name);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TestCaseStatus | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<TestCaseStatus | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Invitation["role"]>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [removingUser, setRemovingUser] = useState<T4UUser | null>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Something went wrong. Please try again.";
  };

  const formatDateTime = (value?: string | Timestamp | Date | null) => {
    if (!value) {
      return "Never";
    }

    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (value instanceof Timestamp) {
      date = value.toDate();
    } else if (typeof value === "string") {
      date = new Date(value);
    } else if (typeof (value as any).toDate === "function") {
      date = (value as { toDate: () => Date }).toDate();
    } else if (typeof (value as any).seconds === "number") {
      date = new Date((value as { seconds: number; nanoseconds: number }).seconds * 1000);
    } else {
      date = new Date(value as unknown as string);
    }

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const formatRole = (role: Invitation["role"]) =>
    role.charAt(0).toUpperCase() + role.slice(1);

  const formatStatus = (status: Invitation["status"]) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  const getRoleBadgeClass = (role: Invitation["role"]) => {
    if (role === "owner") return "bg-amber-100 text-amber-700";
    if (role === "admin") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-600";
  };

  const getStatusBadgeClass = (status: Invitation["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "accepted":
        return "bg-emerald-100 text-emerald-700";
      case "expired":
        return "bg-slate-100 text-slate-600";
      case "cancelled":
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageTeam) {
      return;
    }

    const trimmedEmail = inviteEmail.trim();

    if (!trimmedEmail) {
      setInviteError("Email address is required");
      return;
    }

    try {
      setIsInviting(true);
      setInviteError(null);
      await onInviteMember(trimmedEmail, inviteRole);
      toastSuccess(`Invitation sent to ${trimmedEmail}`);
      setInviteEmail("");
      setInviteRole("member");
      setIsRoleDropdownOpen(false);
    } catch (error) {
      const message = getErrorMessage(error);
      setInviteError(message);
      toastError(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelClick = async (invitationId: string) => {
    if (!canManageTeam) {
      return;
    }

    try {
      setCancellingId(invitationId);
      await onCancelInvitation(invitationId);
      toastSuccess("Invitation cancelled");
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleResendClick = async (invitationId: string) => {
    if (!canManageTeam) {
      return;
    }

    try {
      setResendingId(invitationId);
      await onResendInvitation(invitationId);
      toastSuccess("Invitation resent");
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message);
    } finally {
      setResendingId(null);
    }
  };

  useEffect(() => {
    if (!isRoleDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoleDropdownOpen]);

  const handleSaveTenant = async () => {
    if (!tenantName.trim() || tenantName === tenant.name) return;

    try {
      setIsSavingTenant(true);
      await onUpdateTenant(tenantName.trim());
      toastSuccess("Workspace name updated successfully");
    } catch (error) {
      console.error("[TenantSettings] Error saving tenant:", error);
      toastError("Failed to update workspace name");
    } finally {
      setIsSavingTenant(false);
    }
  };

  return (
    <div id="TenantSettings" className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border-main)] p-6 pb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Tenant Settings
        </h1>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[var(--border-light)] -mb-4">
          <button
            onClick={() => handleTabChange("general")}
            className={`pb-3 text-sm font-medium transition-colors ${
              currentTab === "general"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            General
          </button>
          <button
            onClick={() => handleTabChange("team")}
            className={`pb-3 text-sm font-medium transition-colors ${
              currentTab === "team"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Team
          </button>
          <button
            onClick={() => handleTabChange("statuses")}
            className={`pb-3 text-sm font-medium transition-colors ${
              currentTab === "statuses"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Test Case Statuses
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentTab === "general" ? (
          /* General Settings */
          <div className="max-w-2xl">
            <div className="bg-white border border-[var(--border-main)] rounded-[12px] p-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
                General Information
              </h2>

              {/* Space Name */}
              <div className="mb-6">
                <label
                  htmlFor="TenantNameInput"
                  className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                >
                  Space Name
                </label>
                <input
                  id="TenantNameInput"
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  disabled={isSavingTenant}
                  className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  This is the name of your company workspace
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  id="SaveTenantButton"
                  onClick={handleSaveTenant}
                  disabled={isSavingTenant || !tenantName.trim() || tenantName === tenant.name}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingTenant ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : currentTab === "team" ? (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-[var(--border-main)] rounded-[12px] p-6">
              <div className="flex flex-col gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Invite Teammates
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Owners and admins can invite teammates to collaborate in this workspace.
                  </p>
                </div>
                {!canManageTeam && (
                  <div className="text-xs text-[var(--text-tertiary)]">
                    You can view team information but only workspace owners or admins can send invitations.
                  </div>
                )}
              </div>

              <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-[2fr_1.25fr_auto] md:items-end">
                  <div>
                    <label
                      htmlFor="InviteEmailInput"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                    >
                      Email Address
                    </label>
                    <input
                      id="InviteEmailInput"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        if (inviteError) {
                          setInviteError(null);
                        }
                      }}
                      disabled={isInviting || !canManageTeam}
                      placeholder="teammate@company.com"
                      className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      autoComplete="off"
                    />
                    {inviteError && (
                      <p className="mt-2 text-xs text-red-600">{inviteError}</p>
                    )}
                  </div>
                  <div ref={roleDropdownRef} className="relative">
                    <span className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Role
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isInviting && canManageTeam) {
                          setIsRoleDropdownOpen((prev) => !prev);
                        }
                      }}
                      disabled={isInviting || !canManageTeam}
                      className={`flex h-11 w-full items-center justify-between rounded-[8px] border px-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--border-input-active)] disabled:cursor-not-allowed ${
                        isRoleDropdownOpen
                          ? "border-[var(--border-input-active)] bg-[var(--fill-tsp-white-light)]"
                          : "border-[var(--border-main)] hover:border-[var(--border-input-active)]"
                      } ${!canManageTeam ? "opacity-60" : ""}`}
                    >
                      <div className="flex w-full flex-col text-left leading-tight">
                        <span className="font-medium text-[var(--text-primary)]">
                          {inviteRole === "member" && "Member"}
                          {inviteRole === "admin" && "Admin"}
                          {inviteRole === "owner" && "Owner"}
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-[var(--icon-secondary)]" />
                    </button>
                    {isRoleDropdownOpen && (
                      <div className="absolute left-0 right-0 z-20 mt-2 rounded-[10px] border border-[var(--border-light)] bg-white shadow-lg">
                        {[
                          {
                            value: "member" as Invitation["role"],
                            label: "Member",
                            description: "Can create and edit content.",
                          },
                          {
                            value: "admin" as Invitation["role"],
                            label: "Admin",
                            description: "Manages workspace settings and invites.",
                          },
                        ].map((roleOption) => {
                          const isSelected = inviteRole === roleOption.value;

                          return (
                            <button
                              key={roleOption.value}
                              type="button"
                              onClick={() => {
                                setInviteRole(roleOption.value);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 transition-colors text-sm hover:bg-[var(--fill-tsp-white-light)] ${
                                isSelected ? "bg-[var(--fill-tsp-white-light)]" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {roleOption.label}
                                </span>
                                {isSelected && (
                                  <span className="text-xs text-[var(--text-secondary)]">Selected</span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">
                                {roleOption.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex md:justify-end">
                    <button
                      type="submit"
                      disabled={
                        isInviting || !canManageTeam || inviteEmail.trim() === ""
                      }
                      className="inline-flex h-11 items-center gap-2 px-4 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isInviting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Send Invite</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white border border-[var(--border-main)] rounded-[12px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Members
                </h2>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Active users in this workspace. Accepted invitations appear here automatically.
              </p>

              <div className="divide-y divide-[var(--border-light)] border border-[var(--border-light)] rounded-[10px]">
                {members.length > 0 ? (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {member.display_name || member.email}
                          </span>
                          {member.id === currentUserId && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--fill-tsp-gray-main)] text-[var(--text-secondary)]">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] break-all">
                          {member.email}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-xs text-[var(--text-secondary)] md:flex-row md:items-center md:gap-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(member.role)}`}
                        >
                          {formatRole(member.role)}
                        </span>
                        <span className="text-[var(--text-tertiary)]">
                          Last active: {formatDateTime(member.last_login_at)}
                        </span>
                        {canManageTeam && member.role !== "owner" && member.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => setRemovingUser(member)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-[6px] hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-[var(--text-tertiary)]">
                    No members found.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-[var(--border-main)] rounded-[12px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Invitations
                </h2>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {invitations.length} invitation{invitations.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Track pending invitations and review those that have been accepted, cancelled, or expired.
              </p>

              {isTeamLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[var(--border-main)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : invitations.length > 0 ? (
                <div className="divide-y divide-[var(--border-light)] border border-[var(--border-light)] rounded-[10px]">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)] break-all">
                            {invitation.email}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(invitation.role)}`}
                          >
                            {formatRole(invitation.role)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(invitation.status)}`}
                          >
                            {formatStatus(invitation.status)}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-2 space-y-1">
                          <div>
                            {invitation.last_email_sent_at
                              ? `Last sent ${formatDateTime(invitation.last_email_sent_at)}`
                              : `Invited ${formatDateTime(invitation.created_at)}`}
                          </div>
                          {invitation.status === "accepted" && invitation.accepted_at && (
                            <div>Accepted {formatDateTime(invitation.accepted_at)}</div>
                          )}
                          {invitation.last_email_error && (
                            <div className="text-red-600">
                              Email error: {invitation.last_email_error}
                            </div>
                          )}
                        </div>
                      </div>
                      {canManageTeam && invitation.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResendClick(invitation.id)}
                            disabled={resendingId === invitation.id || cancellingId === invitation.id}
                            className="px-3 py-1.5 text-xs font-medium border border-[var(--border-main)] rounded-[6px] hover:bg-[var(--fill-tsp-gray-main)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resendingId === invitation.id ? "Resending..." : "Resend"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelClick(invitation.id)}
                            disabled={cancellingId === invitation.id || resendingId === invitation.id}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-[6px] hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancellingId === invitation.id ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-[var(--text-tertiary)]">
                  No invitations have been sent yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Test Case Statuses */
          <div className="max-w-2xl">
            <div className="bg-white border border-[var(--border-main)] rounded-[12px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Test Case Statuses
                </h2>
                <button
                  id="CreateStatusButton"
                  onClick={() => setShowCreateStatusModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--Button-primary-black)] text-white rounded-[6px] text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} />
                  <span>Add Status</span>
                </button>
              </div>

              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Manage the status options available for test cases in your workspace
              </p>

              {/* Statuses List */}
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    id={`Status_${status.id}`}
                    className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-[8px] hover:bg-[var(--fill-tsp-white-light)] transition-colors"
                  >
                    {/* Color Indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color || "#94a3b8" }}
                    />

                    {/* Status Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {status.name}
                        </span>
                        {status.is_default && (
                          <span className="text-xs px-2 py-0.5 bg-[var(--fill-tsp-gray-main)] text-[var(--text-secondary)] rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        Order: {status.order}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="p-1.5 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
                        title="Edit Status"
                        onClick={() => setEditingStatus(status)}
                      >
                        <Edit2 size={16} className="text-[var(--icon-secondary)]" />
                      </button>
                      {!status.is_default && (
                        <button
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete Status"
                          onClick={() => setDeletingStatus(status)}
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {statuses.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-tertiary)]">
                    No statuses configured
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Status Modal */}
      {showCreateStatusModal && (
        <CreateStatusModal
          onClose={() => setShowCreateStatusModal(false)}
          onSubmit={async (name, color) => {
            try {
              await onCreateStatus(name, color);
              setShowCreateStatusModal(false);
              toastSuccess(`Status "${name}" created successfully`);
            } catch (error) {
              toastError("Failed to create status");
              throw error;
            }
          }}
        />
      )}

      {/* Edit Status Modal */}
      {editingStatus && (
        <EditStatusModal
          status={editingStatus}
          onClose={() => setEditingStatus(null)}
          onSubmit={async (name, color) => {
            try {
              await onUpdateStatus(editingStatus.id, name, color);
              setEditingStatus(null);
              toastSuccess(`Status "${name}" updated successfully`);
            } catch (error) {
              toastError("Failed to update status");
              throw error;
            }
          }}
        />
      )}

      {/* Confirm Delete Status Dialog */}
      {deletingStatus && (
        <ConfirmDialog
          isOpen={true}
          title="Delete status?"
          message={`Are you sure you want to delete the status "${deletingStatus.name}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={async () => {
            try {
              await onDeleteStatus(deletingStatus.id);
              setDeletingStatus(null);
              toastSuccess(`Status "${deletingStatus.name}" deleted`);
            } catch (error) {
              toastError("Failed to delete status");
              setDeletingStatus(null);
            }
          }}
          onCancel={() => setDeletingStatus(null)}
          isDanger={true}
        />
      )}

      {/* Confirm Remove User Dialog */}
      {removingUser && (
        <ConfirmDialog
          isOpen={true}
          title="Remove user?"
          message={`Are you sure you want to remove ${removingUser.display_name || removingUser.email} from this workspace? They will lose access immediately.`}
          confirmText="Remove User"
          cancelText="Cancel"
          onConfirm={async () => {
            try {
              await onRemoveUser(removingUser.id);
              setRemovingUser(null);
              toastSuccess(`User removed successfully`);
            } catch (error) {
              const errorMsg = getErrorMessage(error);
              toastError(errorMsg || "Failed to remove user");
              setRemovingUser(null);
            }
          }}
          onCancel={() => setRemovingUser(null)}
          isDanger={true}
        />
      )}
    </div>
  );
}

interface CreateStatusModalProps {
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}

function CreateStatusModal({ onClose, onSubmit }: CreateStatusModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6"); // Default blue
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predefinedColors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#22c55e" },
    { name: "Yellow", value: "#eab308" },
    { name: "Red", value: "#ef4444" },
    { name: "Purple", value: "#a855f7" },
    { name: "Orange", value: "#f97316" },
    { name: "Pink", value: "#ec4899" },
    { name: "Slate", value: "#94a3b8" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Status name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(name.trim(), color);
    } catch (error) {
      console.error("[CreateStatusModal] Error:", error);
      setError("Failed to create status. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        id="CreateStatusModal"
        className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-main)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Create Status
          </h2>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Status Name */}
            <div>
              <label
                htmlFor="StatusNameInput"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Status Name <span className="text-red-500">*</span>
              </label>
              <input
                id="StatusNameInput"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                placeholder="e.g., In Review"
                className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`flex items-center justify-center p-3 rounded-[8px] border-2 transition-all ${
                      color === c.value
                        ? "border-[var(--border-input-active)]"
                        : "border-transparent hover:border-[var(--border-main)]"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: c.value }}
                    />
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 bg-[var(--fill-tsp-white-light)] rounded-[8px]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">Preview:</p>
                <span
                  className="inline-block px-3 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {name || "Status Name"}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[8px]">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="CreateStatusSubmitButton"
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Status</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditStatusModalProps {
  status: TestCaseStatus;
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}

function EditStatusModal({ status, onClose, onSubmit }: EditStatusModalProps) {
  const [name, setName] = useState(status.name);
  const [color, setColor] = useState(status.color || "#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predefinedColors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#22c55e" },
    { name: "Yellow", value: "#eab308" },
    { name: "Red", value: "#ef4444" },
    { name: "Purple", value: "#a855f7" },
    { name: "Orange", value: "#f97316" },
    { name: "Pink", value: "#ec4899" },
    { name: "Slate", value: "#94a3b8" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Status name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(name.trim(), color);
    } catch (error) {
      console.error("[EditStatusModal] Error:", error);
      setError("Failed to update status. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        id="EditStatusModal"
        className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-main)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Edit Status
          </h2>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Status Name */}
            <div>
              <label
                htmlFor="EditStatusNameInput"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Status Name <span className="text-red-500">*</span>
              </label>
              <input
                id="EditStatusNameInput"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                placeholder="e.g., In Review"
                className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`flex items-center justify-center p-3 rounded-[8px] border-2 transition-all ${
                      color === c.value
                        ? "border-[var(--border-input-active)]"
                        : "border-transparent hover:border-[var(--border-main)]"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: c.value }}
                    />
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 bg-[var(--fill-tsp-white-light)] rounded-[8px]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">Preview:</p>
                <span
                  className="inline-block px-3 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {name || "Status Name"}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[8px]">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="EditStatusSubmitButton"
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

