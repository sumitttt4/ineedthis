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
  CpuIcon,
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/10 shadow-lg scale-[1.01]"
            : "border-border bg-card/80 hover:bg-secondary/60 hover:border-border/90 shadow-sm"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl border border-primary/20">
          <UploadCloudIcon className="size-6" />
        </div>

        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">
            Drop any file to convert, compress, or edit
          </h2>
          <p className="text-muted-foreground mt-1 text-[13px] max-w-lg mx-auto">
            PDFs, Word documents, spreadsheets, images, videos, audio, and archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheckIcon className="size-3.5 text-emerald-500" />
            Local processing for file tools
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1">
            <CpuIcon className="size-3.5 text-blue-500" />
            Runs in your browser
          </span>
          <span className="opacity-40">•</span>
          <span>Video download is server-assisted</span>
        </div>
      </div>

      {inspectedFile && (
        <div className="border-border bg-secondary/60 rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-[11px] font-bold uppercase shrink-0">
              {inspectedFile.extension.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">
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

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
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
