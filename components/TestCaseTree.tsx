"use client";

import { Feature, Story, TestCase, TestCaseStatus } from "@/types";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Layers, Plus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import TreeItemContextMenu from "./TreeItemContextMenu";

interface TestCaseTreeProps {
  features: Feature[];
  stories: Story[];
  testCases: TestCase[];
  statuses: TestCaseStatus[];
  selectedTestCaseId?: string;
  autoExpandFeatureId?: string | null; // Feature to auto-expand
  onTestCaseSelect: (testCaseId: string) => void;
  onCreateFeature?: () => void;
  onCreateStory?: (featureId: string, name: string) => Promise<string | void>;
  onCreateTestCase?: (storyId: string, name: string) => Promise<string | void>;
  onDeleteFeature?: (featureId: string) => Promise<void>;
  onDeleteStory?: (storyId: string) => Promise<void>;
  onDeleteTestCase?: (testCaseId: string) => Promise<void>;
  onMoveFeature?: (featureId: string) => void;
  onMoveStory?: (storyId: string) => void;
  onMoveTestCase?: (testCaseId: string) => void;
  onCloneFeature?: (featureId: string) => Promise<void>;
  onCloneStory?: (storyId: string) => Promise<void>;
  onCloneTestCase?: (testCaseId: string) => Promise<void>;
  onRenameFeature?: (featureId: string) => void;
  onRenameStory?: (storyId: string) => void;
  onRenameTestCase?: (testCaseId: string) => void;
}

