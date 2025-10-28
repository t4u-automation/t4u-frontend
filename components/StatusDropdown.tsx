"use client";

import { TestCaseStatus } from "@/types";
import { Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface StatusDropdownProps {
  currentStatus: TestCaseStatus;
  allStatuses: TestCaseStatus[];
  onStatusChange: (statusId: string) => Promise<void>;
}

export default function StatusDropdown({
  currentStatus,
  allStatuses,
  onStatusChange,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusClick = async (statusId: string) => {
    if (statusId === currentStatus.id || isChanging) return;

    try {
      setIsChanging(true);
      await onStatusChange(statusId);
      setIsOpen(false);
    } catch (error) {
      console.error("[StatusDropdown] Error changing status:", error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="TestCaseStatusBadge"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80"
        style={{
          backgroundColor: currentStatus.color ? `${currentStatus.color}20` : "#e5e7eb",
          color: currentStatus.color || "#6b7280",
        }}
      >
        {currentStatus.name}
      </button>

      {isOpen && (
        <div
          id="StatusDropdownMenu"
          className="absolute left-0 top-8 min-w-[200px] bg-white rounded-[8px] shadow-lg border border-[var(--border-main)] py-2 z-50"
        >
          <div className="py-1">
            {allStatuses.map((status) => {
              const isSelected = status.id === currentStatus.id;

              return (
                <button
                  key={status.id}
                  onClick={() => handleStatusClick(status.id)}
                  disabled={isChanging}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--fill-tsp-white-light)] transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: status.color || "#94a3b8",
                      border: status.color ? 'none' : '1px solid #d1d5db'
                    }}
                  />
                  <span className="text-sm text-[var(--text-primary)] flex-1">
                    {status.name}
                  </span>
                  {isSelected && (
                    <Check size={16} className="text-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

