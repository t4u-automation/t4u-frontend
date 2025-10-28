"use client";

import { Task } from "@/types";
import { MoreHorizontal } from "lucide-react";

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

export default function TaskItem({ task, isSelected, onClick }: TaskItemProps) {
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      id="TaskItem"
      className={`group flex h-14 cursor-pointer items-center gap-2 rounded-[10px] px-2 transition-colors ${
        isSelected
          ? "bg-white hover:bg-white"
          : "hover:bg-[var(--fill-tsp-white-main)]"
      }`}
      onClick={onClick}
    >
      {/* Task Icon */}
      <div className="relative">
        <div
          id="TaskIcon"
          className="h-8 w-8 rounded-full flex items-center justify-center relative bg-[var(--fill-tsp-white-dark)]"
        >
          <img
            className="max-h-full max-w-full h-4 w-4 object-cover brightness-0 opacity-75 dark:opacity-100 dark:brightness-100"
            alt={task.title}
            src={`https://files.manuscdn.com/assets/icon/session/${task.icon}.svg`}
          />
        </div>
      </div>

      {/* Task Content */}
      <div className="min-w-20 flex-1 transition-opacity opacity-100">
        {/* Title and Date */}
        <div className="flex items-center gap-1 overflow-x-hidden">
          <div className="flex flex-1 min-w-0 gap-1">
            <span
              id="TaskTitle"
              className="truncate text-sm font-medium text-[var(--text-primary)]"
              title={task.title}
            >
              {task.title}
            </span>
          </div>
          <span
            id="TaskDate"
            className="text-[var(--text-tertiary)] text-xs whitespace-nowrap"
          >
            {task.date}
          </span>
        </div>

        {/* Subtitle and Menu */}
        <div className="flex items-center gap-2 h-[18px] relative">
          <span
            id="TaskSubtitle"
            className="min-w-0 flex-1 truncate text-xs text-[var(--text-tertiary)]"
            title={task.subtitle}
          >
            {task.subtitle}
          </span>
          <div
            id="TaskMenu"
            className="w-[22px] h-[22px] flex rounded-[6px] items-center justify-center pointer invisible cursor-pointer group-hover:visible hover:bg-[var(--fill-tsp-gray-main)]"
            onClick={handleMenuClick}
          >
            <MoreHorizontal
              size={16}
              strokeWidth={2}
              className="text-[var(--icon-secondary)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
