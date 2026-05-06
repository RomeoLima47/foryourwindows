"use client";

import React, { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import type { Id } from "../../convex/_generated/dataModel";

interface FileAttachmentsProps {
  taskId?: Id<"tasks">;
  subtaskId?: Id<"subtasks">;
  workOrderId?: Id<"workOrders">;
  projectId?: Id<"projects">;
  compact?: boolean;
}

export function FileAttachments({ taskId, subtaskId, workOrderId, projectId, compact }: FileAttachmentsProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Pick the right query
  const queryFn = taskId ? api.attachments.listByTask
    : subtaskId ? api.attachments.listBySubtask
    : workOrderId ? api.attachments.listByWorkOrder
    : api.attachments.listByProject;

  const queryArgs = taskId ? { taskId }
    : subtaskId ? { subtaskId: subtaskId! }
    : workOrderId ? { workOrderId: workOrderId! }
    : { projectId: projectId! };

  const attachments = useQuery(queryFn, queryArgs as any);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachment = useMutation(api.attachments.saveAttachment);
  const removeAttachment = useMutation(api.attachments.remove);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await saveAttachment({ storageId, fileName: file.name, fileSize: file.size, fileType: file.type, taskId, subtaskId, workOrderId, projectId });
      toast(`"${file.name}" uploaded`);
    } catch { toast("Upload failed"); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  const getIcon = (t: string) => t.startsWith("image/") ? "🖼️" : t.includes("pdf") ? "📄" : t.includes("spreadsheet") || t.includes("excel") ? "📊" : t.includes("document") || t.includes("word") ? "📝" : "📎";

  if (compact) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach a file">
            {uploading ? "⏳" : "📎"} {uploading ? "Uploading..." : "Attach"}
          </Button>
          {attachments && (attachments as any[]).length > 0 && <span className="text-[10px] text-muted-foreground" title={`${(attachments as any[]).length} file(s)`}>{(attachments as any[]).length} file{(attachments as any[]).length !== 1 ? "s" : ""}</span>}
        </div>
        {attachments && (attachments as any[]).length > 0 && (
          <div className="mt-1 space-y-1">
            {(attachments as any[]).map((att) => (
              <div key={att._id} className="flex items-center justify-between rounded border px-2 py-1 text-[11px]">
                <div className="flex items-center gap-1 truncate">
                  <span>{getIcon(att.fileType)}</span>
                  {att.url ? <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title="Download file">{att.fileName}</a>
                    : <span className="truncate">{att.fileName}</span>}
                  <span className="text-muted-foreground">({fmtSize(att.fileSize)})</span>
                </div>
                <button onClick={() => { removeAttachment({ id: att._id }); toast("Removed"); }} className="ml-1 text-muted-foreground hover:text-red-500" title="Remove file">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Files</p>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload a file">{uploading ? "Uploading..." : "📎 Upload"}</Button>
      </div>
      {!attachments ? <div className="h-8 animate-pulse rounded bg-muted" />
        : (attachments as any[]).length === 0 ? <p className="py-3 text-center text-xs text-muted-foreground">No files attached.</p>
        : (
        <div className="space-y-2">
          {(attachments as any[]).map((att) => (
            <div key={att._id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2 truncate">
                <span>{getIcon(att.fileType)}</span>
                <div className="min-w-0">
                  {att.url ? <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm hover:underline" title="Download file">{att.fileName}</a>
                    : <p className="truncate text-sm">{att.fileName}</p>}
                  <p className="text-xs text-muted-foreground">{fmtSize(att.fileSize)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { removeAttachment({ id: att._id }); toast("Removed"); }} title="Remove file">×</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
