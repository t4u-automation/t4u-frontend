"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgentStep } from "@/types";
import { Check, Loader2, X, RotateCw, ChevronDown, ChevronUp } from "lucide-react";

interface SystemEventsListenerProps {
  sessionId: string;
  tenantId?: string;
  isSessionActive?: boolean;
  onRun?: () => Promise<void>;
  onCancel?: (sessionId: string) => Promise<void>;
  renderSetupSections?: (isExpanded: boolean) => React.ReactNode;
}

interface SystemEvent {
  type: "sandbox_initializing" | "sandbox_ready";
  status: "running" | "completed" | "error";
  sandboxId?: string;
}

interface TerminateEvent {
  status: "success" | "failure" | "cancelled";
  output: string;
}

export default function SystemEventsListener({
  sessionId,
  tenantId,
  isSessionActive = false,
  onRun,
  onCancel,
  renderSetupSections,
}: SystemEventsListenerProps) {
  const [systemEvent, setSystemEvent] = useState<SystemEvent | null>(null);
  const [terminateEvent, setTerminateEvent] = useState<TerminateEvent | null>(null);
  const [planTitle, setPlanTitle] = useState<string | null>(null);
  const [planProgress, setPlanProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSetupExpanded, setIsSetupExpanded] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    console.log("[SystemEventsListener] Setting up listener for sessionId:", sessionId);
    
    // Reset state when session changes
    setSystemEvent(null);
    setTerminateEvent(null);
    setPlanTitle(null);
    setPlanProgress(null);
    setIsInitialLoad(true);

    const stepsRef = collection(db, "agent_steps");
    const q = tenantId
      ? query(
          stepsRef,
          where("session_id", "==", sessionId),
          where("tenant_id", "==", tenantId)
        )
      : query(stepsRef, where("session_id", "==", sessionId));

    const processStep = (step: AgentStep) => {
      // Handle system events
      if (step.event_type === "sandbox_initializing") {
        setSystemEvent({
          type: "sandbox_initializing",
          status: step.status === "success" ? "completed" : "running",
          sandboxId: step.sandbox_id,
        });
      }

      if (step.event_type === "sandbox_ready") {
        setSystemEvent({
          type: "sandbox_ready",
          status: "completed",
          sandboxId: step.sandbox_id,
        });
      }

      // Handle session cancellation
      if (step.event_type === "session_cancelled") {
        setTerminateEvent({
          status: "cancelled",
          output: step.thinking || "Session cancelled by user",
        });
      }

      // Handle terminate tool
      if (step.tool_calls && step.tool_calls.length > 0) {
        step.tool_calls.forEach((toolCall, index) => {
          if (toolCall.tool_name === "terminate") {
            const terminateStatus = toolCall.arguments?.status || "success";
            const toolResult = step.tool_results?.[index];
            const terminateOutput = toolResult?.output || `Session terminated with status: ${terminateStatus}`;
            
            setTerminateEvent({
              status: terminateStatus,
              output: terminateOutput,
            });
          }

          // Track plan title and progress for header display
          if (toolCall.tool_name === "planning") {
            if (toolCall.arguments?.command === "create") {
              setPlanTitle(toolCall.arguments?.title || "Plan");
              const steps = toolCall.arguments?.steps || [];
              setPlanProgress({ completed: 0, total: steps.length });
            } else if (toolCall.arguments?.command === "mark_step") {
              // Update progress based on step status
              const toolResult = step.tool_results?.[index];
              if (toolResult?.output?.includes("Steps:")) {
                const completedCount = (toolResult.output.match(/\[✓\]/g) || []).length;
                setPlanProgress((prev) => prev ? { ...prev, completed: completedCount } : null);
              }
            }
          }
        });
      }
    };

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // On first load, process all documents
        if (isInitialLoad) {
          console.log("[SystemEventsListener] Initial load with", snapshot.size, "docs");
          snapshot.docs.forEach((doc) => {
            const step = doc.data() as AgentStep;
            processStep(step);
          });
          setIsInitialLoad(false);
        } else {
          // On subsequent updates, only process changes
          console.log("[SystemEventsListener] Processing", snapshot.docChanges().length, "changes");
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
              const step = change.doc.data() as AgentStep;
              processStep(step);
            }
          });
        }
      },
      (error) => {
        console.error("[SystemEventsListener] Listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId, tenantId]);

  const handleRun = async () => {
    if (!onRun) return;
    try {
      setIsRunning(true);
      await onRun();
    } catch (error) {
      console.error("[SystemEventsListener] Error running:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || !sessionId) return;
    try {
      setIsCancelling(true);
      await onCancel(sessionId);
    } catch (error) {
      console.error("[SystemEventsListener] Error cancelling:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  // Show skeleton if session is active but no plan yet
  const showSkeleton = isSessionActive && !planTitle;

  // Don't show anything if no session and no plan
  if (!isSessionActive && !planTitle) return null;

  // Show skeleton loading
  if (showSkeleton) {
    return (
      <div id="SystemEventsHeader" className="bg-white border-b border-[var(--border-light)]">
        <div className="px-6 pt-6">
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--fill-white)] shadow-sm">
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 flex-shrink-0">
              <Loader2 size={12} className="text-white animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
            </div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />

            {/* Collapse/Expand Button for Setup Sections */}
            <button
              onClick={() => setIsSetupExpanded(!isSetupExpanded)}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-black/5 transition-colors"
              title={isSetupExpanded ? "Hide setup details" : "Show setup details"}
            >
              {isSetupExpanded ? (
                <ChevronUp size={16} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown size={16} className="text-[var(--text-secondary)]" />
              )}
            </button>

            {/* Cancel Button */}
            {onCancel && sessionId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                disabled={isCancelling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex-shrink-0 text-sm font-medium"
                title="Cancel execution"
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <X size={14} />
                    <span>Cancel</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Render Setup Sections (Sandbox and Run Before) - Also in skeleton state */}
        <div className="pb-4">
          {renderSetupSections && renderSetupSections(isSetupExpanded)}
        </div>
      </div>
    );
  }

  if (!planTitle) return null;

  const isTerminated = !!terminateEvent;
  const isCancelled = terminateEvent?.status === "cancelled";
  const isCompleted = terminateEvent?.status === "success";
  const isBlocked = terminateEvent?.status === "failure";
  const sandboxReady = systemEvent?.type === "sandbox_ready" && systemEvent.status === "completed";
  const allStepsCompleted = planProgress?.completed === planProgress?.total;

  const finalIsCompleted = isTerminated ? isCompleted : sandboxReady && allStepsCompleted;
  const finalIsBlocked = isTerminated ? isBlocked : false;
  const isInProgress = !isTerminated && !allStepsCompleted;

  return (
    <div id="SystemEventsHeader" className="bg-white border-b border-[var(--border-light)]">
      <div className="px-6 pt-6">
        <div
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all ${
            isTerminated
              ? terminateEvent.status === "success"
                ? "bg-green-50 border-green-200"
                : isCancelled
                ? "bg-yellow-50 border-yellow-200"
                : "bg-red-50 border-red-200"
              : "bg-[var(--fill-white)] border-[var(--border-light)]"
          }`}
        >
        <div
          className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
            finalIsCompleted
              ? "bg-green-500"
              : isCancelled
              ? "bg-yellow-500"
              : finalIsBlocked
              ? "bg-red-500"
              : isInProgress
              ? "bg-blue-500"
              : "bg-white border border-gray-300"
          }`}
        >
          {finalIsCompleted ? (
            <Check size={12} className="text-white" />
          ) : isCancelled ? (
            <X size={12} className="text-white" />
          ) : finalIsBlocked ? (
            <X size={12} className="text-white" />
          ) : isInProgress ? (
            <Loader2 size={12} className="text-white animate-spin" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          )}
        </div>
        <span
          className={`text-sm font-medium flex-1 min-w-0 truncate ${
            isTerminated
              ? terminateEvent.status === "success"
                ? "text-green-700"
                : isCancelled
                ? "text-yellow-700"
                : "text-red-700"
              : "text-[var(--text-primary)]"
          }`}
        >
          {planTitle}
        </span>
        {isTerminated && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              terminateEvent.status === "success"
                ? "bg-green-200 text-green-700"
                : isCancelled
                ? "bg-yellow-200 text-yellow-700"
                : "bg-red-200 text-red-700"
            }`}
          >
            {terminateEvent.status === "success" ? "Completed" : isCancelled ? "Cancelled" : "Failed"}
          </span>
        )}
        {planProgress && (
          <span
            className={`text-xs flex-shrink-0 ${
              isTerminated
                ? terminateEvent.status === "success"
                  ? "text-green-600"
                  : isCancelled
                  ? "text-yellow-600"
                  : "text-red-600"
                : "text-[var(--text-tertiary)]"
            }`}
          >
            {planProgress.completed}/{planProgress.total} steps
          </span>
        )}

        {/* Collapse/Expand Button for Setup Sections */}
        <button
          onClick={() => setIsSetupExpanded(!isSetupExpanded)}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-black/5 transition-colors"
          title={isSetupExpanded ? "Hide setup details" : "Show setup details"}
        >
          {isSetupExpanded ? (
            <ChevronUp size={16} className="text-[var(--text-secondary)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--text-secondary)]" />
          )}
        </button>

        {/* Cancel Button - Show when session is active */}
        {!isTerminated && isSessionActive && onCancel && sessionId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            disabled={isCancelling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex-shrink-0 text-sm font-medium"
            title="Cancel execution"
          >
            {isCancelling ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <X size={14} />
                <span>Cancel</span>
              </>
            )}
          </button>
        )}

        {/* Run/Replay Button - Show when session is terminated */}
        {isTerminated && onRun && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRun();
            }}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[var(--Button-primary-black)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0 text-sm font-medium"
            title="Run again"
          >
            {isRunning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <RotateCw size={14} />
                <span>Run</span>
              </>
            )}
          </button>
        )}
        </div>
      </div>

      {/* Render Setup Sections (Sandbox and Run Before) */}
      <div className="pb-4">
        {renderSetupSections && renderSetupSections(isSetupExpanded)}
      </div>
    </div>
  );
}

