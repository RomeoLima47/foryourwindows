"use client";

import React, { useState, useRef, useCallback } from "react";

interface DragListProps<T extends { _id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, dragHandleProps: DragHandleProps) => React.ReactNode;
  className?: string;
}

export interface DragHandleProps {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  className: string;
  title: string;
}

export function DragList<T extends { _id: string }>({
  items,
  onReorder,
  renderItem,
  className = "space-y-2",
}: DragListProps<T>) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  const handleDragStart = useCallback((idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Use a tiny timeout so the drag image captures the element
    const el = e.currentTarget.closest("[data-drag-item]") as HTMLElement;
    if (el) {
      el.style.opacity = "0.5";
      setTimeout(() => { el.style.opacity = "0.5"; }, 0);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    // Reset opacity on all items
    document.querySelectorAll("[data-drag-item]").forEach((el) => {
      (el as HTMLElement).style.opacity = "1";
    });

    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const newItems = [...items];
      const [moved] = newItems.splice(dragIdx, 1);
      newItems.splice(overIdx, 0, moved);
      onReorder(newItems.map((item) => item._id));
    }

    setDragIdx(null);
    setOverIdx(null);
    dragCounterRef.current = 0;
  }, [dragIdx, overIdx, items, onReorder]);

  const handleDragOver = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const handleDragEnter = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setOverIdx(idx);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
    }
  }, []);

  return (
    <div className={className}>
      {items.map((item, idx) => {
        const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
        const isAbove = dragIdx !== null && overIdx !== null && dragIdx > idx && overIdx === idx;
        const isBelow = dragIdx !== null && overIdx !== null && dragIdx < idx && overIdx === idx;

        const dragHandleProps: DragHandleProps = {
          draggable: true,
          onDragStart: handleDragStart(idx),
          onDragEnd: handleDragEnd,
          className: "cursor-grab active:cursor-grabbing select-none touch-none flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors px-0.5",
          title: "Drag to reorder",
        };

        return (
          <div
            key={item._id}
            data-drag-item
            onDragOver={handleDragOver(idx)}
            onDragEnter={handleDragEnter(idx)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => { e.preventDefault(); handleDragEnd(); }}
            className="relative"
          >
            {/* Drop indicator line */}
            {isAbove && (
              <div className="absolute -top-1 left-0 right-0 z-10 h-0.5 rounded-full bg-primary" />
            )}
            {renderItem(item, dragHandleProps)}
            {isBelow && (
              <div className="absolute -bottom-1 left-0 right-0 z-10 h-0.5 rounded-full bg-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Drag Handle Icon ───────────────────────────────────────
export function DragHandle(props: DragHandleProps) {
  return (
    <span {...props}>
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
      </svg>
    </span>
  );
}
