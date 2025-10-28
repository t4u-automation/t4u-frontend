"use client";

import { TestPlan } from "@/types";
import { ClipboardList, Plus, Search } from "lucide-react";
import { useState } from "react";
import TestPlanContextMenu from "./TestPlanContextMenu";

interface TestPlansPanelProps {
  testPlans: TestPlan[];
  selectedTestPlanId?: string;
  onTestPlanSelect: (testPlanId: string) => void;
  onCreateClick: () => void;
  onEditTestPlan?: (testPlanId: string) => void;
  onDeleteTestPlan?: (testPlanId: string) => void;
}

export default function TestPlansPanel({
  testPlans,
  selectedTestPlanId,
  onTestPlanSelect,
  onCreateClick,
  onEditTestPlan,
  onDeleteTestPlan,
}: TestPlansPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTestPlans = testPlans.filter((testPlan) =>
    testPlan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Test Plans List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs text-[var(--text-tertiary)] px-2 py-1 mb-1">
          Test plans: {filteredTestPlans.length}
          {searchQuery && filteredTestPlans.length !== testPlans.length && (
            <span className="text-[var(--text-secondary)]"> (filtered from {testPlans.length})</span>
          )}
        </div>

        {filteredTestPlans.length === 0 ? (
          <div className="text-center py-8 px-4">
            <ClipboardList size={32} className="text-[var(--icon-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              {searchQuery ? "No matches found" : "No test plans yet"}
            </p>
            {searchQuery && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredTestPlans.map((testPlan) => {
              const isSelected = testPlan.id === selectedTestPlanId;
              const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500"];
              const colorClass = colors[testPlan.name.charCodeAt(0) % colors.length];

              return (
                <div
                  key={testPlan.id}
                  className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer group ${
                    isSelected
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-[var(--fill-tsp-white-light)] text-[var(--text-primary)]"
                  }`}
                  onClick={() => onTestPlanSelect(testPlan.id)}
                >
                  <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <ClipboardList size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate mb-0.5">
                      {testPlan.name}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {testPlan.test_cases_count} test cases
                    </div>
                  </div>
                  <TestPlanContextMenu
                    testPlanName={testPlan.name}
                    onEdit={() => onEditTestPlan?.(testPlan.id)}
                    onDelete={() => onDeleteTestPlan?.(testPlan.id)}
                  />
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
          <span>Test Plan</span>
        </button>
      </div>
    </div>
  );
}

