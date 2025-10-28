"use client";

import { db } from "@/lib/firebase";
import {
  AgentSession,
  AgentStep,
  Artifact,
  ChatSession,
  InterventionData,
  Message,
  PlanData,
  PlanStep,
  TerminateData,
  ToolCall,
  ToolCallDetail,
} from "@/types";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useState } from "react";

export function useSession() {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );
  const [vncUrl, setVncUrl] = useState<string | null>(null);
  const [isVNCActive, setIsVNCActive] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [totalCost, setTotalCost] = useState<number | undefined>(undefined);
  const [totalTokens, setTotalTokens] = useState<number | undefined>(undefined);
  const [cleanupFunctions, setCleanupFunctions] = useState<(() => void)[]>([]);

  const loadSession = async (sessionId: string, tenantId?: string) => {
    try {
      // Clean up existing listeners if switching sessions
      cleanupFunctions.forEach((cleanup) => cleanup());
      setCleanupFunctions([]);

      const sessionRef = doc(db, "agent_sessions", sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        console.error("[useSession] Session not found");
        return;
      }

      const sessionData = sessionDoc.data() as AgentSession;

      const chatSession: ChatSession = {
        id: sessionData.session_id,
        userId: sessionData.user_id,
        title:
          sessionData.prompt.substring(0, 50) +
          (sessionData.prompt.length > 50 ? "..." : ""),
        messages: [
          {
            id: "msg_user",
            role: "user",
            content: sessionData.prompt,
            timestamp: new Date(sessionData.created_at),
            status: "completed",
          },
        ],
        createdAt: new Date(sessionData.created_at),
        updatedAt: new Date(sessionData.updated_at),
        status: sessionData.status,
      };

      setCurrentSession(chatSession);

      // Set initial VNC URL and session data immediately
      setVncUrl(sessionData.vnc_url || null);
      setIsVNCActive(!!sessionData.vnc_url);
      setArtifacts(sessionData.artifacts || []);
      setTotalCost(sessionData.total_cost);
      setTotalTokens(sessionData.total_tokens);

      // Monitor VNC URL, artifacts, and cost/tokens
      const vncUnsubscribe = onSnapshot(sessionRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data() as AgentSession;
          // Only update if this is still the selected session
          setCurrentSession((prevSession) => {
            if (!prevSession || prevSession.id !== data.session_id) {
              return prevSession; // Don't update if not the current session
            }

            // Update session-specific state only if it's the current session
            setVncUrl(data.vnc_url || null);
            setIsVNCActive(!!data.vnc_url);
            setArtifacts(data.artifacts || []);
            setTotalCost(data.total_cost);
            setTotalTokens(data.total_tokens);

            return prevSession;
          });
        }
      });

      // Monitor steps
      const stepsRef = collection(db, "agent_steps");
      const stepsQuery = tenantId
        ? query(
            stepsRef,
            where("session_id", "==", sessionId),
            where("tenant_id", "==", tenantId),
            orderBy("step_number", "asc")
          )
        : query(
            stepsRef,
            where("session_id", "==", sessionId),
            orderBy("step_number", "asc")
          );

      const stepsUnsubscribe = onSnapshot(
        stepsQuery,
        (snapshot) => {
          const steps = snapshot.docs
            .map((doc) => doc.data() as AgentStep)
            .sort((a, b) => a.step_number - b.step_number);

          const { systemEvents, toolCalls } = convertStepsToToolCalls(steps);
          const allToolCalls = [...systemEvents, ...toolCalls];

          const aiMessage: Message = {
            id: "msg_ai",
            role: "assistant",
            content: sessionData.last_output || "Processing...",
            timestamp: new Date(sessionData.updated_at),
            thinking: getOverallThinking(steps),
            toolCalls: allToolCalls,
            status: sessionData.status === "completed" ? "completed" : "pending",
          };

        setCurrentSession((prev) => {
          // Only update if this is still the selected session
          if (!prev || prev.id !== sessionId) return prev;
          const messages = [prev.messages[0], aiMessage];
          return { ...prev, messages };
        });
        },
        (error) => {
          console.error("[useSession] ❌ AGENT_STEPS PERMISSION ERROR - sessionId:", sessionId);
          console.error("[useSession] Error code:", error.code);
          console.error("[useSession] Error message:", error.message);
        }
      );

      // Store cleanup functions
      const newCleanupFunctions = [vncUnsubscribe, stepsUnsubscribe];
      setCleanupFunctions(newCleanupFunctions);

      return () => {
        newCleanupFunctions.forEach((cleanup) => cleanup());
      };
    } catch (error) {
      console.error("[useSession] Error:", error);
    }
  };

  const clearSession = () => {
    // Clean up any existing listeners
    cleanupFunctions.forEach((cleanup) => cleanup());
    setCleanupFunctions([]);

    setCurrentSession(null);
    setVncUrl("");
    setIsVNCActive(false);
    setArtifacts([]);
    setTotalCost(undefined);
    setTotalTokens(undefined);
  };

  return {
    currentSession,
    vncUrl,
    isVNCActive,
    artifacts,
    totalCost,
    totalTokens,
    loadSession,
    clearSession,
  };
}

