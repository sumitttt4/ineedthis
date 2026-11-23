"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Button from "@/components/_ui/button";
import Dialog from "@/components/_ui/dialog";
import { DownloadIcon, CheckCircleIcon, ShareP2PIcon } from "@/components/_ui/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const noopSubscribe = () => () => {};

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIos(): boolean {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const standalone = useSyncExternalStore(noopSubscribe, detectStandalone, () => false);
  const isIos = useSyncExternalStore(noopSubscribe, detectIos, () => false);
  const [installedNow, setIsInstalled] = useState(false);
  const isInstalled = standalone || installedNow;
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    if (detectStandalone()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowIosModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
          isInstalled
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
            : "border-border bg-secondary/80 text-foreground hover:bg-secondary hover:text-primary hover:border-primary/40"
        }`}
        title={
          isInstalled
            ? "INeedThis is installed on this device"
            : "Install INeedThis as an app"
        }
      >
        {isInstalled ? (
          <>
            <CheckCircleIcon className="size-3.5 text-emerald-400" />
            <span>Installed</span>
          </>
        ) : (
          <>
            <DownloadIcon className="size-3.5 text-muted-foreground" />
            <span>Install App</span>
          </>
        )}
      </button>

      <Dialog
        open={showIosModal}
        onClose={() => setShowIosModal(false)}
        title={isIos ? "Install on iPhone or iPad" : "Install INeedThis"}
        description="Get a one-click app icon. Your files still never leave the device."
        maxWidth="sm:max-w-[400px]"
        footer={
          <Button variant="primary" size="sm" data-autofocus onClick={() => setShowIosModal(false)}>
            Got it
          </Button>
        }
      >
        {isIos ? (
              <ol className="flex flex-col gap-3 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">1</span>
                  <span>Tap the <strong className="text-foreground">Share</strong> icon{" "}<ShareP2PIcon className="inline size-4 text-primary" aria-hidden="true" /> in Safari’s toolbar.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">2</span>
                  <span>Scroll and choose <strong className="text-foreground">Add to Home Screen</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">3</span>
                  <span>Tap <strong className="text-foreground">Add</strong> in the top-right corner.</span>
                </li>
              </ol>
        ) : (
              <ol className="flex flex-col gap-3 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">1</span>
                  <span>Look for the install icon in the address bar (Chrome, Edge) and click it.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">2</span>
                  <span>On Android, open the browser menu and choose <strong className="text-foreground">Install app</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">3</span>
                  <span>Launch it from your apps. Tools keep working offline once loaded.</span>
                </li>
              </ol>
        )}
      </Dialog>
    </>
  );
}
