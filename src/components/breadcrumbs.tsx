"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && (
              <svg className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isLast || !item.href ? (
              <span className={isLast ? "font-medium text-foreground truncate max-w-[200px]" : "truncate max-w-[200px]"}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="truncate max-w-[200px] transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