function convertStepsToToolCalls(steps: AgentStep[]): {
  systemEvents: ToolCall[];
  toolCalls: ToolCall[];
} {
  const toolCalls: ToolCall[] = [];
  const systemEvents: ToolCall[] = [];
  const planDataMap = new Map<string, PlanData>(); // Track plan data by plan_id
  const planToolCallIndices = new Map<string, number>(); // Track which toolCall index has the plan
  const systemEventIndices = new Map<string, number>(); // Track system event indices for updates

  for (const step of steps) {
    // Check for intervention status first
    if (step.status === "intervention") {
      // Extract the message and remove the [HUMAN INTERVENTION] prefix if present
      let message = step.thinking || "The agent is waiting for your input to proceed.";
      message = message.replace(/^\[HUMAN INTERVENTION\]\s*/i, "");
      
      toolCalls.push({
        toolName: "intervention",
        action: "Human Intervention Required",
        details: message,
        status: "pending",
        agentName: step.agent_name,
        interventionData: {
          message: message,
          timestamp: step.timestamp,
        },
      });
      continue;
    }

    if (step.event_type === "sandbox_initializing") {
      const existingIndex = systemEventIndices.get("provisioning_sandbox");
      if (existingIndex !== undefined) {
        // Update existing event status
        systemEvents[existingIndex].status =
          step.status === "success" ? "completed" : "running";
      } else {
        // Add new event
        const eventIndex = systemEvents.length;
        systemEventIndices.set("provisioning_sandbox", eventIndex);
        systemEvents.push({
          toolName: "System",
          action: "Provisioning sandbox",
          details: step.sandbox_id || "",
          status: step.status === "success" ? "completed" : "running",
          agentName: step.agent_name,
        });
      }
      continue;
    }

    if (step.event_type === "sandbox_ready") {
      const existingIndex = systemEventIndices.get("provisioning_sandbox");

      if (existingIndex !== undefined) {
        // Update existing event status
        systemEvents[existingIndex].status = "completed";
        systemEvents[existingIndex].details = step.sandbox_id || "";
      } else {
        // Add new event
        const eventIndex = systemEvents.length;
        systemEventIndices.set("sandbox_ready", eventIndex);
        systemEvents.push({
          toolName: "System",
          action: "Sandbox ready",
          details: step.sandbox_id || "",
          status: "completed",
          agentName: step.agent_name,
        });
      }
      continue;
    }

    if (step.tool_calls && step.tool_calls.length > 0) {
      // Process each tool call in the array
      for (let i = 0; i < step.tool_calls.length; i++) {
        const toolCall = step.tool_calls[i];
        const toolResult = step.tool_results?.[i];

        // Handle terminate tool specially
        if (toolCall.tool_name === "terminate") {
          const terminateStatus = toolCall.arguments?.status || "success";
          const terminateOutput = toolResult?.output || `Session terminated with status: ${terminateStatus}`;
          
          toolCalls.push({
            toolName: "terminate",
            action: "Session Terminated",
            details: terminateStatus,
            status: "completed",
            agentName: step.agent_name,
            terminateData: {
              status: terminateStatus,
              output: terminateOutput,
            },
          });
        } else if (toolCall.tool_name === "planning") {
          // Handle planning tool specially
          const planData = parsePlanningToolCall(
            toolCall,
            toolResult,
            planDataMap
          );

          if (planData) {
            // Update the plan data map
            planDataMap.set(planData.planId, planData);

            if (toolCall.arguments?.command === "create") {
              // Check if we already have a planning tool with the same title (more robust than plan_id)
              const existingPlanByTitle = toolCalls.find(
                (tc) =>
                  tc.toolName === "planning" &&
                  tc.planData?.title === planData.title
              );

              if (!existingPlanByTitle) {
                const planToolCallIndex = toolCalls.length;
                planToolCallIndices.set(planData.planId, planToolCallIndex);

                toolCalls.push({
                  toolName: "planning",
                  action: "Planning",
                  details: toolCall.arguments?.title || "Creating plan",
                  status: step.status === "success" ? "completed" : "running",
                  agentName: step.agent_name,
                  planData,
                });
              } else {
                // Update existing plan with latest data
                existingPlanByTitle.planData = planData;
                existingPlanByTitle.status =
                  step.status === "success" ? "completed" : "running";
                // Also update the plan ID mapping
                const existingIndex = toolCalls.indexOf(existingPlanByTitle);
                planToolCallIndices.set(planData.planId, existingIndex);
              }
            } else if (toolCall.arguments?.command === "mark_step") {
              // Update existing planning tool call with new plan data
              const existingIndex = planToolCallIndices.get(planData.planId);
              if (existingIndex !== undefined && toolCalls[existingIndex]) {
                toolCalls[existingIndex].planData = planData;
                toolCalls[existingIndex].status =
                  step.status === "success" ? "completed" : "running";
              }
            }
          }
        } else {
          // Regular tool call - check for duplicates
          const actionName = getActionName(toolCall.arguments?.action);
          const actionDetails = getActionDetails(toolCall);

          // Check if we already have a similar tool call
          const existingToolCall = toolCalls.find(
            (tc) =>
              tc.toolName === toolCall.tool_name &&
              tc.action === actionName &&
              tc.details === actionDetails
          );

          if (!existingToolCall) {
            toolCalls.push({
              toolName: toolCall.tool_name,
              action: actionName,
              details: actionDetails,
              status: step.status === "success" ? "completed" : "running",
              agentName: step.agent_name,
            });
          } else {
            // Update status of existing tool call if this step is more recent
            existingToolCall.status =
              step.status === "success" ? "completed" : "running";
          }
        }
      } // end of for loop
    }

    if (step.thinking) {
      // Only add thinking if it's different from the last thinking step
      const lastThinkingCall = toolCalls.findLast(
        (tc) => tc.action === "Thinking"
      );
      if (!lastThinkingCall || lastThinkingCall.details !== step.thinking) {
        toolCalls.push({
          toolName: "Agent",
          action: "Thinking",
          details: step.thinking,
          status: step.status === "success" ? "completed" : "running",
          agentName: step.agent_name,
        });
      }
    }
  }

  return { systemEvents, toolCalls };
}

