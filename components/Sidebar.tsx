"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useAgentSessions } from "@/hooks/useAgentSessions";
import { PanelLeft, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import TaskItem from "./TaskItem";

interface SidebarProps {
  selectedTaskId?: string;
  onTaskSelect: (taskId: string) => void;
  onNewTask: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export default function Sidebar({
  selectedTaskId,
  onTaskSelect,
  onNewTask,
  isOpen = false,
  onClose,
  isExpanded = true,
  onToggleExpanded,
}: SidebarProps) {
  const { user } = useAuth();
  const { tenant } = useTenant(user);
  const { tasks, loading } = useAgentSessions(user?.uid, tenant?.id);

  // Screen size detection
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    // Set initial state
    checkScreenSize();

    // Listen for window resize
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleTaskSelect = (taskId: string) => {
    onTaskSelect(taskId);
    // Close sidebar on mobile after task selection
    if (isSmallScreen && onClose) {
      onClose();
    }
  };

  const handleNewTask = () => {
    onNewTask();
    // Close sidebar on mobile after creating new task
    if (isSmallScreen && onClose) {
      onClose();
    }
  };

  // On small screens, render as fullscreen overlay
  if (isSmallScreen) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
        )}

        {/* Mobile sidebar overlay */}
        <aside
          className={`fixed top-0 left-0 bottom-0 w-80 bg-[var(--background-nav)] z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header with close button */}
          <div className="flex items-center px-3 py-3 flex-row h-[52px] gap-1 border-b border-[var(--border-light)]">
            <div className="flex items-center flex-1">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                OpenAnus
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center cursor-pointer rounded-md hover:bg-[var(--fill-tsp-gray-main)]"
            >
              <X size={20} className="text-[var(--icon-secondary)]" />
            </button>
          </div>

          {/* Task list */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* New Task Button */}
            <div className="px-3 py-3 flex flex-col gap-[12px] flex-shrink-0">
              <button
                id="NewTaskButton"
                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors active:opacity-80 bg-[var(--Button-primary-white)] text-[var(--text-primary)] shadow-[0px_0.5px_3px_0px_var(--shadow-S)] hover:opacity-70 h-[36px] px-[12px] rounded-[10px] gap-[6px] text-sm min-w-[36px] w-full"
                onClick={handleNewTask}
              >
                <Plus size={16} className="text-[var(--icon-primary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap truncate">
                  New task
                </span>
              </button>
            </div>

            {/* Tasks List */}
            <div
              id="TaskList"
              className="flex flex-col flex-1 min-h-0 overflow-auto pb-5 overflow-x-hidden"
            >
              <div className="p-3 flex flex-col gap-2">
                {loading ? (
                  <div className="text-center text-[var(--text-tertiary)] text-sm py-4">
                    Loading sessions...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center text-[var(--text-tertiary)] text-sm py-4">
                    No sessions yet
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onClick={() => handleTaskSelect(task.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Desktop sidebar - collapsible between expanded and collapsed
  return (
    <div
      id="Sidebar"
      className="h-full flex flex-col bg-[var(--background-nav)] transition-all duration-300 ease-in-out"
      style={{ width: isExpanded ? "320px" : "60px" }}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-3 py-3 flex-row h-[52px] gap-1">
          <div className="relative flex items-center">
            <div
              id="ToggleSidebarButton"
              className="flex h-7 w-7 items-center justify-center cursor-pointer rounded-md hover:bg-[var(--fill-tsp-gray-main)]"
              onClick={onToggleExpanded}
            >
              <PanelLeft size={20} className="text-[var(--icon-secondary)]" />
            </div>
          </div>

          {isExpanded && (
            <div className="flex flex-row gap-1 ml-auto">
              <div
                id="SearchButton"
                className="flex h-7 w-7 items-center justify-center cursor-pointer rounded-md hover:bg-[var(--fill-tsp-gray-main)]"
              >
                <Search size={20} className="text-[var(--icon-secondary)]" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        {isExpanded && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* New Task Button */}
            <div className="px-3 flex flex-col gap-[12px] flex-shrink-0">
              <button
                id="NewTaskButton"
                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors active:opacity-80 bg-[var(--Button-primary-white)] text-[var(--text-primary)] shadow-[0px_0.5px_3px_0px_var(--shadow-S)] hover:opacity-70 h-[36px] px-[12px] rounded-[10px] gap-[6px] text-sm min-w-[36px] w-full"
                onClick={onNewTask}
              >
                <Plus size={16} className="text-[var(--icon-primary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap truncate">
                  New task
                </span>
              </button>
            </div>

            {/* Tasks List */}
            <div
              id="TaskList"
              className="flex flex-col flex-1 min-h-0 overflow-auto pb-5 overflow-x-hidden"
            >
              <div className="p-3 flex flex-col gap-2">
                {loading ? (
                  <div className="text-center text-[var(--text-tertiary)] text-sm py-4">
                    Loading sessions...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center text-[var(--text-tertiary)] text-sm py-4">
                    No sessions yet
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onClick={() => onTaskSelect(task.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
