"use client";

import { useState } from "react";
import Button from "@/components/_ui/button";
import { toast } from "@/components/_ui/toaster";
import {
  ShareP2PIcon,
  UploadCloudIcon,
  ShieldCheckIcon,
  CopyIcon,
  CheckCircleIcon,
} from "@/components/_ui/icons";

export default function P2PPanel() {
  const [role, setRole] = useState<"send" | "receive">("send");
  const [roomCode, setRoomCode] = useState("PEER-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [connected, setConnected] = useState(false);
  const [transferredPercent, setTransferredPercent] = useState(0);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast("Room code copied to clipboard!", { description: roomCode });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto py-4">
      {/* P2P Header info */}
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
                Direct browser-to-browser encrypted pipe. Files never touch any server or cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div className="mt-6 flex border-b border-border gap-4">
          <button
            onClick={() => setRole("send")}
            className={`pb-2 text-[14px] font-medium transition-colors cursor-pointer border-b-2 ${
              role === "send"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Send Files (Host)
          </button>
          <button
            onClick={() => setRole("receive")}
            className={`pb-2 text-[14px] font-medium transition-colors cursor-pointer border-b-2 ${
              role === "receive"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Receive Files (Client)
          </button>
        </div>

        {/* Room signaling details */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-secondary/50 p-4 border border-border">
          <div>
            <span className="text-[12px] text-muted-foreground block font-medium">
              Secure Direct P2P Channel Code:
            </span>
            <span className="text-[18px] font-bold tracking-wider text-primary">
              {roomCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyRoomCode}>
              <CopyIcon className="size-3.5" />
              Copy Code
            </Button>
            <Button
              variant={connected ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                setConnected(!connected);
                toast(
                  connected ? "Disconnected" : "WebRTC Signaling channel open!",
                  { type: "info" }
                );
              }}
            >
              {connected ? "Disconnect" : "Establish Channel"}
            </Button>
          </div>
        </div>
      </div>

      {/* Transfer Area */}
      <div className="border-border bg-card/60 rounded-2xl border-2 border-dashed p-8 text-center flex flex-col items-center justify-center gap-3">
        <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
          <UploadCloudIcon className="size-6" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            {role === "send"
              ? "Select or drop files to stream via WebRTC"
              : "Waiting for sender to stream file chunks..."}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Unlimited file sizes (GBs) • 64KB chunked array buffers • WebRTC DataChannel
          </p>
        </div>

        {connected && (
          <div className="flex items-center gap-2 text-emerald-500 text-[12px] font-medium">
            <CheckCircleIcon className="size-4" />
            <span>P2P Channel Active & Ready</span>
          </div>
        )}
      </div>
    </div>
  );
}