function getActionName(action: string | undefined): string {
  if (!action) return "Processing";
  const actionMap: Record<string, string> = {
    navigate_to: "Browsing",
    click_element: "Clicking element",
    input_text: "Typing",
    wait: "Waiting",
    screenshot: "Screenshot",
    get_page_content: "Reading page",
  };
  return actionMap[action] || action;
}

function getActionDetails(toolCall: ToolCallDetail): string {
  if (!toolCall?.arguments) return "";
  const args = toolCall.arguments;
  if (args.url) return args.url;
  if (args.text) return args.text;
  if (args.index !== undefined) return "element";
  return "";
}

function getOverallThinking(steps: AgentStep[]): string {
  const stepWithThinking = steps.find((s) => s.thinking);
  if (stepWithThinking) return stepWithThinking.thinking!;

  const lastStep = steps[steps.length - 1];
  if (lastStep?.status === "success") return "Task completed successfully";

  return "Working on your task...";
}

function parsePlanningToolCall(
  toolCall: ToolCallDetail,
  toolResult: { output?: string } | undefined,
  planDataMap: Map<string, PlanData>
): PlanData | undefined {
  const args = toolCall.arguments;

  if (!args) return undefined;

  // For "create" command, initialize the plan
  if (args.command === "create") {
    const steps: PlanStep[] = (args.steps || []).map(
      (stepTitle: string, index: number) => ({
        index,
        title: stepTitle,
        status: "not_started" as const,
      })
    );

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

  // For "mark_step" command, update existing plan
  if (args.command === "mark_step") {
    const existingPlan = planDataMap.get(args.plan_id);
    if (!existingPlan) return undefined;

    // Parse the tool result to extract step status information
    const output = toolResult?.output || "";

    // Update the step status
    const updatedSteps = existingPlan.steps.map((step) => {
      if (step.index === args.step_index) {
        let status: "not_started" | "in_progress" | "completed" | "blocked" =
          "not_started";
        if (args.step_status === "completed") status = "completed";
        else if (args.step_status === "in_progress") status = "in_progress";
        else if (args.step_status === "blocked") status = "blocked";
        return { ...step, status };
      }
      return step;
    });

    // Parse output to get step statuses from the formatted output
    if (output.includes("Steps:")) {
      const stepsSection = output.split("Steps:")[1];
      const stepLines = stepsSection
        ?.split("\n")
        .filter((line: string) => line.match(/^\d+\./));

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

    // Calculate progress dynamically based on actual step statuses
    const completedSteps = updatedSteps.filter(
      (step) => step.status === "completed"
    ).length;
    const totalSteps = updatedSteps.length;
    const progressPercentage =
      totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

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
