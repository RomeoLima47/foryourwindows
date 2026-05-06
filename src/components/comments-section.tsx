"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import type { Id } from "../../convex/_generated/dataModel";

interface CommentsSectionProps {
  projectId?: Id<"projects">;
  taskId?: Id<"tasks">;
  subtaskId?: Id<"subtasks">;
  workOrderId?: Id<"workOrders">;
  compact?: boolean;
}

export function CommentsSection({ projectId, taskId, subtaskId, workOrderId, compact }: CommentsSectionProps) {
  const { toast } = useToast();
  const [content, setContent] = useState("");

  // Pick the right query based on which entity
  const queryFn = projectId
    ? api.comments.listByProject
    : taskId
    ? api.comments.listByTask
    : subtaskId
    ? api.comments.listBySubtask
    : api.comments.listByWorkOrder;

  const queryArgs = projectId
    ? { projectId }
    : taskId
    ? { taskId }
    : subtaskId
    ? { subtaskId: subtaskId! }
    : { workOrderId: workOrderId! };

  const comments = useQuery(queryFn, queryArgs as any);
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);

  const handlePost = async () => {
    if (!content.trim()) return;
    await createComment({ content, projectId, taskId, subtaskId, workOrderId });
    setContent("");
    toast("Comment posted");
  };

  if (compact) {
    return (
      <div>
        <div className="flex gap-2">
          <Input placeholder="Add comment..." value={content}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handlePost(); }}
            className="h-7 text-xs" />
          <Button size="sm" className="h-7 text-xs" onClick={handlePost} title="Post comment">💬</Button>
        </div>
        {comments && comments.length > 0 && (
          <div className="mt-2 max-h-[150px] space-y-1.5 overflow-y-auto">
            {(comments as any[]).map((c) => (
              <div key={c._id} className="group flex items-start gap-2 rounded border px-2 py-1.5">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium" title={c.authorName}>
                  {c.authorName?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px]">{c.content}</p>
                  <p className="text-[9px] text-muted-foreground">{c.authorName} · {new Date(c.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => { removeComment({ id: c._id }); toast("Deleted"); }}
                  className="hidden flex-shrink-0 text-[10px] text-muted-foreground hover:text-red-500 group-hover:inline" title="Delete comment">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Comments {comments && (comments as any[]).length > 0 && <span className="text-muted-foreground">({(comments as any[]).length})</span>}</p>
      </div>
      <div className="mb-3 flex gap-2">
        <Input placeholder="Write a comment..." value={content}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handlePost(); }} />
        <Button size="sm" onClick={handlePost} title="Post comment">Post</Button>
      </div>
      {!comments ? <div className="h-8 animate-pulse rounded bg-muted" />
        : (comments as any[]).length === 0 ? <p className="py-3 text-center text-xs text-muted-foreground">No comments yet.</p>
        : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {(comments as any[]).map((c) => (
            <div key={c._id} className="group flex items-start gap-2 rounded-md border p-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium" title={c.authorName}>
                {c.authorName?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{c.content}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.authorName} · {new Date(c.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => { removeComment({ id: c._id }); toast("Deleted"); }}
                className="hidden flex-shrink-0 text-xs text-muted-foreground hover:text-red-500 group-hover:inline" title="Delete comment">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
