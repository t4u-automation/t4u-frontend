"use client";

import { X, Loader2, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { Feature, Story, TestCase } from "@/types";

interface CreateRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, testCaseIds: string[]) => Promise<void>;
  features: Feature[];
  stories: Story[];
  testCases: TestCase[];
}

export default function CreateRunModal({
  isOpen,
  onClose,
  onSubmit,
  features,
  stories,
  testCases,
}: CreateRunModalProps) {
  const [name, setName] = useState("");
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedTestCaseIds.size === 0) return;

    try {
      setIsSubmitting(true);
      await onSubmit(name.trim(), Array.from(selectedTestCaseIds));
      handleClose();
    } catch (error) {
      console.error("[CreateRunModal] Error creating run:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setSelectedTestCaseIds(new Set());
    setExpandedFeatures(new Set());
    setExpandedStories(new Set());
    onClose();
  };

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const toggleStory = (storyId: string) => {
    const newExpanded = new Set(expandedStories);
    if (newExpanded.has(storyId)) {
      newExpanded.delete(storyId);
    } else {
      newExpanded.add(storyId);
    }
    setExpandedStories(newExpanded);
  };

  const toggleTestCase = (testCaseId: string) => {
    const newSelected = new Set(selectedTestCaseIds);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCaseIds(newSelected);
  };

  const toggleSelectAll = (storyId: string) => {
    const storyTestCases = getTestCasesForStory(storyId).filter(tc => tc.proven_steps && tc.proven_steps.length > 0);
    const allSelected = storyTestCases.every(tc => selectedTestCaseIds.has(tc.id));
    
    const newSelected = new Set(selectedTestCaseIds);
    if (allSelected) {
      storyTestCases.forEach(tc => newSelected.delete(tc.id));
    } else {
      storyTestCases.forEach(tc => newSelected.add(tc.id));
    }
    setSelectedTestCaseIds(newSelected);
  };

  const getStoriesForFeature = (featureId: string) => {
    // Only return stories that have test cases with proven steps
    return stories.filter(s => {
      if (s.feature_id !== featureId) return false;
      const storyTestCases = testCases.filter(tc => 
        tc.story_id === s.id && tc.proven_steps && tc.proven_steps.length > 0
      );
      return storyTestCases.length > 0;
    });
  };

  const getTestCasesForStory = (storyId: string) => {
    return testCases.filter(tc => tc.story_id === storyId);
  };

  const getFeaturesWithRunnableTestCases = () => {
    // Only return features that have test cases with proven steps
    return features.filter(f => {
      const featureStories = getStoriesForFeature(f.id);
      return featureStories.length > 0;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[12px] shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Create Run
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
            >
              <X size={20} className="text-[var(--icon-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter run name (e.g., Regression Run #1)"
                  className="w-full px-3 py-2 bg-white border border-[var(--border-main)] rounded-[8px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)]"
                  required
                  autoFocus
                />
              </div>

              {/* Test Cases Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Select Test Cases * (only test cases with automated steps)
                  </label>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {selectedTestCaseIds.size} selected
                  </span>
                </div>
                
                <div className="border border-[var(--border-main)] rounded-[8px] max-h-[400px] overflow-y-auto p-2">
                  {getFeaturesWithRunnableTestCases().length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                      No test cases with automated steps available
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {getFeaturesWithRunnableTestCases().map(feature => {
                        const featureStories = getStoriesForFeature(feature.id);
                        const isExpanded = expandedFeatures.has(feature.id);
                        
                        return (
                          <div key={feature.id}>
                            {/* Feature */}
                            <div
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded cursor-pointer"
                              onClick={() => toggleFeature(feature.id)}
                            >
                              <button className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded">
                                {isExpanded ? (
                                  <Minus size={14} className="text-[var(--icon-secondary)]" />
                                ) : (
                                  <Plus size={14} className="text-[var(--icon-secondary)]" />
                                )}
                              </button>
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {feature.name}
                              </span>
                            </div>

                            {/* Stories */}
                            {isExpanded && featureStories.map(story => {
                              const storyTestCases = getTestCasesForStory(story.id).filter(tc => 
                                tc.proven_steps && tc.proven_steps.length > 0
                              );
                              const isStoryExpanded = expandedStories.has(story.id);
                              const allSelected = storyTestCases.length > 0 && 
                                storyTestCases.every(tc => selectedTestCaseIds.has(tc.id));
                              const someSelected = storyTestCases.some(tc => selectedTestCaseIds.has(tc.id));

                              return (
                                <div key={story.id} className="ml-4">
                                  {/* Story */}
                                  <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded">
                                    <button 
                                      className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded"
                                      onClick={() => toggleStory(story.id)}
                                    >
                                      {isStoryExpanded ? (
                                        <Minus size={14} className="text-[var(--icon-secondary)]" />
                                      ) : (
                                        <Plus size={14} className="text-[var(--icon-secondary)]" />
                                      )}
                                    </button>
                                    <input
                                      type="checkbox"
                                      checked={allSelected}
                                      ref={(el) => {
                                        if (el) el.indeterminate = someSelected && !allSelected;
                                      }}
                                      onChange={() => toggleSelectAll(story.id)}
                                      className="w-4 h-4 rounded border-gray-300"
                                    />
                                    <span className="text-sm text-[var(--text-primary)] flex-1">
                                      {story.name} ({storyTestCases.length})
                                    </span>
                                  </div>

                                  {/* Test Cases */}
                                  {isStoryExpanded && storyTestCases.map(testCase => (
                                    <div key={testCase.id} className="ml-6 flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded">
                                      <input
                                        type="checkbox"
                                        checked={selectedTestCaseIds.has(testCase.id)}
                                        onChange={() => toggleTestCase(testCase.id)}
                                        className="w-4 h-4 rounded border-gray-300"
                                      />
                                      <span className="text-sm text-[var(--text-secondary)]">
                                        {testCase.name}
                                      </span>
                                      <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                                        {testCase.proven_steps?.length || 0} steps
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white border border-[var(--border-main)] rounded-[8px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || selectedTestCaseIds.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>{isSubmitting ? "Creating..." : "Create & Start Run"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

