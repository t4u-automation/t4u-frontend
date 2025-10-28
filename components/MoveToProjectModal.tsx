"use client";

import { Project } from "@/types";
import { X } from "lucide-react";
import { useState } from "react";

interface MoveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetProjectId: string) => Promise<void>;
  currentProjectId: string;
  itemType: "feature" | "story" | "testcase";
  itemName: string;
  projects: Project[];
  dependenciesCount?: {
    features?: number;
    stories?: number;
    testCases?: number;
  };
}

export default function MoveToProjectModal({
  isOpen,
  onClose,
  onMove,
  currentProjectId,
  itemType,
  itemName,
  projects,
  dependenciesCount = {},
}: MoveToProjectModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableProjects = projects.filter((p) => p.id !== currentProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      setError("Please select a project");
      return;
    }

    try {
      setIsMoving(true);
      setError(null);
      await onMove(selectedProjectId);
      onClose();
    } catch (error) {
      console.error("[MoveToProjectModal] Error:", error);
      setError("Failed to move item. Please try again.");
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    if (!isMoving) {
      setSelectedProjectId("");
      setError(null);
      onClose();
    }
  };

  const getDependenciesText = () => {
    if (itemType === "testcase") {
      return "This will also move its parent Story and Feature to maintain the structure.";
    } else if (itemType === "story") {
      const testCasesCount = dependenciesCount.testCases || 0;
      return `This will also move ${testCasesCount} test case${testCasesCount !== 1 ? 's' : ''} and its parent Feature.`;
    } else {
      const storiesCount = dependenciesCount.stories || 0;
      const testCasesCount = dependenciesCount.testCases || 0;
      return `This will also move ${storiesCount} stor${storiesCount !== 1 ? 'ies' : 'y'} and ${testCasesCount} test case${testCasesCount !== 1 ? 's' : ''}.`;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={handleClose}
      >
        <div
          id="MoveToProjectModal"
          className="bg-white rounded-[16px] shadow-xl w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border-main)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Move to Project
            </h2>
            <button
              onClick={handleClose}
              disabled={isMoving}
              className="p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors disabled:opacity-50"
            >
              <X size={20} className="text-[var(--icon-secondary)]" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Item Info */}
              <div className="p-3 bg-[var(--fill-tsp-white-light)] rounded-[8px] border border-[var(--border-light)]">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                  Moving: {itemName}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {getDependenciesText()}
                </p>
              </div>

              {/* Project Selector */}
              <div>
                <label
                  htmlFor="TargetProjectSelect"
                  className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                >
                  Target Project <span className="text-red-500">*</span>
                </label>
                <select
                  id="TargetProjectSelect"
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setError(null);
                  }}
                  disabled={isMoving}
                  className="w-full px-4 py-2.5 bg-white border border-[var(--border-main)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="">Select a project...</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {availableProjects.length === 0 && (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    No other projects available
                  </p>
                )}
              </div>

              {/* Warning */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[8px]">
                <p className="text-xs text-yellow-700">
                  Note: If items with the same name already exist in the target project, they will be created with a suffix (e.g., &quot;Name (2)&quot;).
                </p>
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
                disabled={isMoving}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="MoveToProjectSubmitButton"
                type="submit"
                disabled={isMoving || !selectedProjectId || availableProjects.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMoving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Moving...</span>
                  </>
                ) : (
                  <span>Move</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