export default function TestCaseTree({
  features,
  stories,
  testCases,
  statuses,
  selectedTestCaseId,
  autoExpandFeatureId,
  onTestCaseSelect,
  onCreateFeature,
  onCreateStory,
  onCreateTestCase,
  onDeleteFeature,
  onDeleteStory,
  onDeleteTestCase,
  onMoveFeature,
  onMoveStory,
  onMoveTestCase,
  onCloneFeature,
  onCloneStory,
  onCloneTestCase,
  onRenameFeature,
  onRenameStory,
  onRenameTestCase,
}: TestCaseTreeProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingStoryFor, setCreatingStoryFor] = useState<string | null>(null);
  const [creatingTestCaseFor, setCreatingTestCaseFor] = useState<string | null>(null);
  const [inlineInput, setInlineInput] = useState("");
  
  // Auto-expand feature when requested from parent
  useEffect(() => {
    if (autoExpandFeatureId && !expandedFeatures.has(autoExpandFeatureId)) {
      setExpandedFeatures(new Set(expandedFeatures).add(autoExpandFeatureId));
    }
  }, [autoExpandFeatureId]);

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

  const getStoriesForFeature = (featureId: string) => {
    return stories.filter((s) => s.feature_id === featureId);
  };

  const getTestCasesForStory = (storyId: string) => {
    return testCases.filter((tc) => tc.story_id === storyId);
  };

  const handleCreateStory = async (featureId: string) => {
    if (!inlineInput.trim() || !onCreateStory) return;

    try {
      const newStoryId = await onCreateStory(featureId, inlineInput.trim());
      setInlineInput("");
      setCreatingStoryFor(null);
      
      // Ensure the feature is expanded to show the new story
      const newExpandedFeatures = new Set(expandedFeatures);
      newExpandedFeatures.add(featureId);
      setExpandedFeatures(newExpandedFeatures);
      
      // Auto-expand the newly created story if ID is returned
      if (newStoryId && typeof newStoryId === 'string') {
        const newExpandedStories = new Set(expandedStories);
        newExpandedStories.add(newStoryId);
        setExpandedStories(newExpandedStories);
      }
    } catch (error) {
      console.error("[TestCaseTree] Error creating story:", error);
    }
  };

  const handleCreateTestCase = async (storyId: string) => {
    if (!inlineInput.trim() || !onCreateTestCase) return;

    try {
      const newTestCaseId = await onCreateTestCase(storyId, inlineInput.trim());
      setInlineInput("");
      setCreatingTestCaseFor(null);
      
      // Ensure the story is expanded
      const newExpandedStories = new Set(expandedStories);
      newExpandedStories.add(storyId);
      setExpandedStories(newExpandedStories);
      
      // Auto-select the newly created test case
      if (newTestCaseId && typeof newTestCaseId === 'string') {
        onTestCaseSelect(newTestCaseId);
      }
    } catch (error) {
      console.error("[TestCaseTree] Error creating test case:", error);
    }
  };

  const cancelInlineEdit = () => {
    setInlineInput("");
    setCreatingStoryFor(null);
    setCreatingTestCaseFor(null);
  };

  // Search logic - filter features, stories, and test cases
  const searchLower = searchQuery.toLowerCase();
  
  const filteredData = searchQuery
    ? (() => {
        // Find matching test cases
        const matchingTestCaseIds = new Set(
          testCases
            .filter((tc) => tc.name.toLowerCase().includes(searchLower))
            .map((tc) => tc.id)
        );
        
        // Find stories that match OR have matching test cases
        const matchingStoryIds = new Set(
          stories
            .filter((s) => {
              const nameMatches = s.name.toLowerCase().includes(searchLower);
              const hasMatchingTestCases = testCases.some(
                (tc) => tc.story_id === s.id && matchingTestCaseIds.has(tc.id)
              );
              return nameMatches || hasMatchingTestCases;
            })
            .map((s) => s.id)
        );
        
        // Find features that match OR have matching stories/test cases
        const matchingFeatureIds = new Set(
          features
            .filter((f) => {
              const nameMatches = f.name.toLowerCase().includes(searchLower);
              const hasMatchingStories = stories.some(
                (s) => s.feature_id === f.id && matchingStoryIds.has(s.id)
              );
              return nameMatches || hasMatchingStories;
            })
            .map((f) => f.id)
        );
        
        // Auto-expand features and stories with matches
        const autoExpandFeatures = new Set(matchingFeatureIds);
        const autoExpandStories = new Set(matchingStoryIds);
        
        return {
          features: features.filter((f) => matchingFeatureIds.has(f.id)),
          stories: stories.filter((s) => matchingStoryIds.has(s.id)),
          testCases: testCases.filter((tc) => matchingTestCaseIds.has(tc.id)),
          autoExpandFeatures,
          autoExpandStories,
        };
      })()
    : {
        features: features,
        stories: stories,
        testCases: testCases,
        autoExpandFeatures: expandedFeatures,
        autoExpandStories: expandedStories,
      };

  const filteredFeatures = filteredData.features;

  return (
    <div
      id="TestCaseTree"
      className="w-[416px] bg-white border-r border-[var(--border-main)] flex flex-col flex-shrink-0"
    >
      {/* Search Bar */}
      <div className="p-3 border-b border-[var(--border-main)]">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--icon-secondary)]"
          />
          <input
            id="TestCaseSearchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--fill-tsp-white-light)] border-0 rounded-[6px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-active)]"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs text-[var(--text-tertiary)] px-2 py-1 mb-1">
          Test cases: {searchQuery ? filteredData.testCases.length : testCases.length}
          {searchQuery && filteredData.testCases.length !== testCases.length && (
            <span className="text-[var(--text-secondary)]"> (filtered from {testCases.length})</span>
          )}
        </div>

        {filteredFeatures.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Folder size={32} className="text-[var(--icon-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              {searchQuery ? "No matches found" : "No features yet"}
            </p>
            {searchQuery && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredFeatures.map((feature) => {
              const isExpanded = searchQuery 
                ? filteredData.autoExpandFeatures.has(feature.id)
                : expandedFeatures.has(feature.id);
              const featureStories = filteredData.stories.filter((s) => s.feature_id === feature.id);
              const featureTestCount = featureStories.reduce(
                (acc, story) => {
                  const storyTests = filteredData.testCases.filter((tc) => tc.story_id === story.id);
                  return acc + storyTests.length;
                },
                0
              );

              return (
                <div key={feature.id} id={`Feature_${feature.id}`}>
                  {/* Feature */}
                  <div
                    className="flex items-center gap-1 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded cursor-pointer group"
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <button className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded">
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[var(--icon-secondary)]" />
                      ) : (
                        <ChevronRight size={14} className="text-[var(--icon-secondary)]" />
                      )}
                    </button>
                    <Layers size={16} className="text-[var(--icon-secondary)]" />
                    <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                      {feature.name}
                    </span>
                    {featureTestCount > 0 && (
                      <span className="text-xs text-[var(--text-tertiary)] mr-1">
                        {featureTestCount}
                      </span>
                    )}
                    <TreeItemContextMenu
                      type="feature"
                      itemName={feature.name}
                      onRename={() => onRenameFeature?.(feature.id)}
                      onClone={() => onCloneFeature?.(feature.id)}
                      onMove={() => onMoveFeature?.(feature.id)}
                      onDelete={() => onDeleteFeature?.(feature.id)}
                    />
                  </div>

                  {/* Stories under Feature */}
                  {isExpanded && (
                    <>
                      {featureStories.map((story) => {
                      const isStoryExpanded = searchQuery
                        ? filteredData.autoExpandStories.has(story.id)
                        : expandedStories.has(story.id);
                      const storyTestCases = filteredData.testCases.filter((tc) => tc.story_id === story.id);

                      return (
                        <div key={story.id} id={`Story_${story.id}`} className="ml-4">
                          {/* Story */}
                          <div
                            className="flex items-center gap-1 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded cursor-pointer group"
                            onClick={() => toggleStory(story.id)}
                          >
                            <button className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded">
                              {isStoryExpanded ? (
                                <ChevronDown size={14} className="text-[var(--icon-secondary)]" />
                              ) : (
                                <ChevronRight size={14} className="text-[var(--icon-secondary)]" />
                              )}
                            </button>
                            <Folder size={16} className="text-[var(--icon-secondary)]" />
                            <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                              {story.name}
                            </span>
                            {storyTestCases.length > 0 && (
                              <span className="text-xs text-[var(--text-tertiary)] mr-1">
                                {storyTestCases.length}
                              </span>
                            )}
                            <TreeItemContextMenu
                              type="story"
                              itemName={story.name}
                              onRename={() => onRenameStory?.(story.id)}
                              onClone={() => onCloneStory?.(story.id)}
                              onMove={() => onMoveStory?.(story.id)}
                              onDelete={() => onDeleteStory?.(story.id)}
                            />
                          </div>

                          {/* Test Cases under Story */}
                          {isStoryExpanded && (
                            <>
                              {storyTestCases.map((testCase) => {
                                const isSelected = testCase.id === selectedTestCaseId;
                                const testCaseStatus = statuses.find(s => s.id === testCase.status_id);
                                const statusColor = testCaseStatus?.color || "#94a3b8";

                                return (
                                  <div
                                    key={testCase.id}
                                    id={`TestCase_${testCase.id}`}
                                    className={`ml-4 flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group ${
                                      isSelected
                                        ? "bg-blue-50 text-blue-700"
                                        : "hover:bg-[var(--fill-tsp-white-light)] text-[var(--text-primary)]"
                                    }`}
                                    onClick={() => onTestCaseSelect(testCase.id)}
                                  >
                                    <div className="w-4" /> {/* Spacer for alignment */}
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: statusColor }}
                                      title={testCaseStatus?.name || "Unknown status"}
                                    />
                                    <span className="text-sm flex-1 truncate">
                                      {testCase.name}
                                    </span>
                                    <TreeItemContextMenu
                                      type="testcase"
                                      itemName={testCase.name}
                                      onRename={() => onRenameTestCase?.(testCase.id)}
                                      onClone={() => onCloneTestCase?.(testCase.id)}
                                      onMove={() => onMoveTestCase?.(testCase.id)}
                                      onDelete={() => onDeleteTestCase?.(testCase.id)}
                                    />
                                  </div>
                                );
                              })}

                              {/* Inline Test Case Creator - Hide during search */}
                              {!searchQuery && creatingTestCaseFor === story.id ? (
                                <div className="ml-4 flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded">
                                  <div className="w-4" />
                                  <Plus size={16} className="text-blue-500" />
                                  <input
                                    type="text"
                                    value={inlineInput}
                                    onChange={(e) => setInlineInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleCreateTestCase(story.id);
                                      } else if (e.key === "Escape") {
                                        cancelInlineEdit();
                                      }
                                    }}
                                    onBlur={() => {
                                      if (inlineInput.trim()) {
                                        handleCreateTestCase(story.id);
                                      } else {
                                        cancelInlineEdit();
                                      }
                                    }}
                                    placeholder="Test Case name"
                                    className="flex-1 bg-transparent border-0 outline-none text-sm text-[var(--text-primary)] placeholder:text-blue-400"
                                    autoFocus
                                  />
                                </div>
                              ) : !searchQuery ? (
                                <button
                                  className="ml-4 flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                  onClick={() => {
                                    // Expand the story when starting to create a test case
                                    const newExpandedStories = new Set(expandedStories);
                                    newExpandedStories.add(story.id);
                                    setExpandedStories(newExpandedStories);
                                    
                                    setCreatingTestCaseFor(story.id);
                                    setInlineInput("");
                                  }}
                                >
                                  <div className="w-4" />
                                  <Plus size={16} />
                                  <span className="text-sm italic">Test Case</span>
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Inline Story Creator - Hide during search */}
                    {isExpanded && !searchQuery && (
                      <>
                        {creatingStoryFor === feature.id ? (
                          <div className="ml-4 flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded">
                            <div className="w-4" />
                            <Folder size={16} className="text-blue-500" />
                            <input
                              type="text"
                              value={inlineInput}
                              onChange={(e) => setInlineInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleCreateStory(feature.id);
                                } else if (e.key === "Escape") {
                                  cancelInlineEdit();
                                }
                              }}
                              onBlur={() => {
                                if (inlineInput.trim()) {
                                  handleCreateStory(feature.id);
                                } else {
                                  cancelInlineEdit();
                                }
                              }}
                              placeholder="Story name"
                              className="flex-1 bg-transparent border-0 outline-none text-sm text-[var(--text-primary)] placeholder:text-blue-400"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            className="ml-4 flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--fill-tsp-white-light)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                            onClick={() => {
                              // Expand the feature when starting to create a story
                              const newExpandedFeatures = new Set(expandedFeatures);
                              newExpandedFeatures.add(feature.id);
                              setExpandedFeatures(newExpandedFeatures);
                              
                              setCreatingStoryFor(feature.id);
                              setInlineInput("");
                            }}
                          >
                            <div className="w-4" />
                            <Folder size={16} />
                            <span className="text-sm italic">New Story</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[var(--border-main)]">
        <button
          id="CreateFeatureButton"
          onClick={onCreateFeature}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[var(--border-main)] rounded-[6px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] transition-colors"
        >
          <Plus size={16} />
          <span>Feature</span>
        </button>
      </div>
    </div>
  );
}

