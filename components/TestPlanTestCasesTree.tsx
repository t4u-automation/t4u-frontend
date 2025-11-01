"use client";

import { TestPlan, Feature, Story, TestCase, TestCaseStatus } from "@/types";
import { Plus, Minus, Layers, Folder } from "lucide-react";
import { useState } from "react";

interface TestPlanTestCasesTreeProps {
  testPlan: TestPlan | null;
  features: Feature[];
  stories: Story[];
  testCases: TestCase[];
  statuses: TestCaseStatus[];
  onTestCaseClick: (testCaseId: string) => void;
}

export default function TestPlanTestCasesTree({
  testPlan,
  features,
  stories,
  testCases,
  statuses,
  onTestCaseClick,
}: TestPlanTestCasesTreeProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  if (!testPlan) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <div className="text-sm text-[var(--text-secondary)]">
            Select a test plan to view test cases
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-2">
            or create a new one to get started
          </div>
        </div>
      </div>
    );
  }

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

  // Filter test cases to only those in this test plan
  const testPlanTestCaseIds = new Set(testPlan.test_case_ids);
  const filteredTestCases = testCases.filter(tc => testPlanTestCaseIds.has(tc.id));

  // Get unique story IDs from filtered test cases
  const storyIds = new Set(filteredTestCases.map(tc => tc.story_id));
  const filteredStories = stories.filter(s => storyIds.has(s.id));

  // Get unique feature IDs from filtered stories
  const featureIds = new Set(filteredStories.map(s => s.feature_id));
  const filteredFeatures = features.filter(f => featureIds.has(f.id));

  const getStoriesForFeature = (featureId: string) => {
    return filteredStories.filter(s => s.feature_id === featureId);
  };

  const getTestCasesForStory = (storyId: string) => {
    return filteredTestCases.filter(tc => tc.story_id === storyId);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-main)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          {testPlan.name}
        </h2>
        {testPlan.description && (
          <p className="text-sm text-[var(--text-secondary)]">
            {testPlan.description}
          </p>
        )}
        <div className="text-xs text-[var(--text-tertiary)] mt-2">
          {testPlan.test_cases_count} test cases
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredFeatures.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
            No test cases in this plan
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredFeatures.map((feature) => {
              const isExpanded = expandedFeatures.has(feature.id);
              const featureStories = getStoriesForFeature(feature.id);

              return (
                <div key={feature.id}>
                  {/* Feature */}
                  <div
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded cursor-pointer group"
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <button className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded">
                      {isExpanded ? (
                        <Minus size={14} className="text-[var(--icon-secondary)]" />
                      ) : (
                        <Plus size={14} className="text-[var(--icon-secondary)]" />
                      )}
                    </button>
                    <Layers size={16} className="text-[var(--icon-secondary)]" />
                    <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                      {feature.name}
                    </span>
                  </div>

                  {/* Stories under Feature */}
                  {isExpanded && (
                    <>
                      {featureStories.map((story) => {
                        const isStoryExpanded = expandedStories.has(story.id);
                        const storyTestCases = getTestCasesForStory(story.id);

                        return (
                          <div key={story.id} className="ml-4">
                            {/* Story */}
                            <div
                              className="flex items-center gap-1 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded cursor-pointer group"
                              onClick={() => toggleStory(story.id)}
                            >
                              <button className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded">
                                {isStoryExpanded ? (
                                  <Minus size={14} className="text-[var(--icon-secondary)]" />
                                ) : (
                                  <Plus size={14} className="text-[var(--icon-secondary)]" />
                                )}
                              </button>
                              <Folder size={16} className="text-[var(--icon-secondary)]" />
                              <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                                {story.name}
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)] mr-1">
                                {storyTestCases.length}
                              </span>
                            </div>

                            {/* Test Cases under Story */}
                            {isStoryExpanded && (
                              <>
                                {storyTestCases.map((testCase) => {
                                  const testCaseStatus = statuses.find(s => s.id === testCase.status_id);
                                  const statusColor = testCaseStatus?.color || "#94a3b8";

                                  return (
                                    <div
                                      key={testCase.id}
                                      className="ml-4 flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--fill-tsp-white-light)] text-[var(--text-primary)]"
                                      onClick={() => onTestCaseClick(testCase.id)}
                                    >
                                      <div className="w-4" />
                                      <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: statusColor }}
                                        title={testCaseStatus?.name || "Unknown status"}
                                      />
                                      <span className="text-sm flex-1 truncate">
                                        {testCase.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

