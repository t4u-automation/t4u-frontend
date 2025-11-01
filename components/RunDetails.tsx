"use client";

import { Run, TestCase, RunTestCaseResult } from "@/types";
import { Play, CheckCircle2, XCircle, Clock, Loader2, Minus, Plus, Monitor, Maximize2, Minimize2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";

const VncViewer = dynamic(() => import("./VncViewer.client"), {
  ssr: false,
});

interface RunDetailsProps {
  run: Run | null;
  testCases: TestCase[];
  onRerun?: (runId: string) => void;
  isExecuting?: boolean;
}

export default function RunDetails({ run, testCases, onRerun, isExecuting }: RunDetailsProps) {
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set());
  const [liveRun, setLiveRun] = useState<Run | null>(run);
  const [floatingVncTestCaseId, setFloatingVncTestCaseId] = useState<string | null>(null);
  const [isVncExpanded, setIsVncExpanded] = useState(false);

  // Real-time listener for run updates
  useEffect(() => {
    if (!run) {
      setLiveRun(null);
      return;
    }

    const runRef = doc(db, "runs", run.id);
    
    const unsubscribe = onSnapshot(runRef, (snapshot) => {
      if (snapshot.exists()) {
        setLiveRun({ id: snapshot.id, ...snapshot.data() } as Run);
      }
    });

    return () => unsubscribe();
  }, [run?.id]);

  // Update liveRun when run prop changes
  useEffect(() => {
    setLiveRun(run);
  }, [run]);

  if (!liveRun) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <div className="text-sm text-[var(--text-secondary)]">
            Select a run to view details
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-2">
            or create a new one to get started
          </div>
        </div>
      </div>
    );
  }

  const toggleTestCase = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases);
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId);
    } else {
      newExpanded.add(testCaseId);
    }
    setExpandedTestCases(newExpanded);
  };

  const getStatusIcon = (status: RunTestCaseResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 size={20} className="text-green-500" />;
      case "failed":
        return <XCircle size={20} className="text-red-500" />;
      case "running":
        return <Loader2 size={20} className="text-blue-500 animate-spin" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getOverallProgress = () => {
    const total = liveRun.test_case_ids.length;
    const completed = Object.values(liveRun.results).filter(
      (r) => r.status === "passed" || r.status === "failed"
    ).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const progress = getOverallProgress();

  const floatingVncResult = floatingVncTestCaseId ? liveRun.results[floatingVncTestCaseId] : null;
  const floatingVncUrl = floatingVncResult?.vnc_url || null;

  const handleCloseFloatingVnc = () => {
    setFloatingVncTestCaseId(null);
    setIsVncExpanded(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-main)]">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
            <Play size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              {liveRun.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
              <span>{new Date(liveRun.created_at).toLocaleDateString()} at {new Date(liveRun.created_at).toLocaleTimeString()}</span>
              <span>•</span>
              <span className={`font-medium ${
                liveRun.status === "completed" ? "text-green-600" :
                liveRun.status === "failed" ? "text-red-600" :
                liveRun.status === "running" ? "text-blue-600" :
                "text-gray-600"
              }`}>
                {liveRun.status.charAt(0).toUpperCase() + liveRun.status.slice(1)}
              </span>
            </div>
          </div>
          {(liveRun.status === "completed" || liveRun.status === "failed") && onRerun && (
            <button
              onClick={() => onRerun(liveRun.id)}
              disabled={isExecuting}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Run</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Overall Progress</span>
            <span className="text-[var(--text-primary)] font-medium">
              {progress.completed}/{progress.total} test cases
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                liveRun.status === "failed" ? "bg-red-500" :
                liveRun.status === "completed" ? "bg-green-500" :
                "bg-blue-500"
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="flex-1 overflow-y-auto p-4">
        {liveRun.test_case_ids.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
            No test cases in this run
          </div>
        ) : (
          <div className="space-y-2">
            {liveRun.test_case_ids.map((testCaseId, index) => {
              const testCase = testCases.find(tc => tc.id === testCaseId);
              const result = liveRun.results[testCaseId];
              const isExpanded = expandedTestCases.has(testCaseId);
              const provenSteps = testCase?.proven_steps || [];

              if (!testCase || !result) return null;

              return (
                <div
                  key={testCaseId}
                  className="border border-[var(--border-main)] rounded-[8px] overflow-hidden"
                >
                  {/* Test Case Header */}
                  <div
                    className="flex items-center gap-3 p-4 bg-white hover:bg-[var(--fill-tsp-white-light)] cursor-pointer"
                    onClick={() => toggleTestCase(testCaseId)}
                  >
                    <button className="p-0.5 hover:bg-[var(--fill-tsp-gray-main)] rounded">
                      {isExpanded ? (
                        <Minus size={14} className="text-[var(--icon-secondary)]" />
                      ) : (
                        <Plus size={14} className="text-[var(--icon-secondary)]" />
                      )}
                    </button>
                    <div className="flex-shrink-0">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                        {index + 1}. {testCase.name}
                      </div>
                      {result.status === "running" && result.total_steps > 0 && (
                        <div className="text-xs text-[var(--text-tertiary)]">
                          Step {result.current_step}/{result.total_steps}
                        </div>
                      )}
                      {result.error && (
                        <div className="text-xs text-red-600 mt-1">
                          {result.error}
                        </div>
                      )}
                    </div>
                    {result.vnc_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFloatingVncTestCaseId(testCaseId);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-[6px] text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        <Monitor size={14} />
                        <span>Computer</span>
                      </button>
                    )}
                    {!result.vnc_url && result.total_steps > 0 && (
                      <div className="flex-shrink-0 text-xs text-[var(--text-tertiary)]">
                        {result.current_step}/{result.total_steps}
                      </div>
                    )}
                  </div>

                  {/* Proven Steps - Expanded View */}
                  {isExpanded && provenSteps.length > 0 && (
                    <div className="border-t border-[var(--border-light)] bg-[var(--fill-tsp-white-light)] p-4">
                      <div className="space-y-2">
                        {provenSteps.map((step, stepIndex) => {
                          const isCompleted = stepIndex < result.current_step;
                          const isCurrent = stepIndex === result.current_step - 1;
                          
                          return (
                            <div
                              key={step.step_number}
                              className={`flex items-start gap-3 p-3 rounded-[6px] ${
                                isCompleted ? "bg-green-50 border border-green-200" :
                                isCurrent ? "bg-blue-50 border border-blue-200" :
                                "bg-white border border-[var(--border-light)]"
                              }`}
                            >
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                isCompleted ? "bg-green-500" :
                                isCurrent ? "bg-blue-500" :
                                "bg-gray-300"
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 size={14} className="text-white" />
                                ) : (
                                  <span className="text-xs font-semibold text-white">
                                    {step.step_number}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                  {step.arguments.action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </div>
                                {step.arguments.url && (
                                  <div className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                                    {step.arguments.url}
                                  </div>
                                )}
                                {step.arguments.assertion_description && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    ✓ {step.arguments.assertion_description}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating VNC Window */}
      {floatingVncTestCaseId && (
        <div
          className={`fixed z-50 bg-white rounded-[12px] shadow-xl border border-[var(--border-main)] transition-all duration-300 ${
            isVncExpanded
              ? "bottom-6 right-6 w-[800px] h-[600px]"
              : "bottom-6 right-6 w-[400px] h-[300px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-main)] bg-[var(--fill-tsp-white-light)]">
            <div className="flex items-center gap-3">
              <Monitor size={16} className={floatingVncUrl ? "text-green-500" : "text-[var(--icon-secondary)]"} />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Computer
              </span>
              <span className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${floatingVncUrl ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-xs font-medium ${floatingVncUrl ? "text-green-600" : "text-red-600"}`}>
                  {floatingVncUrl ? "online" : "offline"}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsVncExpanded(!isVncExpanded)}
                className="p-1.5 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
                title={isVncExpanded ? "Collapse" : "Expand"}
              >
                {isVncExpanded ? (
                  <Minimize2 size={16} className="text-[var(--icon-secondary)]" />
                ) : (
                  <Maximize2 size={16} className="text-[var(--icon-secondary)]" />
                )}
              </button>

              <button
                onClick={handleCloseFloatingVnc}
                className="p-1.5 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
                title="Close"
              >
                <X size={16} className="text-[var(--icon-secondary)]" />
              </button>
            </div>
          </div>

          {/* VNC Content */}
          <div className="h-[calc(100%-44px)] bg-[#1a1a1a] flex items-center justify-center">
            {floatingVncUrl ? (
              <VncViewer url={floatingVncUrl} />
            ) : (
              <div className="text-center text-gray-400 text-sm">
                Waiting for agent to start...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

