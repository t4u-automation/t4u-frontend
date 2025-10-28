"use client";

import { Run } from "@/types";
import { Play, Plus, Search, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import RunContextMenu from "./RunContextMenu";

interface RunsPanelProps {
  runs: Run[];
  selectedRunId?: string;
  onRunSelect: (runId: string) => void;
  onCreateClick: () => void;
  onEditRun?: (runId: string) => void;
  onDeleteRun?: (runId: string) => void;
}

export default function RunsPanel({
  runs,
  selectedRunId,
  onRunSelect,
  onCreateClick,
  onEditRun,
  onDeleteRun,
}: RunsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRuns = runs.filter((run) =>
    run.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: Run["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "failed":
        return <XCircle size={16} className="text-red-500" />;
      case "running":
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Run["status"]) => {
    const styles = {
      pending: "bg-gray-100 text-gray-600",
      running: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getProgress = (run: Run) => {
    const total = run.test_case_ids.length;
    const completed = Object.values(run.results).filter(
      (r) => r.status === "passed" || r.status === "failed"
    ).length;
    return { completed, total };
  };

  return (
    <div className="w-[416px] bg-white border-r border-[var(--border-main)] flex flex-col flex-shrink-0">
      {/* Search Bar */}
      <div className="p-3 border-b border-[var(--border-main)]">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--icon-secondary)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--fill-tsp-white-light)] border-0 rounded-[6px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-active)]"
          />
        </div>
      </div>

      {/* Runs List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs text-[var(--text-tertiary)] px-2 py-1 mb-1">
          Runs: {filteredRuns.length}
          {searchQuery && filteredRuns.length !== runs.length && (
            <span className="text-[var(--text-secondary)]"> (filtered from {runs.length})</span>
          )}
        </div>

        {filteredRuns.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Play size={32} className="text-[var(--icon-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              {searchQuery ? "No matches found" : "No runs yet"}
            </p>
            {searchQuery && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredRuns.map((run) => {
              const isSelected = run.id === selectedRunId;
              const progress = getProgress(run);

              return (
                <div
                  key={run.id}
                  className={`px-2 py-2 rounded cursor-pointer group ${
                    isSelected
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-[var(--fill-tsp-white-light)] text-[var(--text-primary)]"
                  }`}
                  onClick={() => onRunSelect(run.id)}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(run.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {run.name}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {new Date(run.created_at).toLocaleDateString()} {new Date(run.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <RunContextMenu
                      runName={run.name}
                      onEdit={() => onEditRun?.(run.id)}
                      onDelete={() => onDeleteRun?.(run.id)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(run.status)}
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[var(--border-main)]">
        <button
          onClick={onCreateClick}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[var(--border-main)] rounded-[6px] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] transition-colors"
        >
          <Plus size={16} />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
}

