"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/_ui/button";
import { toast } from "@/components/_ui/toaster";
import {
  ShareP2PIcon,
  UploadCloudIcon,
  CopyIcon,
  CheckCircleIcon,
} from "@/components/_ui/icons";
import { P2PTransfer } from "@/engines/data/data-engine";
import { formatBytes } from "@/lib/utils";

export default function P2PPanel() {
  const [role, setRole] = useState<"send" | "receive">("send");
  const [connected, setConnected] = useState(false);
  const [transferredPercent, setTransferredPercent] = useState(0);
  const [localSignal, setLocalSignal] = useState("");
  const [remoteSignal, setRemoteSignal] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Idle — pick a role to start");
  const [busy, setBusy] = useState(false);
  const transferRef = useRef<P2PTransfer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      transferRef.current?.close();
      transferRef.current = null;
    };
  }, []);

  const resetTransfer = () => {
    transferRef.current?.close();
    transferRef.current = null;
    setConnected(false);
    setTransferredPercent(0);
    setLocalSignal("");
    setBusy(false);
  };

  const createTransfer = () => {
    resetTransfer();
    const transfer = new P2PTransfer({
      onConnected: () => {
        setConnected(true);
        setStatus("P2P channel open");
        toast("WebRTC channel connected", { type: "success" });
      },
      onProgress: (percent) => {
        setTransferredPercent(percent);
        setStatus(`Transferring… ${percent}%`);
      },
      onComplete: (blob, filename) => {
        setTransferredPercent(100);
        setStatus(`Received ${filename}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast(`Downloaded ${filename}`, { type: "success" });
      },
      onError: (err) => {
        setStatus(err.message);
        toast("P2P error", { description: err.message, type: "error" });
        setBusy(false);
      },
      onOffer: (sdp) => {
        setLocalSignal(sdp);
      },
    });
    transferRef.current = transfer;
    return transfer;
  };

  const copyText = async (text: string, label: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast(`${label} copied`, { type: "success" });
  };

  const startSendOffer = async () => {
    if (!selectedFile) {
      toast("Select a file to send first", { type: "info" });
      return;
    }
    setBusy(true);
    setStatus("Creating offer & gathering ICE…");
    try {
      const transfer = createTransfer();
      const offer = await transfer.createOffer(selectedFile);
      setLocalSignal(offer);
      setStatus("Offer ready — send it to the receiver, then paste their answer");
      toast("Offer ready to share", { type: "success" });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to create offer");
      toast("Could not create offer", {
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const applyRemoteAnswer = async () => {
    if (!transferRef.current || !remoteSignal.trim()) {
      toast("Paste the receiver answer first", { type: "info" });
      return;
    }
    setBusy(true);
    try {
      await transferRef.current.applyAnswer(remoteSignal.trim());
      setStatus("Answer applied — waiting for data channel…");
      toast("Answer applied", { type: "success" });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Invalid answer SDP");
      toast("Invalid answer", {
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const acceptRemoteOffer = async () => {
    if (!remoteSignal.trim()) {
      toast("Paste the sender offer first", { type: "info" });
      return;
    }
    setBusy(true);
    setStatus("Accepting offer & creating answer…");
    try {
      const transfer = createTransfer();
      const answer = await transfer.acceptOffer(remoteSignal.trim());
      setLocalSignal(answer);
      setStatus("Answer ready — send it back to the sender");
      toast("Answer ready to share", { type: "success" });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to accept offer");
      toast("Could not accept offer", {
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto py-4">
      <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <ShareP2PIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-foreground">
                  Direct WebRTC P2P File Transfer
                </h2>
                <span className="bg-secondary text-foreground border border-border rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                  Serverless
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-[13px]">
                Manual SDP exchange — files stream browser-to-browser. Only public STUN is used for NAT traversal.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex border-b border-border gap-4">
          <button
            type="button"
            onClick={() => {
              resetTransfer();
              setRole("send");
              setRemoteSignal("");
              setStatus("Send mode — pick a file and create an offer");
            }}
            className={`pb-2 text-[14px] font-medium transition-colors cursor-pointer border-b-2 ${
              role === "send"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Send Files (Host)
          </button>
          <button
            type="button"
            onClick={() => {
              resetTransfer();
              setRole("receive");
              setSelectedFile(null);
              setRemoteSignal("");
              setStatus("Receive mode — paste the sender offer");
            }}
            className={`pb-2 text-[14px] font-medium transition-colors cursor-pointer border-b-2 ${
              role === "receive"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Receive Files (Client)
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-secondary/50 p-4 border border-border">
          <p className="text-[12px] text-muted-foreground font-medium">Status</p>
          <p className="text-[14px] font-semibold text-foreground mt-1">{status}</p>
          {(connected || transferredPercent > 0) && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.max(connected ? 4 : 0, transferredPercent)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-emerald-500 text-[12px] font-medium">
                {connected && <CheckCircleIcon className="size-4" />}
                <span>
                  {connected ? "Channel active" : "Connecting…"}
                  {transferredPercent > 0 ? ` · ${transferredPercent}%` : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {role === "send" ? (
        <div className="border-border bg-card/60 rounded-2xl border-2 border-dashed p-8 text-center flex flex-col items-center justify-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedFile(file);
              if (file) setStatus(`Ready to offer ${file.name}`);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
              <UploadCloudIcon className="size-6" />
            </div>
            <p className="text-[15px] font-semibold text-foreground">
              {selectedFile
                ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                : "Select a file to stream via WebRTC"}
            </p>
          </button>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button variant="primary" size="sm" disabled={busy || !selectedFile} onClick={startSendOffer}>
              Create Offer
            </Button>
            <Button variant="secondary" size="sm" disabled={busy || !remoteSignal.trim()} onClick={applyRemoteAnswer}>
              Apply Answer
            </Button>
            <Button variant="ghost" size="sm" onClick={resetTransfer}>
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-border bg-card/60 rounded-2xl border-2 border-dashed p-8 text-center flex flex-col items-center justify-center gap-3">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
            <UploadCloudIcon className="size-6" />
          </div>
          <p className="text-[15px] font-semibold text-foreground">
            Paste the sender offer, then share your answer back
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button variant="primary" size="sm" disabled={busy || !remoteSignal.trim()} onClick={acceptRemoteOffer}>
              Accept Offer & Create Answer
            </Button>
            <Button variant="ghost" size="sm" onClick={resetTransfer}>
              Reset
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-border bg-card rounded-2xl border p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[13px] font-medium">
              {role === "send" ? "Your offer (send this)" : "Your answer (send this)"}
            </label>
            <Button
              variant="secondary"
              size="sm"
              disabled={!localSignal}
              onClick={() => copyText(localSignal, role === "send" ? "Offer" : "Answer")}
            >
              <CopyIcon className="size-3.5" />
              Copy
            </Button>
          </div>
          <textarea
            value={localSignal}
            readOnly
            rows={8}
            className="border-input bg-background rounded-lg border px-3 py-2 text-[11px] font-mono outline-none resize-y min-h-32"
            placeholder="SDP will appear here after you create an offer or answer"
          />
        </div>

        <div className="border-border bg-card rounded-2xl border p-4 flex flex-col gap-2">
          <label className="text-[13px] font-medium">
            {role === "send" ? "Paste receiver answer" : "Paste sender offer"}
          </label>
          <textarea
            value={remoteSignal}
            onChange={(e) => setRemoteSignal(e.target.value)}
            rows={8}
            className="border-input bg-background rounded-lg border px-3 py-2 text-[11px] font-mono outline-none focus:ring-2 focus:ring-primary/50 resize-y min-h-32"
            placeholder="Paste the remote SDP JSON here"
          />
        </div>
      </div>
    </div>
  );
}
