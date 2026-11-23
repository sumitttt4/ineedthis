"use client";

import { useState, type ReactNode } from "react";
import Dialog from "@/components/_ui/dialog";
import Button from "@/components/_ui/button";
import { TOOLS } from "@/components/tools/tools-registry";
import { OWNER_X_HANDLE, REQUEST_EMAIL } from "@/lib/site";

/** Button + dialog that lets people send a feature request straight to the maker. */
export default function FeatureRequest({
  trigger,
  defaultTool = "",
}: {
  trigger: (open: () => void) => ReactNode;
  defaultTool?: string;
}) {
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState(defaultTool);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");

  const toolName = TOOLS.find((t) => t.id === tool)?.name;
  const message = [
    "Feature request for INeedThis",
    toolName ? `Tool: ${toolName}` : "",
    "",
    idea.trim(),
    reply.trim() ? `\nReply to: ${reply.trim()}` : "",
  ]
    .filter((l, i) => l !== "" || i === 2)
    .join("\n");
  const ready = idea.trim().length >= 4;

  const viaEmail = () => {
    const subject = `Feature request${toolName ? `: ${toolName}` : ""}`;
    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    setNote("Your email app should open with the request filled in.");
  };

  const viaX = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setNote(`Copied. Paste it into a DM to @${OWNER_X_HANDLE}.`);
    } catch {
      setNote(`Open @${OWNER_X_HANDLE} on X and send the request as a DM.`);
    }
    window.open(`https://x.com/${OWNER_X_HANDLE}`, "_blank", "noopener,noreferrer");
  };

  const field =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <>
      {trigger(() => {
        setNote("");
        setOpen(true);
      })}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Request a feature"
        description="Missing a tool, or something not working the way you'd like? Tell me, I read every request."
        maxWidth="sm:max-w-[520px]"
        footer={
          <>
            {REQUEST_EMAIL && (
              <Button variant="primary" onClick={viaEmail} disabled={!ready}>
                Send by email
              </Button>
            )}
            <Button variant={REQUEST_EMAIL ? "secondary" : "primary"} onClick={viaX} disabled={!ready}>
              Send on X
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            What should I add or improve?
            <textarea
              data-autofocus
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={5}
              maxLength={1500}
              placeholder="e.g. Convert PDF to Excel, or let me pick the page size in Images to PDF"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            <span>
              Related tool <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <select value={tool} onChange={(e) => setTool(e.target.value)} className={`${field} h-10 py-0`}>
              <option value="">A new tool / general</option>
              {TOOLS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            <span>
              Where can I reply? <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Email or @handle" className={`${field} h-10`} />
          </label>
          {note && (
            <p role="status" className="rounded-lg bg-secondary px-3 py-2 text-[13px] text-foreground">
              {note}
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
