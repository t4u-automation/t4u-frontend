"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgentStep, PlanData, PlanStep } from "@/types";
import { Check, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import FormattedText from "./FormattedText";

interface PlanningSectionProps {
  sessionId: string;
  tenantId?: string;
}

interface ToolCallPill {
  id: string;
  toolName: string;
  action: string;
  details: string;
  status: "running" | "completed" | "error";
  timestamp: string;
}

interface ThinkingMessage {
  id: string;
  content: string;
  timestamp: string;
}

export default function PlanningSection({ sessionId, tenantId }: PlanningSectionProps) {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCallPill[]>([]);
  const [thinkingMessages, setThinkingMessages] = useState<ThinkingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    console.log("[PlanningSection] Setting up listener for sessionId:", sessionId);
    
    // Reset state when session changes
    setPlanData(null);
    setToolCalls([]);
    setThinkingMessages([]);
    setLoading(true);
    setIsInitialLoad(true);
    setIsCancelled(false);
    setIsTerminated(false);

    const stepsRef = collection(db, "agent_steps");
    const q = tenantId
      ? query(
          stepsRef,
          where("session_id", "==", sessionId),
          where("tenant_id", "==", tenantId)
        )
      : query(stepsRef, where("session_id", "==", sessionId));

    // Track plan data across updates
    const planDataMap = new Map<string, PlanData>();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // On first load, process all documents
        if (isInitialLoad) {
          console.log("[PlanningSection] Initial load with", snapshot.size, "docs");
          
          snapshot.docs.forEach((doc) => {
            const step = { id: doc.id, ...doc.data() } as AgentStep & { id: string };
            
            // Skip before_test_case events - they belong to RunBeforeSection
            if (step.event_type === "before_test_case_start" || step.event_type === "before_test_case_end") {
              return;
            }
            
            // Check for session cancellation
            if (step.event_type === "session_cancelled") {
              setIsCancelled(true);
              return;
            }
            
            // Handle planning tool calls
            if (step.tool_calls && step.tool_calls.length > 0) {
              step.tool_calls.forEach((toolCall, index) => {
                // Check for terminate tool
                if (toolCall.tool_name === "terminate") {
                  setIsTerminated(true);
                  const terminateStatus = toolCall.arguments?.status || "success";
                  if (terminateStatus === "cancelled") {
                    setIsCancelled(true);
                  }
                  return;
                }
                
                if (toolCall.tool_name === "planning") {
                  const parsedPlan = parsePlanningToolCall(
                    toolCall,
                    step.tool_results?.[index],
                    planDataMap
                  );
                  
                  if (parsedPlan) {
                    planDataMap.set(parsedPlan.planId, parsedPlan);
                    setPlanData(parsedPlan);
                    console.log("[PlanningSection] Updated plan:", parsedPlan);
                  }
                } else {
                  // Add or update tool call pill
                  const pillId = `${step.id}-${index}`;
                  const actionName = getActionName(toolCall.arguments?.action);
                  const actionDetails = getActionDetails(toolCall);
                  
                  setToolCalls((prev) => {
                    const existing = prev.find((p) => p.id === pillId);
                    const newPill: ToolCallPill = {
                      id: pillId,
                      toolName: toolCall.tool_name,
                      action: actionName,
                      details: actionDetails,
                      status: step.status === "success" ? "completed" : step.status === "error" ? "error" : "running",
                      timestamp: step.timestamp,
                    };
                    
                    if (existing) {
                      return prev.map((p) => (p.id === pillId ? newPill : p));
                    } else {
                      return [...prev, newPill].sort((a, b) => 
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                      );
                    }
                  });
                }
              });
            }
            
            // Handle thinking messages
            if (step.thinking) {
              const thinkingId = `thinking-${step.id}`;
              setThinkingMessages((prev) => {
                const existing = prev.find((t) => t.id === thinkingId);
                const newThinking: ThinkingMessage = {
                  id: thinkingId,
                  content: step.thinking!,
                  timestamp: step.timestamp,
                };
                
                if (existing) {
                  return prev.map((t) => (t.id === thinkingId ? newThinking : t));
                } else {
                  return [...prev, newThinking].sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );
                }
              });
            }
          });
          
          setLoading(false);
          setIsInitialLoad(false);
        } else {
          // On subsequent updates, only process changes
          console.log("[PlanningSection] Processing", snapshot.docChanges().length, "changes");
          
          snapshot.docChanges().forEach((change) => {
            const step = { id: change.doc.id, ...change.doc.data() } as AgentStep & { id: string };
            
            if (change.type === "added" || change.type === "modified") {
              console.log("[PlanningSection] Processing step:", change.type, step.step_number);
              
              // Skip before_test_case events - they belong to RunBeforeSection
              if (step.event_type === "before_test_case_start" || step.event_type === "before_test_case_end") {
                console.log("[PlanningSection] Skipping before_test_case event");
                return;
              }
              
              // Check for session cancellation
              if (step.event_type === "session_cancelled") {
                setIsCancelled(true);
                return;
              }
              
              // Handle planning tool calls
              if (step.tool_calls && step.tool_calls.length > 0) {
                step.tool_calls.forEach((toolCall, index) => {
                  // Check for terminate tool
                  if (toolCall.tool_name === "terminate") {
                    setIsTerminated(true);
                    const terminateStatus = toolCall.arguments?.status || "success";
                    if (terminateStatus === "cancelled") {
                      setIsCancelled(true);
                    }
                    return;
                  }
                  
                  if (toolCall.tool_name === "planning") {
                    const parsedPlan = parsePlanningToolCall(
                      toolCall,
                      step.tool_results?.[index],
                      planDataMap
                    );
                    
                    if (parsedPlan) {
                      planDataMap.set(parsedPlan.planId, parsedPlan);
                      setPlanData(parsedPlan);
                      console.log("[PlanningSection] Updated plan:", parsedPlan);
                    }
                  } else {
                    // Add or update tool call pill
                    const pillId = `${step.id}-${index}`;
                    const actionName = getActionName(toolCall.arguments?.action);
                    const actionDetails = getActionDetails(toolCall);
                    
                    setToolCalls((prev) => {
                      const existing = prev.find((p) => p.id === pillId);
                      const newPill: ToolCallPill = {
                        id: pillId,
                        toolName: toolCall.tool_name,
                        action: actionName,
                        details: actionDetails,
                        status: step.status === "success" ? "completed" : step.status === "error" ? "error" : "running",
                        timestamp: step.timestamp,
                      };
                      
                      if (existing) {
                        return prev.map((p) => (p.id === pillId ? newPill : p));
                      } else {
                        return [...prev, newPill].sort((a, b) => 
                          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                      }
                    });
                  }
                });
              }
              
              // Handle thinking messages (but skip before_test_case related thinking)
              if (step.thinking) {
                // Skip thinking that's related to before test cases
                const thinkingLower = step.thinking.toLowerCase();
                const isBeforeTestCaseThinking = 
                  thinkingLower.includes("executing before test case") ||
                  thinkingLower.includes("before test case") && thinkingLower.includes("completed") ||
                  step.event_type === "before_test_case_start" ||
                  step.event_type === "before_test_case_end";
                
                if (!isBeforeTestCaseThinking) {
                  const thinkingId = `thinking-${step.id}`;
                  setThinkingMessages((prev) => {
                    const existing = prev.find((t) => t.id === thinkingId);
                    const newThinking: ThinkingMessage = {
                      id: thinkingId,
                      content: step.thinking!,
                      timestamp: step.timestamp,
                    };
                    
                    if (existing) {
                      return prev.map((t) => (t.id === thinkingId ? newThinking : t));
                    } else {
                      return [...prev, newThinking].sort((a, b) => 
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                      );
                    }
                  });
                }
              }
            }
            
            if (change.type === "removed") {
              console.log("[PlanningSection] Removed step:", step.step_number);
              // Remove related tool calls and thinking
              setToolCalls((prev) => prev.filter((p) => !p.id.startsWith(step.id)));
              setThinkingMessages((prev) => prev.filter((t) => t.id !== `thinking-${step.id}`));
            }
          });
        }
      },
      (error) => {
        console.error("[PlanningSection] Listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sessionId, tenantId]);

  if (loading) {
    return (
      <div className="w-full p-4 rounded-lg border border-[var(--border-light)] bg-[var(--fill-white)]">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span className="text-sm text-[var(--text-secondary)]">Loading plan...</span>
        </div>
      </div>
    );
  }

  if (!planData) {
    return null;
  }

  const allStepsCompleted = planData.steps.every((step) => step.status === "completed");
  const hasInProgress = planData.steps.some((step) => step.status === "in_progress");
  const hasBlocked = planData.steps.some((step) => step.status === "blocked");

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Main Planning Card */}
      <div
        className={`rounded-lg border shadow-sm transition-all ${
          isCancelled
            ? "bg-yellow-50 border-yellow-200"
            : allStepsCompleted
            ? "bg-green-50 border-green-200"
            : hasBlocked
            ? "bg-red-50 border-red-200"
            : "bg-[var(--fill-white)] border-[var(--border-light)]"
        }`}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                  isCancelled
                    ? "bg-yellow-500"
                    : allStepsCompleted
                    ? "bg-green-500"
                    : hasBlocked
                    ? "bg-red-500"
                    : hasInProgress
                    ? "bg-blue-500"
                    : "bg-white border border-gray-300"
                }`}
              >
                {isCancelled ? (
                  <X size={14} className="text-white" />
                ) : allStepsCompleted ? (
                  <Check size={14} className="text-white" />
                ) : hasBlocked ? (
                  <X size={14} className="text-white" />
                ) : hasInProgress ? (
                  <Loader2 size={14} className="text-white animate-spin" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                )}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {planData.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-200 text-yellow-700">
                  Cancelled
                </span>
              )}
              {!isCancelled && allStepsCompleted && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-200 text-green-700">
                  Completed
                </span>
              )}
              <span className="text-sm text-[var(--text-tertiary)]">
                {planData.progress.completed}/{planData.progress.total}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                isCancelled 
                  ? "bg-yellow-500" 
                  : allStepsCompleted 
                  ? "bg-green-500" 
                  : hasBlocked 
                  ? "bg-red-500" 
                  : "bg-blue-500"
              }`}
              style={{ width: `${planData.progress.percentage}%` }}
            />
          </div>

          {/* Plan Steps */}
          <div className="flex flex-col gap-1.5">
            {planData.steps.map((step) => {
              // Override status if cancelled
              const displayStatus = isCancelled && step.status === "in_progress" 
                ? "not_started" 
                : step.status;
              
              return (
                <div key={step.index} className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
                      displayStatus === "completed"
                        ? "bg-green-500"
                        : displayStatus === "blocked"
                        ? "bg-red-500"
                        : displayStatus === "in_progress"
                        ? "bg-blue-500"
                        : "bg-gray-300"
                    }`}
                  >
                    {displayStatus === "completed" ? (
                      <Check size={10} className="text-white" />
                    ) : displayStatus === "blocked" ? (
                      <X size={10} className="text-white" />
                    ) : displayStatus === "in_progress" ? (
                      <Loader2 size={8} className="text-white animate-spin" />
                    ) : null}
                  </div>
                  <span
                    className={`text-sm ${
                      displayStatus === "completed"
                        ? "text-[var(--text-tertiary)] line-through"
                        : displayStatus === "in_progress"
                        ? "text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsable Details Section */}
        {(thinkingMessages.length > 0 || toolCalls.length > 0) && (
          <div className="border-t border-[var(--border-light)]">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Agent Details ({thinkingMessages.length + toolCalls.length} items)
              </span>
              {isExpanded ? (
                <ChevronUp size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
                {/* Interleave thinking messages and tool calls by timestamp */}
                {[...thinkingMessages, ...toolCalls]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((item) => {
                    if ("content" in item) {
                      // Thinking message
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg bg-[var(--fill-tsp-gray-main)] border border-[var(--border-light)]"
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase">
                              Thinking:
                            </span>
                            <FormattedText
                              text={item.content}
                              className="text-sm text-[var(--text-primary)]"
                            />
                          </div>
                        </div>
                      );
                    } else {
                      // Tool call pill
                      return (
                        <div
                          key={item.id}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                            item.status === "completed"
                              ? "bg-green-50 border border-green-200"
                              : item.status === "error"
                              ? "bg-red-50 border border-red-200"
                              : "bg-blue-50 border border-blue-200"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 ${
                              item.status === "completed"
                                ? "bg-green-500"
                                : item.status === "error"
                                ? "bg-red-500"
                                : "bg-blue-500"
                            }`}
                          >
                            {item.status === "completed" ? (
                              <Check size={10} className="text-white" />
                            ) : item.status === "error" ? (
                              <X size={10} className="text-white" />
                            ) : (
                              <Loader2 size={8} className="text-white animate-spin" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            {item.action}
                          </span>
                          {item.details && (
                            <span className="text-xs text-[var(--text-tertiary)] truncate">
                              {item.details}
                            </span>
                          )}
                        </div>
                      );
                    }
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function parsePlanningToolCall(
  toolCall: any,
  toolResult: any,
  planDataMap: Map<string, PlanData>
): PlanData | undefined {
  const args = toolCall.arguments;
  if (!args) return undefined;

  if (args.command === "create") {
    const steps: PlanStep[] = (args.steps || []).map((stepTitle: string, index: number) => ({
      index,
      title: stepTitle,
      status: "not_started" as const,
    }));

    return {
      planId: args.plan_id,
      title: args.title,
      steps,
      progress: {
        completed: 0,
        total: steps.length,
        percentage: 0,
      },
    };
  }

  if (args.command === "mark_step") {
    const existingPlan = planDataMap.get(args.plan_id);
    if (!existingPlan) return undefined;

    const updatedSteps = existingPlan.steps.map((step) => {
      if (step.index === args.step_index) {
        let status: "not_started" | "in_progress" | "completed" | "blocked" = "not_started";
        if (args.step_status === "completed") status = "completed";
        else if (args.step_status === "in_progress") status = "in_progress";
        else if (args.step_status === "blocked") status = "blocked";
        return { ...step, status };
      }
      return step;
    });

    // Parse output for additional step status info
    const output = toolResult?.output || "";
    if (output.includes("Steps:")) {
      const stepsSection = output.split("Steps:")[1];
      const stepLines = stepsSection?.split("\n").filter((line: string) => line.match(/^\d+\./));

      stepLines?.forEach((line: string) => {
        const indexMatch = line.match(/^(\d+)\.\s*\[(.*?)\]/);
        if (indexMatch) {
          const idx = parseInt(indexMatch[1]);
          const symbol = indexMatch[2].trim();

          if (idx < updatedSteps.length) {
            if (symbol === "✓" || symbol === "✔") {
              updatedSteps[idx].status = "completed";
            } else if (symbol === "→" || symbol === "->") {
              updatedSteps[idx].status = "in_progress";
            } else if (symbol === "X" || symbol === "x") {
              updatedSteps[idx].status = "blocked";
            }
          }
        }
      });
    }

    const completedSteps = updatedSteps.filter((step) => step.status === "completed").length;
    const totalSteps = updatedSteps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return {
      ...existingPlan,
      steps: updatedSteps,
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percentage: progressPercentage,
      },
    };
  }

  return undefined;
}

function getActionName(action: string | undefined): string {
  if (!action) return "Processing";
  const actionMap: Record<string, string> = {
    navigate_to: "Browsing",
    click_element: "Clicking",
    input_text: "Typing",
    wait: "Waiting",
    screenshot: "Screenshot",
    get_page_content: "Reading",
  };
  return actionMap[action] || action;
}

function getActionDetails(toolCall: any): string {
  if (!toolCall?.arguments) return "";
  const args = toolCall.arguments;
  if (args.url) return args.url;
  if (args.text) return args.text;
  if (args.index !== undefined) return "element";
  return "";
}

