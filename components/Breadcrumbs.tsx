"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav id="Breadcrumbs" className="flex items-center gap-2 px-6 py-3 bg-white border-b border-[var(--border-main)]">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight size={14} className="text-[var(--icon-tertiary)]" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}





