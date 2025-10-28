"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => Promise<void>;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(name.trim(), description.trim() || undefined);
      
      // Reset form and close
      setName("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("[CreateProjectModal] Error:", error);
      setError("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName("");
      setDescription("");
      setError(null);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          id="CreateProjectModal"
          className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-main)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Create New Project
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors disabled:opacity-50"
            >
              <X size={20} className="text-[var(--icon-secondary)]" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label
                  htmlFor="ProjectNameInput"
                  className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="ProjectNameInput"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="e.g., E-commerce Website"
                  className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  autoFocus
                />
              </div>

              {/* Project Description */}
              <div>
                <label
                  htmlFor="ProjectDescriptionInput"
                  className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="ProjectDescriptionInput"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Brief description of your project"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-colors"
                />
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
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="CreateProjectSubmitButton"
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
                  <span>Create Project</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

