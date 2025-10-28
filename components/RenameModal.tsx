"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  itemType: "feature" | "story" | "testcase";
  currentName: string;
}

export default function RenameModal({
  isOpen,
  onClose,
  onRename,
  itemType,
  currentName,
}: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError(null);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    try {
      setIsRenaming(true);
      setError(null);
      await onRename(name.trim());
      onClose();
    } catch (error) {
      console.error("[RenameModal] Error:", error);
      setError("Failed to rename. Please try again.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleClose = () => {
    if (!isRenaming) {
      setName(currentName);
      setError(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        id="RenameModal"
        className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-main)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Rename {itemType === "feature" ? "Feature" : itemType === "story" ? "Story" : "Test Case"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isRenaming}
            className="p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-[var(--icon-secondary)]" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label
                htmlFor="RenameInput"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="RenameInput"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isRenaming}
                className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                autoFocus
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
              disabled={isRenaming}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="RenameSubmitButton"
              type="submit"
              disabled={isRenaming || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRenaming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Renaming...</span>
                </>
              ) : (
                <span>Rename</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

