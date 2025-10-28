"use client";

import { TestCase, TestCaseStatus, TestCaseStep, ProvenStep } from "@/types";
import { Edit2, Save, X, MoreVertical, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import StatusDropdown from "./StatusDropdown";
import ConfirmDialog from "./ConfirmDialog";
import { useTestCaseSession } from "@/hooks/useTestCaseSession";
import { startAgent, pauseAgent, resumeAgent } from "@/lib/api";
import MessageItem from "./MessageItem";
import FloatingVNC from "./FloatingVNC";
import SystemEventsHeader from "./SystemEventsHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/contexts/ToastContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TestCaseDetailsProps {
  testCase: TestCase;
  status?: TestCaseStatus;
  allStatuses: TestCaseStatus[];
  onStatusChange: (testCaseId: string, newStatusId: string) => Promise<void>;
  onUpdate: (updates: Partial<Pick<TestCase, "description" | "scenario">>) => Promise<void>;
  onDelete?: (testCaseId: string) => Promise<void>;
}

export default function TestCaseDetails({ 
  testCase, 
  status, 
  allStatuses,
  onStatusChange,
  onUpdate,
  onDelete
}: TestCaseDetailsProps) {
  const { user } = useAuth();
  const { tenant } = useTenant(user);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<
    "overview" | "automated-steps" | "ai-exploration"
  >("overview");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingScenario, setIsEditingScenario] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(testCase.description || "");
  const [scenarioValue, setScenarioValue] = useState(
    typeof testCase.scenario === "string" ? testCase.scenario : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingAgent, setIsStartingAgent] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [provenSteps, setProvenSteps] = useState<ProvenStep[] | undefined>(testCase.proven_steps);
  const [provenStepsCount, setProvenStepsCount] = useState<number | undefined>(testCase.proven_steps_count);

  // Fetch latest agent session for this test case
  const {
    latestSession,
    currentSession,
    vncUrl,
    isVNCActive,
    artifacts,
    totalCost,
    totalTokens,
    loading: sessionLoading,
  } = useTestCaseSession(testCase.id, tenant?.id);

  const isStructuredScenario = Array.isArray(testCase.scenario);
  const scenarioSteps = isStructuredScenario ? (testCase.scenario as TestCaseStep[]) : [];
  const scenarioText = !isStructuredScenario ? (testCase.scenario as string) : "";

  // Reset to Overview tab and cancel any editing when test case changes
  useEffect(() => {
    setActiveTab("overview");
    setIsEditingDescription(false);
    setIsEditingScenario(false);
    setDescriptionValue(testCase.description || "");
    setScenarioValue(typeof testCase.scenario === "string" ? testCase.scenario : "");
    setShowMoreMenu(false);
    setProvenSteps(testCase.proven_steps);
    setProvenStepsCount(testCase.proven_steps_count);
  }, [testCase.id, testCase.description, testCase.scenario]);

  // Real-time listener for proven_steps updates
  useEffect(() => {
    const testCaseRef = doc(db, "test_cases", testCase.id);
    
    const unsubscribe = onSnapshot(testCaseRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProvenSteps(data.proven_steps);
        setProvenStepsCount(data.proven_steps_count);
      }
    });

    return () => unsubscribe();
  }, [testCase.id]);

  const handleRunWithAgent = async () => {
    if (!user || !tenant) return;
    
    const scenario = typeof testCase.scenario === "string" 
      ? testCase.scenario 
      : scenarioSteps.map((s, i) => `${i + 1}. ${s.description}`).join("\n");

    if (!scenario.trim()) {
      showError("Please add a scenario before running the agent");
      return;
    }

    try {
      setIsStartingAgent(true);
      
      // Clear proven steps before starting new session
      await clearProvenSteps();
      
      await startAgent(scenario, user.uid, (event) => {
        if (event.type === "session_created") {
          setIsStartingAgent(false);
          showSuccess("AI Agent started");
        }
        if (event.type === "completed" || event.type === "error") {
          setIsStartingAgent(false);
        }
      }, testCase.id, tenant.id);
    } catch (error) {
      console.error("[TestCaseDetails] Error starting agent:", error);
      showError("Failed to start AI agent");
      setIsStartingAgent(false);
    }
  };

  const clearProvenSteps = async () => {
    try {
      const { clearTestCaseProvenSteps } = await import("@/lib/t4u");
      await clearTestCaseProvenSteps(testCase.id);
      console.log("[TestCaseDetails] Proven steps cleared");
    } catch (error) {
      console.error("[TestCaseDetails] Error clearing proven steps:", error);
    }
  };

  const handleSaveDescription = async () => {
    try {
      setIsSaving(true);
      await onUpdate({ description: descriptionValue.trim() || undefined });
      setIsEditingDescription(false);
    } catch (error) {
      console.error("[TestCaseDetails] Error saving description:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDescription = () => {
    setDescriptionValue(testCase.description || "");
    setIsEditingDescription(false);
  };

  const handleSaveScenario = async () => {
    try {
      setIsSaving(true);
      await onUpdate({ scenario: scenarioValue.trim() || "" });
      setIsEditingScenario(false);
    } catch (error) {
      console.error("[TestCaseDetails] Error saving scenario:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelScenario = () => {
    setScenarioValue(typeof testCase.scenario === "string" ? testCase.scenario : "");
    setIsEditingScenario(false);
  };

  const handlePauseAgent = async () => {
    if (!latestSession) return;
    try {
      await pauseAgent(latestSession.session_id);
      showSuccess("Agent paused");
    } catch (error) {
      console.error("[TestCaseDetails] Error pausing agent:", error);
      showError("Failed to pause agent");
    }
  };

  const handleResumeAgent = async () => {
    if (!latestSession) return;
    try {
      await resumeAgent(latestSession.session_id);
      showSuccess("Agent resumed");
    } catch (error) {
      console.error("[TestCaseDetails] Error resuming agent:", error);
      showError("Failed to resume agent");
    }
  };

  const handleDeleteTestCase = async () => {
    if (!onDelete) return;
    try {
      await onDelete(testCase.id);
      showSuccess("Test case deleted");
    } catch (error) {
      console.error("[TestCaseDetails] Error deleting test case:", error);
      showError("Failed to delete test case");
    }
  };

  // Helper function to format action names
  const formatActionName = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to render step arguments
  const renderStepArguments = (step: ProvenStep) => {
    const args = step.arguments;
    const elements: JSX.Element[] = [];

    if (args.url) {
      elements.push(
        <div key="url" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">URL:</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono break-all">{args.url}</span>
        </div>
      );
    }

    if (args.by_placeholder) {
      elements.push(
        <div key="by_placeholder" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Placeholder:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.by_placeholder}</span>
        </div>
      );
    }

    if (args.by_role) {
      elements.push(
        <div key="by_role" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Role:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.by_role}</span>
        </div>
      );
    }

    if (args.by_label) {
      elements.push(
        <div key="by_label" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Label:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.by_label}</span>
        </div>
      );
    }

    if (args.by_text) {
      elements.push(
        <div key="by_text" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Text:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.by_text}</span>
        </div>
      );
    }

    if (args.text) {
      elements.push(
        <div key="text" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Input:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.text}</span>
        </div>
      );
    }

    if (args.index !== undefined) {
      elements.push(
        <div key="index" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Index:</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">#{args.index}</span>
        </div>
      );
    }

    if (args.expected_text) {
      elements.push(
        <div key="expected_text" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Expected:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.expected_text}</span>
        </div>
      );
    }

    if (args.seconds !== undefined) {
      elements.push(
        <div key="seconds" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Duration:</span>
          <span className="text-xs text-[var(--text-secondary)]">{args.seconds}s</span>
        </div>
      );
    }

    if (args.script) {
      elements.push(
        <div key="script" className="flex items-start gap-2">
          <span className="text-xs text-[var(--text-tertiary)] min-w-[60px]">Script:</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono break-all line-clamp-2">{args.script}</span>
        </div>
      );
    }

    // Add assertion description
    if (args.assertion_description) {
      elements.push(
        <div key="assertion" className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-[6px]">
          <p className="text-xs text-blue-800">
            ✓ {args.assertion_description}
          </p>
        </div>
      );
    }

    return elements.length > 0 ? elements : (
      <span className="text-xs text-[var(--text-tertiary)] italic">No additional parameters</span>
    );
  };

  return (
    <div id="TestCaseDetails" className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border-main)] p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {status && (
              <StatusDropdown
                currentStatus={status}
                allStatuses={allStatuses}
                onStatusChange={(newStatusId) => onStatusChange(testCase.id, newStatusId)}
              />
            )}
            <h1 className="text-xl font-semibold text-[var(--text-primary)] flex-1 truncate">
              {testCase.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
                title="More"
              >
                <MoreVertical size={18} className="text-[var(--icon-secondary)]" />
              </button>

              {/* More Menu Dropdown */}
              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-10 w-48 bg-white rounded-[8px] shadow-lg border border-[var(--border-main)] py-1 z-50">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--fill-tsp-white-light)] transition-colors text-red-600"
                    >
                      <Trash2 size={16} className="text-red-500" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete test case?"
          message={`Are you sure you want to delete "${testCase.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            handleDeleteTestCase();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          isDanger={true}
        />

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[var(--border-light)] -mb-4">
          {[
            { id: "overview", label: "Overview" },
            { id: "ai-exploration", label: "A.I. Exploration" },
            { id: "automated-steps", label: "Automated Steps" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "overview" | "automated-steps" | "ai-exploration")}
              className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === "automated-steps" && provenStepsCount !== undefined && provenStepsCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-semibold">
                  {provenStepsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${activeTab === "ai-exploration" ? "p-0" : "p-6"}`}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Scenario */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Scenario
                </h3>
                {!isEditingScenario && !isStructuredScenario && (
                  <button
                    onClick={() => {
                      setIsEditingScenario(true);
                      setScenarioValue(scenarioText);
                    }}
                    className="p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
                    title="Edit scenario"
                  >
                    <Edit2 size={14} className="text-[var(--icon-secondary)]" />
                  </button>
                )}
              </div>
              
              {isStructuredScenario ? (
                <div className="space-y-2">
                  {scenarioSteps.map((step) => (
                    <div
                      key={step.index}
                      className="flex gap-3 p-3 bg-[var(--fill-tsp-white-light)] rounded-[8px] border border-[var(--border-light)]"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--fill-tsp-gray-main)] flex items-center justify-center">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          {step.index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] mb-1">
                          {step.description}
                        </p>
                        {step.expectedResult && (
                          <p className="text-xs text-[var(--text-secondary)]">
                            <span className="font-medium">Expected: </span>
                            {step.expectedResult}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : isEditingScenario ? (
                <div className="space-y-2">
                  <textarea
                    value={scenarioValue}
                    onChange={(e) => setScenarioValue(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-white border border-[var(--border-main)] rounded-[8px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] resize-none font-mono"
                    placeholder="Add scenario steps..."
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveScenario}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--Button-primary-black)] text-white rounded-[6px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancelScenario}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--border-main)] rounded-[6px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : scenarioText ? (
                <div 
                  className="p-3 bg-[var(--fill-tsp-white-light)] rounded-[8px] border border-[var(--border-light)] cursor-pointer hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
                  onClick={() => {
                    setIsEditingScenario(true);
                    setScenarioValue(scenarioText);
                  }}
                >
                  <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-sans">
                    {scenarioText}
                  </pre>
                </div>
              ) : (
                <div
                  className="text-sm text-[var(--text-disable)] italic cursor-pointer hover:bg-[var(--fill-tsp-white-light)] p-2 rounded-[6px] transition-colors"
                  onClick={() => {
                    setIsEditingScenario(true);
                    setScenarioValue("");
                  }}
                >
                  No scenario defined
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Description
                </h3>
                {!isEditingDescription && (
                  <button
                    onClick={() => {
                      setIsEditingDescription(true);
                      setDescriptionValue(testCase.description || "");
                    }}
                    className="p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
                    title="Edit description"
                  >
                    <Edit2 size={14} className="text-[var(--icon-secondary)]" />
                  </button>
                )}
              </div>
              
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-[var(--border-main)] rounded-[8px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] resize-none"
                    placeholder="Add a description..."
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDescription}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--Button-primary-black)] text-white rounded-[6px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancelDescription}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--border-main)] rounded-[6px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-sm text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--fill-tsp-white-light)] p-2 rounded-[6px] transition-colors"
                  onClick={() => {
                    setIsEditingDescription(true);
                    setDescriptionValue(testCase.description || "");
                  }}
                >
                  {testCase.description || (
                    <span className="text-[var(--text-disable)] italic">
                      No description so far
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Comments
              </h3>
              <div className="border border-[var(--border-main)] rounded-[8px] p-4">
                <textarea
                  placeholder="Leave a comment"
                  rows={3}
                  className="w-full bg-transparent border-0 outline-none resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)]"
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-light)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <button className="hover:text-[var(--text-secondary)]">
                      Attach files or drag & drop them
                    </button>
                  </div>
                  <button className="px-4 py-1.5 bg-[var(--Button-primary-black)] text-white rounded-[6px] text-sm font-medium hover:opacity-90 transition-opacity">
                    Leave a comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Automated Steps Tab */}
        {activeTab === "automated-steps" && (
          provenSteps && provenSteps.length > 0 ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Steps
                  </h3>
                  {provenStepsCount !== undefined && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {provenStepsCount} steps
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {provenSteps.map((step) => (
                    <div
                      key={step.step_number}
                      className="flex gap-3 p-4 bg-white border border-[var(--border-main)] rounded-[8px] hover:border-[var(--border-input-active)] transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fill-tsp-gray-main)] flex items-center justify-center">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {step.step_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] font-medium mb-2">
                          {formatActionName(step.arguments.action)}
                        </p>
                        <div className="space-y-1">
                          {renderStepArguments(step)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-6 bg-white">
              <div className="max-w-md text-center">
                <div className="p-4 bg-[var(--fill-tsp-white-light)] rounded-[12px] border border-[var(--border-light)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    No automated steps recorded
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Run this test case with the AI agent to automatically generate proven steps based on successful executions.
                  </p>
                  <button
                    onClick={() => setActiveTab("ai-exploration")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Go to A.I. Exploration
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* A.I. Exploration Tab */}
        {activeTab === "ai-exploration" && (
          <div className="flex-1 flex flex-col h-full bg-[var(--background-gray-main)]">
            {latestSession ? (
              /* Agent Execution View - Show when agent_session exists */
              <div className="flex-1 flex flex-col h-full relative bg-[var(--background-gray-main)]">
                {/* Task Header - Outside scrollable area */}
                <div className="px-6 pt-6 pb-6 bg-white">
                  <SystemEventsHeader
                    message={currentSession?.messages.find((m) => m.role === "assistant") || null}
                    sessionId={latestSession.session_id}
                    isSessionActive={latestSession.status !== "completed" && latestSession.status !== "error"}
                    onScrollToMessage={() => {}}
                    onRun={handleRunWithAgent}
                  />
                </div>

                {/* Agent Steps Panel - Scrollable with padding */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 bg-[var(--background-gray-main)]">
                  {/* Messages */}
                  {currentSession && (
                    <div className="flex flex-col gap-3 pt-6">
                      {currentSession.messages.map((message) => (
                        <MessageItem key={message.id} message={message} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Floating VNC Viewer */}
                <FloatingVNC
                  vncUrl={vncUrl}
                  isVNCActive={isVNCActive}
                  totalCost={totalCost}
                  totalTokens={totalTokens}
                />
              </div>
            ) : (
              /* No Session - Show Run Button */
              <div className="flex items-center justify-center h-full p-6 bg-white">
                <div className="max-w-md text-center">
                  <div className="p-4 bg-[var(--fill-tsp-white-light)] rounded-[12px] border border-[var(--border-light)]">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      AI Agent Test Execution
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Run this test case using the AI agent to automatically execute the scenario in a real browser.
                    </p>
                    <button
                      onClick={handleRunWithAgent}
                      disabled={isStartingAgent}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStartingAgent ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Starting Agent...</span>
                        </>
                      ) : (
                        <span>Run with AI Agent</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

