"use client";

import { Message } from "@/types";
import { Check, Loader2, X, RotateCw } from "lucide-react";
import { useState } from "react";

interface SystemEventsHeaderProps {
  message: Message | null;
  sessionId?: string;
  isSessionActive?: boolean;
  onScrollToMessage: () => void;
  onRun?: () => Promise<void>;
  onCancel?: (sessionId: string) => Promise<void>;
}

export default function SystemEventsHeader({
  message,
  sessionId,
  isSessionActive = false,
  onScrollToMessage,
  onRun,
  onCancel,
}: SystemEventsHeaderProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Show if there's an AI message with planning data (main task)
  const planningTool = message?.toolCalls?.find(
    (tool) => tool.toolName === "planning" && tool.planData
  );

  // Show skeleton if session is active but no plan yet
  const showSkeleton = isSessionActive && !planningTool;

  const handleRun = async () => {
    if (!onRun) return;
    try {
      setIsRunning(true);
      await onRun();
    } catch (error) {
      console.error("[SystemEventsHeader] Error running:", error);
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
      console.error("[SystemEventsHeader] Error cancelling:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  // Don't show anything if no session and no plan
  if (!isSessionActive && !planningTool) return null;

  // Show skeleton loading
  if (showSkeleton) {
    return (
      <div id="SystemEventsHeader">
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--fill-white)] shadow-sm">
          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 flex-shrink-0">
            <Loader2 size={12} className="text-white animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
          </div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
          
          {/* Cancel Button - Show in skeleton state when session is active */}
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
    );
  }

  if (!planningTool || !planningTool.planData) return null;

  // Check for termination status
  const terminateTool = message?.toolCalls?.find(
    (tool) => tool.toolName === "terminate"
  );

  // Check system events status
  const systemEvents =
    message?.toolCalls?.filter((tool) => tool.toolName === "System") || [];

  // Check if sandbox is ready (system events completed)
  const sandboxReady = systemEvents.some(
    (event) =>
      (event.action === "Sandbox ready" ||
        event.action === "Provisioning sandbox") &&
      event.status === "completed"
  );
  // Check individual step statuses
  const steps = planningTool.planData.steps;
  const hasInProgressSteps = steps.some(
    (step) => step.status === "in_progress"
  );
  const hasCompletedSteps = steps.some((step) => step.status === "completed");
  const hasBlockedSteps = steps.some((step) => step.status === "blocked");
  const allStepsCompleted = steps.every((step) => step.status === "completed");

  // Determine overall status based on system events and child processes
  // Priority: terminated > blocked > in_progress > not_started > completed
  const isTerminated = !!terminateTool?.terminateData;
  const terminateStatus = terminateTool?.terminateData?.status;
  const isCancelled = terminateStatus === "cancelled";
  const isCompleted = isTerminated
    ? terminateStatus === "success"
    : sandboxReady && allStepsCompleted && !hasBlockedSteps;
  const isBlocked = isTerminated
    ? terminateStatus === "failure"
    : hasBlockedSteps;
  const isInProgress =
    !isTerminated &&
    !allStepsCompleted &&
    !hasBlockedSteps &&
    (hasInProgressSteps || hasCompletedSteps);

  return (
    <div id="SystemEventsHeader">
      <div
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all ${
          isTerminated
            ? terminateStatus === "success"
              ? "bg-green-50 border-green-200"
              : isCancelled
              ? "bg-yellow-50 border-yellow-200"
              : "bg-red-50 border-red-200"
            : "bg-[var(--fill-white)] border-[var(--border-light)]"
        }`}
      >
        <div
          className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
            isCompleted
              ? "bg-green-500"
              : isCancelled
              ? "bg-yellow-500"
              : isBlocked
              ? "bg-red-500"
              : isInProgress
              ? "bg-blue-500"
              : "bg-white border border-gray-300"
          }`}
        >
          {isCompleted ? (
            <Check size={12} className="text-white" />
          ) : isCancelled ? (
            <X size={12} className="text-white" />
          ) : isBlocked ? (
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
              ? terminateStatus === "success"
                ? "text-green-700"
                : isCancelled
                ? "text-yellow-700"
                : "text-red-700"
              : "text-[var(--text-primary)]"
          }`}
        >
          {planningTool.planData.title}
        </span>
        {isTerminated && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              terminateStatus === "success"
                ? "bg-green-200 text-green-700"
                : isCancelled
                ? "bg-yellow-200 text-yellow-700"
                : "bg-red-200 text-red-700"
            }`}
          >
            {terminateStatus === "success" ? "Completed" : isCancelled ? "Cancelled" : "Failed"}
          </span>
        )}
        <span
          className={`text-xs flex-shrink-0 ${
            isTerminated
              ? terminateStatus === "success"
                ? "text-green-600"
                : isCancelled
                ? "text-yellow-600"
                : "text-red-600"
              : "text-[var(--text-tertiary)]"
          }`}
        >
          {planningTool.planData.progress.completed}/
          {planningTool.planData.progress.total} steps
        </span>

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
  );
}
