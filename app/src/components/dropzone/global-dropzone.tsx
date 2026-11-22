"use client";

import { useState, useRef } from "react";
import {
  inspectFile,
  fileCategoryToToolCategory,
} from "@/lib/file-router";
import type { InspectedFile } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import Button from "@/components/_ui/button";
import {
  UploadCloudIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from "@/components/_ui/icons";
import { TOOLS, type ToolDefinition } from "@/components/tools/tools-registry";

export interface GlobalDropzoneProps {
  onSelectToolWithFile: (tool: ToolDefinition, file: File) => void;
}

export default function GlobalDropzone({
  onSelectToolWithFile,
}: GlobalDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inspectedFile, setInspectedFile] = useState<InspectedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Moving across child nodes fires dragleave; only reset when truly leaving.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    try {
      const inspected = await inspectFile(file);
      setInspectedFile(inspected);
    } catch {
      // Fallback: still show generic hash tool
      setInspectedFile({
        file,
        mimeType: file.type || "application/octet-stream",
        category: "unknown",
        extension: file.name.split(".").pop()?.toLowerCase() || "bin",
        actions: ["file-hash"],
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const matchingTools: ToolDefinition[] = (() => {
    if (!inspectedFile) return [];
    const byAction = inspectedFile.actions
      .map((id) => TOOLS.find((t) => t.id === id))
      .filter((t): t is ToolDefinition => Boolean(t));
    if (byAction.length > 0) return byAction;

    const toolCats = new Set(fileCategoryToToolCategory(inspectedFile.category));
    return TOOLS.filter(
      (t) =>
        toolCats.has(t.category) ||
        t.formats.some(
          (fmt) => fmt.toLowerCase() === inspectedFile.extension.toLowerCase()
        )
    );
  })();

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a file, or drop one here"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        data-dragging={isDragging || undefined}
        className="group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card p-7 text-center shadow-card outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 ease-power2-out focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99] data-[dragging]:scale-[1.01] data-[dragging]:border-primary data-[dragging]:bg-primary/5 data-[dragging]:shadow-card-lift sm:p-9 [@media(hover:hover)]:hover:border-primary/50"
      >
        <input
          ref={fileInputRef}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-transform duration-200 ease-power2-out group-data-[dragging]:-translate-y-0.5">
          <UploadCloudIcon className="size-6" aria-hidden="true" />
        </div>

        <div>
          <p className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">
            {isDragging ? "Release to inspect" : "Drop a file, or click to browse"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            PDF, Word, Excel, images, HEIC, video, audio and ZIP. We suggest the right tool.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <ShieldCheckIcon className="size-3.5 text-success" aria-hidden="true" />
          Processed locally, never uploaded
        </span>
      </div>

      {inspectedFile && (
        <div role="status" className="animate-in flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-[11px] font-bold uppercase shrink-0">
              {inspectedFile.extension.slice(0, 4)}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[14px] font-semibold text-foreground" title={inspectedFile.file.name}>
                  {inspectedFile.file.name}
                </span>
                <span className="bg-secondary text-foreground border border-border rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {inspectedFile.category}
                </span>
              </div>
              <p className="text-muted-foreground text-[12px] mt-0.5">
                {inspectedFile.mimeType} • {formatBytes(inspectedFile.file.size)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground mr-1">
              Actions:
            </span>
            {matchingTools.slice(0, 4).map((tool) => (
              <Button
                key={tool.id}
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectToolWithFile(tool, inspectedFile.file);
                }}
              >
                {tool.name}
                <ChevronRightIcon className="size-3" />
              </Button>
            ))}
            {matchingTools.length === 0 && (
              <span className="text-[12px] text-muted-foreground">No matching tools</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
