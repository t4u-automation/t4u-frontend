"use client";

import { Message } from "@/types";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  Circle,
  Loader2,
  X,
} from "lucide-react";
import { useState } from "react";
import FormattedText from "./FormattedText";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (message.role === "user") {
    return (
      <div
        id="UserMessage"
        className="flex w-full flex-col items-end justify-end gap-1 group"
      >
        <div className="flex flex-col items-end max-w-[90%]">
          <div className="flex relative flex-col gap-2 items-end">
            <div
              id="UserMessageBubble"
              className="relative flex items-center rounded-[12px] overflow-hidden bg-[var(--fill-white)] p-3 rounded-br-none border border-[var(--border-main)]"
            >
              <div className="transition-all duration-300">
                <span className="text-[var(--text-primary)] whitespace-pre-wrap">
                  {message.content}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="AIMessage" className="flex flex-col gap-2 w-full">
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div id="StepsSection" className="flex flex-col">
          {/* Step Header */}
          <div
            id="StepHeader"
            className="text-sm w-full clickable flex gap-2 justify-between group/header truncate text-[var(--text-primary)] cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex flex-row gap-2 justify-center items-center truncate">
              <div
                id="StepCheckmark"
                className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-[15px] bg-[var(--text-disable)] border-0"
              >
                <Check size={10} className="text-white" />
              </div>
              <div id="StepTitle" className="truncate font-medium">
                T4U is working
              </div>
              <span className="flex-shrink-0 flex">
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </span>
            </div>
          </div>

          {/* Step Content */}
          {isExpanded && (
            <div id="StepContent" className="flex">
              <div className="w-[24px] relative">
                <div
                  className="border-l border-dashed border-[var(--border-dark)] absolute start-[8px] top-0 bottom-0"
                  style={{ height: "calc(100% + 14px)" }}
                />
              </div>
              <div className="flex flex-col gap-3 flex-1 min-w-0 overflow-hidden pt-2">
                {message.toolCalls.map((tool, idx) => {
                  // Show checkmark if there's a next step (not the last one)
                  const showCheckmark =
                    idx < (message.toolCalls?.length ?? 0) - 1;
                  
                  // Check if there's a terminate tool to show completion status
                  const terminateTool = message.toolCalls?.find(
                    (t) => t.toolName === "terminate"
                  );

                  // Check if this is the start of a new agent section
                  const prevTool = idx > 0 ? message.toolCalls![idx - 1] : null;
                  const showAgentHeader = 
                    !prevTool || 
                    prevTool.agentName !== tool.agentName;
                  
                  // Get display name for agent
                  const getAgentDisplayName = (agentName?: string) => {
                    if (!agentName) return null;
                    // Handle both old and new agent names
                    if (agentName === "SandBox" || agentName === "E2BTestOpsAI" || agentName === "E2BT4U") return "Main Agent";
                    if (agentName.includes("SubAgent")) return "Sub Agent";
                    return agentName;
                  };

                  const agentDisplayName = getAgentDisplayName(tool.agentName);

                  return (
                    <div key={idx} className="flex flex-col gap-3 w-full">
                      {/* Agent Section Header */}
                      {showAgentHeader && agentDisplayName && (
                        <div
                          id="AgentSectionHeader"
                          className="flex items-center gap-2 py-1 px-2 -ml-2 rounded-md bg-[var(--fill-tsp-white-light)] border-l-2 border-[var(--border-dark)]"
                        >
                          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            {agentDisplayName}
                          </span>
                        </div>
                      )}

                      {/* Tool Content */}
                      {tool.toolName === "intervention" && tool.interventionData ? (
                        // Render intervention step with blue styling
                        <div
                          id="InterventionSection"
                          className="flex flex-col gap-2 w-full"
                        >
                          <div className="p-3 rounded-[12px] border border-blue-300 bg-blue-50">
                            <div className="flex items-center gap-2">
                              <AlertCircle size={16} className="text-blue-500 flex-shrink-0" />
                              <FormattedText
                                text={tool.interventionData.message}
                                className="text-blue-700 text-[14px] leading-[1.6]"
                              />
                            </div>
                          </div>
                        </div>
                      ) : tool.toolName === "terminate" && tool.terminateData ? (
                        (() => {
                          // Render terminate tool specially - skip if there's a plan
                          const hasPlan = message.toolCalls?.some((t) => t.toolName === "planning");
                          
                          // If there's a plan, the terminate info will be shown in the plan card
                          if (hasPlan) {
                            return null;
                          }
                          
                          // Otherwise show standalone terminate section
                          return (
                            <div
                              id="TerminateSection"
                              className="flex flex-col gap-2 w-full"
                            >
                              <div
                                className={`p-4 rounded-[12px] border shadow-sm ${
                                  tool.terminateData.status === "success"
                                    ? "border-green-200 bg-green-50"
                                    : "border-red-200 bg-red-50"
                                }`}
                              >
                                {/* Terminate Header */}
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className={`w-5 h-5 flex items-center justify-center rounded-full ${
                                      tool.terminateData.status === "success"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                                  >
                                    {tool.terminateData.status === "success" ? (
                                      <Check size={12} className="text-white" />
                                    ) : (
                                      <X size={12} className="text-white" />
                                    )}
                                  </div>
                                  <h3
                                    className={`font-semibold ${
                                      tool.terminateData.status === "success"
                                        ? "text-green-700"
                                        : "text-red-700"
                                    }`}
                                  >
                                    Session {tool.terminateData.status === "success" ? "Completed" : "Failed"}
                                  </h3>
                                </div>

                                {/* Terminate Message */}
                                <p
                                  className={`text-sm ${
                                    tool.terminateData.status === "success"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {tool.terminateData.output}
                                </p>
                              </div>
                            </div>
                          );
                        })()
                      ) : tool.toolName === "planning" && tool.planData ? (
                        // Render planning tool specially
                        <div
                          id="PlanningSection"
                          className="flex flex-col gap-2 w-full"
                        >
                          <div className={`p-4 rounded-[12px] border shadow-sm ${
                        terminateTool?.terminateData
                          ? terminateTool.terminateData.status === "success"
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                          : "border-[var(--border-light)] bg-[var(--fill-white)]"
                      }`}>
                        {/* Plan Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={`w-5 h-5 flex items-center justify-center rounded-full ${(() => {
                              // Check terminate status first
                              if (terminateTool?.terminateData) {
                                return terminateTool.terminateData.status === "success"
                                  ? "bg-green-500"
                                  : "bg-red-500";
                              }
                              
                              const steps = tool.planData.steps;
                              const allCompleted = steps.every(
                                (step) => step.status === "completed"
                              );
                              const hasInProgress = steps.some(
                                (step) => step.status === "in_progress"
                              );
                              const hasCompleted = steps.some(
                                (step) => step.status === "completed"
                              );
                              const hasBlocked = steps.some(
                                (step) => step.status === "blocked"
                              );

                              if (hasBlocked) return "bg-red-500";
                              if (allCompleted && !hasBlocked)
                                return "bg-green-500";
                              if (
                                hasInProgress ||
                                (hasCompleted && !allCompleted && !hasBlocked)
                              )
                                return "bg-blue-500";
                              return "bg-white border border-gray-300";
                            })()}`}
                          >
                            {(() => {
                              // Check terminate status first
                              if (terminateTool?.terminateData) {
                                return terminateTool.terminateData.status === "success" ? (
                                  <Check size={12} className="text-white" />
                                ) : (
                                  <X size={12} className="text-white" />
                                );
                              }
                              
                              const steps = tool.planData.steps;
                              const allCompleted = steps.every(
                                (step) => step.status === "completed"
                              );
                              const hasInProgress = steps.some(
                                (step) => step.status === "in_progress"
                              );
                              const hasCompleted = steps.some(
                                (step) => step.status === "completed"
                              );
                              const hasBlocked = steps.some(
                                (step) => step.status === "blocked"
                              );

                              if (hasBlocked) {
                                return <X size={12} className="text-white" />;
                              } else if (allCompleted && !hasBlocked) {
                                return (
                                  <Check size={12} className="text-white" />
                                );
                              } else if (
                                hasInProgress ||
                                (hasCompleted && !allCompleted && !hasBlocked)
                              ) {
                                return (
                                  <Loader2
                                    size={12}
                                    className="text-white animate-spin"
                                  />
                                );
                              } else {
                                return (
                                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                                );
                              }
                            })()}
                          </div>
                          <h3 className={`font-semibold flex-1 ${
                            terminateTool?.terminateData
                              ? terminateTool.terminateData.status === "success"
                                ? "text-green-700"
                                : "text-red-700"
                              : "text-[var(--text-primary)]"
                          }`}>
                            {tool.planData.title}
                          </h3>
                          {terminateTool?.terminateData && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              terminateTool.terminateData.status === "success"
                                ? "bg-green-200 text-green-700"
                                : "bg-red-200 text-red-700"
                            }`}>
                              {terminateTool.terminateData.status === "success" ? "Completed" : "Failed"}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs ${
                              terminateTool?.terminateData
                                ? terminateTool.terminateData.status === "success"
                                  ? "text-green-600"
                                  : "text-red-600"
                                : "text-[var(--text-secondary)]"
                            }`}>
                              Progress: {tool.planData.progress.completed} /{" "}
                              {tool.planData.progress.total} steps
                            </span>
                            <span className={`text-xs font-medium ${
                              terminateTool?.terminateData
                                ? terminateTool.terminateData.status === "success"
                                  ? "text-green-700"
                                  : "text-red-700"
                                : "text-[var(--text-primary)]"
                            }`}>
                              {tool.planData.progress.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                terminateTool?.terminateData
                                  ? terminateTool.terminateData.status === "success"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                  : "bg-blue-500"
                              }`}
                              style={{
                                width: `${tool.planData.progress.percentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Plan Steps */}
                        <div className="space-y-2">
                          {tool.planData.steps.map((step) => (
                            <div
                              key={step.index}
                              className="flex items-start gap-2 text-sm"
                            >
                              {/* Step Status Icon */}
                              {step.status === "completed" ? (
                                <CheckCircle
                                  size={16}
                                  className="text-green-500 mt-0.5 flex-shrink-0"
                                />
                              ) : step.status === "in_progress" ? (
                                <Loader2
                                  size={16}
                                  className="text-blue-500 mt-0.5 flex-shrink-0 animate-spin"
                                />
                              ) : step.status === "blocked" ? (
                                <Circle
                                  size={16}
                                  className="text-red-500 mt-0.5 flex-shrink-0"
                                />
                              ) : (
                                <Circle
                                  size={16}
                                  className="text-gray-300 mt-0.5 flex-shrink-0"
                                />
                              )}

                              {/* Step Text */}
                              <span
                                className={`flex-1 ${
                                  step.status === "completed"
                                    ? "text-[var(--text-tertiary)] line-through"
                                    : step.status === "in_progress"
                                    ? "text-[var(--text-primary)] font-medium"
                                    : "text-[var(--text-secondary)]"
                                }`}
                              >
                                {step.title}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Termination Message (if session terminated) */}
                        {terminateTool?.terminateData && (
                          <div className={`mt-3 pt-3 border-t ${
                            terminateTool.terminateData.status === "success"
                              ? "border-green-200"
                              : "border-red-200"
                          }`}>
                            <p className={`text-sm ${
                              terminateTool.terminateData.status === "success"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}>
                              {terminateTool.terminateData.output}
                            </p>
                          </div>
                        )}
                          </div>
                        </div>
                      ) : tool.action === "Thinking" ? (
                        <div
                          id="ThinkingText"
                          className="flex flex-col gap-2 w-full"
                        >
                          <div className="p-3 rounded-[12px] border border-[var(--border-light)] bg-[var(--fill-tsp-white-light)]">
                            <FormattedText
                              text={tool.details || ""}
                              className="text-[var(--text-secondary)] text-[14px] leading-[1.6]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          id="ToolCallPill"
                          className="flex items-center group gap-2 w-full"
                        >
                      <div className="flex-1 min-w-0">
                        <div className="rounded-[15px] px-[10px] py-[3px] border border-[var(--border-light)] bg-[var(--fill-tsp-gray-main)] inline-flex max-w-full gap-[4px] items-center relative h-[28px] overflow-hidden">
                          <div className="w-[21px] inline-flex items-center flex-shrink-0 text-[var(--text-primary)]">
                            {tool.toolName === "System" ? (
                              // System events (Provisioning sandbox, Sandbox ready) - show status based icons
                              <div
                                className={`w-4 h-4 flex items-center justify-center rounded-full ${
                                  tool.status === "completed"
                                    ? "bg-green-500"
                                    : tool.status === "running"
                                    ? "bg-blue-500"
                                    : "bg-gray-400"
                                }`}
                              >
                                {tool.status === "completed" ? (
                                  <Check size={10} className="text-white" />
                                ) : tool.status === "running" ? (
                                  <Loader2
                                    size={10}
                                    className="text-white animate-spin"
                                  />
                                ) : (
                                  <Check
                                    size={10}
                                    className="text-white opacity-50"
                                  />
                                )}
                              </div>
                            ) : showCheckmark ? (
                              // Checkmark for completed steps
                              <div className="w-4 h-4 flex items-center justify-center rounded-full bg-[var(--text-disable)]">
                                <Check size={10} className="text-white" />
                              </div>
                            ) : (
                              // Circle for current/pending steps
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 18 18"
                                fill="none"
                                style={{ minWidth: "20px", minHeight: "20px" }}
                              >
                                <rect
                                  x="1.5"
                                  y="1.5"
                                  width="15"
                                  height="15"
                                  rx="7.5"
                                  fill="url(#tool-gradient)"
                                />
                                <rect
                                  x="1.92857"
                                  y="1.92857"
                                  width="14.1429"
                                  height="14.1429"
                                  rx="7.07143"
                                  stroke="#B9B9B7"
                                  strokeWidth="0.857143"
                                />
                                <defs>
                                  <linearGradient
                                    id="tool-gradient"
                                    x1="9"
                                    y1="1.5"
                                    x2="9"
                                    y2="16.5"
                                    gradientUnits="userSpaceOnUse"
                                  >
                                    <stop stopColor="white" stopOpacity="0" />
                                    <stop offset="1" stopOpacity="0.16" />
                                  </linearGradient>
                                </defs>
                              </svg>
                            )}
                          </div>
                          <div
                            title={tool.action}
                            className="max-w-[100%] truncate text-[var(--text-secondary)] relative top-[-1px]"
                          >
                            <span className="text-[13px]">{tool.action}</span>
                            {tool.details && (
                              <span className="text-[12px] font-mono ml-[6px] text-[var(--text-tertiary)]">
                                {tool.details}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
