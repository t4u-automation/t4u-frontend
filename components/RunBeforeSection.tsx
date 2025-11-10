"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgentStep } from "@/types";
import { Check, Loader2, Play, CheckCircle2, XCircle } from "lucide-react";

interface RunBeforeSectionProps {
  sessionId: string;
  tenantId?: string;
}

interface RunBeforeExecution {
  id: string;
  testCaseName: string;
  status: "running" | "completed" | "failed";
  timestamp: string;
  details?: string;
}

export default function RunBeforeSection({ sessionId, tenantId }: RunBeforeSectionProps) {
  const [executions, setExecutions] = useState<RunBeforeExecution[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    console.log("[RunBeforeSection] Setting up listener for sessionId:", sessionId);
    
    // Reset state when session changes
    setExecutions([]);
    setIsComplete(false);
    setIsInitialLoad(true);

    const stepsRef = collection(db, "agent_steps");
    const q = tenantId
      ? query(
          stepsRef,
          where("session_id", "==", sessionId),
          where("tenant_id", "==", tenantId)
        )
      : query(stepsRef, where("session_id", "==", sessionId));

    const processStep = (step: AgentStep & { id: string }, executionMap: Map<string, RunBeforeExecution>) => {
      console.log("[RunBeforeSection] Processing step:", step.step_number, "event_type:", step.event_type, "status:", step.status);
      
      // Check for before_test_case events (the proper way)
      if (step.event_type === "before_test_case_start" || step.event_type === "before_test_case_end") {
        console.log("[RunBeforeSection] Found before test case event:", step.event_type, "thinking:", step.thinking?.substring(0, 100));
        
        // Extract test case name and number from thinking
        const testCaseName = extractTestCaseNameFromThinking(step.thinking) || "Test Case";
        
        // IMPORTANT: Use test case number from thinking as unique identifier
        // (test_case_id might be the same for all prerequisite tests)
        const testCaseNumber = extractTestCaseNumber(step.thinking);
        const executionId = testCaseNumber || `${step.test_case_id}-${step.step_number}` || step.id;
        
        console.log("[RunBeforeSection] Test case identifier:", executionId, "name:", testCaseName);
        
        // Determine status based on event_type and step status
        let status: "running" | "completed" | "failed" = "running";
        
        if (step.event_type === "before_test_case_end") {
          if (step.status === "success") {
            status = "completed";
          } else if (step.status === "error" || step.status === "failed") {
            status = "failed";
          }
        } else if (step.event_type === "before_test_case_start") {
          status = "running";
        }
        
        // Double-check with thinking text for completion indicators
        if (step.thinking) {
          const thinkingLower = step.thinking.toLowerCase();
          if (thinkingLower.includes("✅") || 
              (thinkingLower.includes("completed") && thinkingLower.includes("passed"))) {
            status = "completed";
          }
        }
        
        console.log("[RunBeforeSection] Before test case:", testCaseName, "executionId:", executionId, "status:", status);

        executionMap.set(executionId, {
          id: executionId,
          testCaseName,
          status,
          timestamp: step.timestamp,
          details: step.thinking || "Executing prerequisite test case",
        });
      }
    };

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // On first load, process all documents
        if (isInitialLoad) {
          console.log("[RunBeforeSection] Initial load with", snapshot.size, "docs");
          const executionMap = new Map<string, RunBeforeExecution>();

          snapshot.docs.forEach((doc) => {
            const step = { id: doc.id, ...doc.data() } as AgentStep & { id: string };
            processStep(step, executionMap);
          });

          const executionList = Array.from(executionMap.values());
          executionList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          const allCompleted = 
            executionList.length > 0 && 
            executionList.every((e) => e.status === "completed" || e.status === "failed");

          setExecutions(executionList);
          setIsComplete(allCompleted);
          setIsInitialLoad(false);
        } else {
          // On subsequent updates, only process changes
          console.log("[RunBeforeSection] Processing", snapshot.docChanges().length, "changes");
          
          snapshot.docChanges().forEach((change) => {
            const step = { id: change.doc.id, ...change.doc.data() } as AgentStep & { id: string };

            if (change.type === "added" || change.type === "modified") {
              const tempMap = new Map<string, RunBeforeExecution>();
              processStep(step, tempMap);
              
              if (tempMap.size > 0) {
                setExecutions((prev) => {
                  // Create a map of existing executions for efficient lookup
                  const existingMap = new Map(prev.map((e) => [e.id, e]));
                  
                  // Update or add new entries from tempMap
                  tempMap.forEach((newExecution, id) => {
                    existingMap.set(id, newExecution);
                  });
                  
                  // Convert back to array and sort
                  const updated = Array.from(existingMap.values());
                  return updated.sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );
                });
              }
            }

            if (change.type === "removed") {
              setExecutions((prev) => {
                // Extract execution ID from this step
                const testCaseNumber = extractTestCaseNumber(step.thinking);
                const executionId = testCaseNumber || `${step.test_case_id}-${step.step_number}` || step.id;
                return prev.filter((e) => e.id !== executionId);
              });
            }
          });

          // Update completion status separately
          setExecutions((current) => {
            const allCompleted = 
              current.length > 0 && 
              current.every((e) => e.status === "completed" || e.status === "failed");
            setIsComplete(allCompleted);
            return current;
          });
        }

        console.log("[RunBeforeSection] Current executions:", executions.length);
      },

      (error) => {
        console.error("[RunBeforeSection] Listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [sessionId, tenantId]);

  if (executions.length === 0) {
    return null;
  }

  const hasRunning = executions.some((e) => e.status === "running");
  const hasFailed = executions.some((e) => e.status === "failed");

  // If complete and no failures, show compact single-line view
  if (isComplete && !hasFailed) {
    const completedCount = executions.filter((e) => e.status === "completed").length;
    return (
      <div className="px-6 pb-4 bg-white">
        <div className="border-t border-[var(--border-light)] pt-4">
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 shadow-sm">
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500 flex-shrink-0">
              <Check size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-green-700">
              Run Before Completed - {completedCount} prerequisite test case{completedCount !== 1 ? 's' : ''} passed
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-4 bg-white">
      <div className="border-t border-[var(--border-light)] pt-4">
        <div className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--fill-white)] shadow-sm p-3">
          <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
            Run Before (Prerequisite Test Cases)
          </h4>
        
          <div className="flex flex-col gap-2">
          {executions.map((execution, index) => {
            const isLast = index === executions.length - 1;
            
            return (
              <div key={execution.id} className="flex items-start gap-3">
                {/* Status Indicator */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                      execution.status === "completed"
                        ? "bg-green-500 text-white"
                        : execution.status === "failed"
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {execution.status === "completed" ? (
                      <Check size={14} />
                    ) : execution.status === "failed" ? (
                      <XCircle size={12} />
                    ) : (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                  </div>
                  
                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      className={`w-0.5 h-6 ${
                        isComplete ? "bg-green-200" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                {/* Execution Details */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        execution.status === "completed"
                          ? "text-[var(--text-primary)]"
                          : execution.status === "failed"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {execution.testCaseName}
                    </span>
                    {execution.status === "running" && (
                      <span className="text-xs text-[var(--text-tertiary)] animate-pulse">
                        Running...
                      </span>
                    )}
                    {execution.status === "failed" && (
                      <span className="text-xs text-red-600 font-medium">
                        Failed
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to extract test case name from thinking text
function extractTestCaseNameFromThinking(thinking?: string): string | null {
  if (!thinking) return null;
  
  // Try to extract "before test case X/Y" or "test case X/Y"
  const numberedMatch = thinking.match(/(?:before\s+)?test case\s+(\d+\/\d+)/i);
  if (numberedMatch) {
    return `Test Case ${numberedMatch[1]}`;
  }
  
  // Try to extract quoted test case name
  const quotedMatch = thinking.match(/["'`]([^"'`]+)["'`]/);
  if (quotedMatch) {
    return quotedMatch[1];
  }
  
  // Try to extract after "test case:" or "running:" or "before:"
  const afterColonMatch = thinking.match(/(?:test case|test|running|executing|before):\s*([^\n,.]+)/i);
  if (afterColonMatch) {
    return afterColonMatch[1].trim();
  }
  
  return null;
}

// Helper function to extract test case number for unique ID
function extractTestCaseNumber(thinking?: string): string | null {
  if (!thinking) return null;
  
  const match = thinking.match(/(?:before\s+)?test case\s+(\d+\/\d+)/i);
  if (match) {
    return `test-case-${match[1].replace("/", "-")}`;
  }
  
  return null;
}

