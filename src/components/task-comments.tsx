"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Id } from "../../convex/_generated/dataModel";

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface CommentData {
  _id: Id<"comments">;
  taskId: Id<"tasks">;
  authorId: Id<"users">;
  content: string;
  parentId?: Id<"comments">;
  createdAt: number;
  authorName: string;
  authorImage?: string;
  replies: {
    _id: Id<"comments">;
    taskId: Id<"tasks">;
    authorId: Id<"users">;
    content: string;
    parentId?: Id<"comments">;
    createdAt: number;
    authorName: string;
    authorImage?: string;
  }[];
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: CommentData | CommentData["replies"][0];
  onReply?: (parentId: Id<"comments">) => void;
  onDelete: (id: Id<"comments">) => void;
  isReply?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${isReply ? "ml-8" : ""}`}>
      {comment.authorImage ? (
        <img
          src={comment.authorImage}
          alt=""
          className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full"
        />
      ) : (
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {comment.authorName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">{comment.authorName}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(comment.createdAt)}
              </span>
              <button
                onClick={() => onDelete(comment._id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>
          <p className="mt-0.5 text-sm">{comment.content}</p>
        </div>
        {!isReply && onReply && (
          <button
            onClick={() => onReply(comment._id)}
            className="mt-0.5 px-3 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskComments({ taskId }: { taskId: Id<"tasks"> }) {
  const comments = useQuery(api.comments.listByTask, { taskId });
  const createComment = useMutation(api.comments.create);
  const deleteComment = useMutation(api.comments.remove);

  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Id<"comments"> | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createComment({ taskId, content });
    setContent("");
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !replyTo) return;
    await createComment({ taskId, content: replyContent, parentId: replyTo });
    setReplyContent("");
    setReplyTo(null);
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">
        Comments {comments && comments.length > 0 && `(${comments.reduce((acc: number, c: CommentData) => acc + 1 + c.replies.length, 0)})`}
      </h3>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={content}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="text-sm"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!content.trim()}>
          Post
        </Button>
      </div>

      {comments === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
              <div className="h-12 flex-1 animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No comments yet — be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment._id}>
              <CommentItem
                comment={comment}
                onReply={(parentId: Id<"comments">) => {
                  setReplyTo(replyTo === parentId ? null : parentId);
                  setReplyContent("");
                }}
                onDelete={(id: Id<"comments">) => deleteComment({ id })}
              />

              {comment.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {comment.replies.map((reply: CommentData["replies"][number]) => (
                    <CommentItem
                      key={reply._id}
                      comment={reply}
                      onDelete={(id: Id<"comments">) => deleteComment({ id })}
                      isReply
                    />
                  ))}
                </div>
              )}

              {replyTo === comment._id && (
                <div className="ml-8 mt-2 flex gap-2">
                  <Input
                    placeholder={`Reply to ${comment.authorName}...`}
                    value={replyContent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyContent(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                      if (e.key === "Escape") setReplyTo(null);
                    }}
                    className="text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleReply} disabled={!replyContent.trim()}>
                    Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                    ×
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
