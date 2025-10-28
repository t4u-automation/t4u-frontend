"use client";

import { Tenant, TestCaseStatus } from "@/types";
import { useState } from "react";
import { Save, Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "./ConfirmDialog";

interface TenantSettingsProps {
  tenant: Tenant;
  statuses: TestCaseStatus[];
  onUpdateTenant: (name: string) => Promise<void>;
  onCreateStatus: (name: string, color: string) => Promise<void>;
  onUpdateStatus: (statusId: string, name: string, color: string) => Promise<void>;
  onDeleteStatus: (statusId: string) => Promise<void>;
}

export default function TenantSettings({
  tenant,
  statuses,
  onUpdateTenant,
  onCreateStatus,
  onUpdateStatus,
  onDeleteStatus,
}: TenantSettingsProps) {
  const { showSuccess: toastSuccess, showError: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "statuses">("general");
  const [tenantName, setTenantName] = useState(tenant.name);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TestCaseStatus | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<TestCaseStatus | null>(null);

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
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "general"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("statuses")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "statuses"
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
        {activeTab === "general" ? (
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
                {statuses.map((status, index) => (
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

