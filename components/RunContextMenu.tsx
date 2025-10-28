"use client";

import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "./ConfirmDialog";

interface RunContextMenuProps {
  runName: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function RunContextMenu({
  runName,
  onEdit,
  onDelete,
}: RunContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
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

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 224,
      });
    }
    
    setIsOpen(!isOpen);
  };

  const handleDeleteClick = () => {
    setIsOpen(false);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    setShowConfirmDelete(false);
    onDelete?.();
  };

  const menuItems = [
    {
      label: "Edit",
      icon: Edit2,
      onClick: onEdit,
      show: true,
      danger: false,
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: handleDeleteClick,
      show: true,
      danger: true,
    },
  ];

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      className="fixed w-56 bg-white rounded-[8px] shadow-lg border border-[var(--border-main)] py-1 z-[100]"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
      }}
    >
      {menuItems
        .filter((item) => item.show)
        .map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick?.();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--fill-tsp-white-light)] transition-colors ${
                item.danger ? "text-red-600" : "text-[var(--text-primary)]"
              }`}
            >
              <Icon size={16} className={item.danger ? "text-red-500" : "text-[var(--icon-secondary)]"} />
              <span className="flex-1 text-sm">{item.label}</span>
            </button>
          );
        })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-opacity"
        onClick={handleMenuClick}
        title="More actions"
      >
        <MoreVertical size={16} className="text-[var(--icon-secondary)]" />
      </button>

      {typeof document !== 'undefined' && menuContent && createPortal(menuContent, document.body)}

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete run?"
        message={`Are you sure you want to delete "${runName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        isDanger={true}
      />
    </>
  );
}

