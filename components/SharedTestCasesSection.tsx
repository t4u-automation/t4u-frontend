"use client";

import { TestCase } from "@/types";
import { useState, useEffect, useRef } from "react";
import { X, GripVertical, ChevronDown } from "lucide-react";

interface SharedTestCasesSectionProps {
  testCase: TestCase;
  allTestCases: TestCase[];
  onSave: (before: string[], after: string[]) => Promise<void>;
}

export default function SharedTestCasesSection({
  testCase,
  allTestCases,
  onSave,
}: SharedTestCasesSectionProps) {
  const [beforeTestCases, setBeforeTestCases] = useState<string[]>(
    testCase.shared_test_cases?.before || []
  );
  const [afterTestCases, setAfterTestCases] = useState<string[]>(
    testCase.shared_test_cases?.after || []
  );
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    section: "before" | "after";
  } | null>(null);
  const [showBeforeDropdown, setShowBeforeDropdown] = useState(false);
  const [showAfterDropdown, setShowAfterDropdown] = useState(false);
  const beforeDropdownRef = useRef<HTMLDivElement>(null);
  const afterDropdownRef = useRef<HTMLDivElement>(null);

  // Filter test cases that have proven_steps
  const availableTestCases = allTestCases.filter(
    (tc) => tc.id !== testCase.id && tc.proven_steps && tc.proven_steps.length > 0
  );

  useEffect(() => {
    setBeforeTestCases(testCase.shared_test_cases?.before || []);
    setAfterTestCases(testCase.shared_test_cases?.after || []);
  }, [testCase.shared_test_cases]);

  // Auto-save when test cases change
  useEffect(() => {
    const originalBefore = testCase.shared_test_cases?.before || [];
    const originalAfter = testCase.shared_test_cases?.after || [];
    
    const hasChanged =
      JSON.stringify(beforeTestCases) !== JSON.stringify(originalBefore) ||
      JSON.stringify(afterTestCases) !== JSON.stringify(originalAfter);

    if (hasChanged) {
      const timer = setTimeout(() => {
        onSave(beforeTestCases, afterTestCases);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [beforeTestCases, afterTestCases, testCase.shared_test_cases, onSave]);

  const handleAddBefore = (testCaseId: string) => {
    if (!beforeTestCases.includes(testCaseId)) {
      setBeforeTestCases([...beforeTestCases, testCaseId]);
    }
    setShowBeforeDropdown(false);
  };

  const handleAddAfter = (testCaseId: string) => {
    if (!afterTestCases.includes(testCaseId)) {
      setAfterTestCases([...afterTestCases, testCaseId]);
    }
    setShowAfterDropdown(false);
  };

  const handleRemoveBefore = (testCaseId: string) => {
    setBeforeTestCases(beforeTestCases.filter((id) => id !== testCaseId));
  };

  const handleRemoveAfter = (testCaseId: string) => {
    setAfterTestCases(afterTestCases.filter((id) => id !== testCaseId));
  };

  const handleDragStart = (testCaseId: string, section: "before" | "after") => {
    setDraggedItem({ id: testCaseId, section });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    targetId: string,
    section: "before" | "after",
    position: "before" | "after"
  ) => {
    if (!draggedItem || draggedItem.section !== section) return;

    const list = section === "before" ? [...beforeTestCases] : [...afterTestCases];
    const draggedIndex = list.indexOf(draggedItem.id);
    const targetIndex = list.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove from old position
    list.splice(draggedIndex, 1);

    // Calculate new index
    const newTargetIndex = list.indexOf(targetId);
    const insertIndex = position === "before" ? newTargetIndex : newTargetIndex + 1;

    // Insert at new position
    list.splice(insertIndex, 0, draggedItem.id);

    if (section === "before") {
      setBeforeTestCases(list);
    } else {
      setAfterTestCases(list);
    }

    setDraggedItem(null);
  };

  const getTestCaseName = (testCaseId: string) => {
    const tc = allTestCases.find((t) => t.id === testCaseId);
    return tc?.name || "Unknown Test Case";
  };

  const renderTestCaseList = (
    testCaseIds: string[],
    section: "before" | "after"
  ) => {
    if (testCaseIds.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {testCaseIds.map((testCaseId, index) => (
          <div
            key={testCaseId}
            draggable={true}
            onDragStart={() => handleDragStart(testCaseId, section)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(testCaseId, section, "after")}
            className="group flex items-center gap-2 p-2 bg-[var(--fill-tsp-white-light)] border border-[var(--border-light)] rounded-[6px] cursor-move hover:border-[var(--border-main)] transition-colors"
          >
            <GripVertical
              size={16}
              className="text-[var(--icon-secondary)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-xs font-medium text-[var(--text-tertiary)] flex-shrink-0 w-6">
              {index + 1}.
            </span>
            <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
              {getTestCaseName(testCaseId)}
            </span>
            <button
              onClick={() =>
                section === "before"
                  ? handleRemoveBefore(testCaseId)
                  : handleRemoveAfter(testCaseId)
              }
              className="p-1 hover:bg-white rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <X size={14} className="text-[var(--icon-secondary)]" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderDropdown = (
    section: "before" | "after",
    isOpen: boolean,
    onClose: () => void,
    dropdownRef: React.RefObject<HTMLDivElement>
  ) => {
    const selectedIds = section === "before" ? beforeTestCases : afterTestCases;
    const availableOptions = availableTestCases.filter(
      (tc) => !selectedIds.includes(tc.id)
    );

    if (!isOpen) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-full min-w-[300px] bg-white rounded-[8px] shadow-lg border border-[var(--border-main)] py-1 z-50 max-h-[240px] overflow-y-auto"
        >
          {availableOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--text-tertiary)] italic">
              No available test cases with proven steps
            </div>
          ) : (
            availableOptions.map((tc) => (
              <button
                key={tc.id}
                onClick={() =>
                  section === "before" ? handleAddBefore(tc.id) : handleAddAfter(tc.id)
                }
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--fill-tsp-white-light)] transition-colors"
              >
                <span className="text-sm text-[var(--text-primary)] truncate">
                  {tc.name}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0 bg-[var(--fill-tsp-gray-main)] px-2 py-0.5 rounded">
                  {tc.proven_steps_count || 0} steps
                </span>
              </button>
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Run Before Section */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Run Before
          </h4>
          <div className="relative">
            <button
              onClick={() => setShowBeforeDropdown(!showBeforeDropdown)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-[var(--fill-tsp-white-light)] rounded-[6px] transition-colors border border-[var(--border-main)]"
            >
              <span>Add Test Case</span>
              <ChevronDown size={14} />
            </button>
            {renderDropdown("before", showBeforeDropdown, () =>
              setShowBeforeDropdown(false), beforeDropdownRef
            )}
          </div>
        </div>
        {beforeTestCases.length === 0 ? (
          <div className="text-sm text-[var(--text-disable)] italic py-2">
            No test cases configured
          </div>
        ) : (
          renderTestCaseList(beforeTestCases, "before")
        )}
      </div>

      {/* Run After Section */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Run After
          </h4>
          <div className="relative">
            <button
              onClick={() => setShowAfterDropdown(!showAfterDropdown)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-[var(--fill-tsp-white-light)] rounded-[6px] transition-colors border border-[var(--border-main)]"
            >
              <span>Add Test Case</span>
              <ChevronDown size={14} />
            </button>
            {renderDropdown("after", showAfterDropdown, () =>
              setShowAfterDropdown(false), afterDropdownRef
            )}
          </div>
        </div>
        {afterTestCases.length === 0 ? (
          <div className="text-sm text-[var(--text-disable)] italic py-2">
            No test cases configured
          </div>
        ) : (
          renderTestCaseList(afterTestCases, "after")
        )}
      </div>
    </div>
  );
}

