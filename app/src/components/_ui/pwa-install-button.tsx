"use client";

import { useEffect, useState } from "react";
import Button from "@/components/_ui/button";
import { DownloadIcon, CheckCircleIcon, ShareP2PIcon } from "@/components/_ui/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // Check if app is already running standalone / installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

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
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      // Chrome/Edge/Firefox fallback if beforeinstallprompt not yet fired or supported
      alert(
        "To install File Studio on your desktop or phone:\n\n• On Chrome/Edge: Click the install icon (⊕) in the browser address bar.\n• On Mobile: Tap browser menu (⋮) and select 'Install app' or 'Add to Home screen'."
      );
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
            ? "File Studio is running as an installed PWA"
            : "Install File Studio as an app on your PC or Phone"
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

      {/* iOS Safari Home Screen Guide */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold">Install on iPhone / iPad</h3>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3 py-4 text-[13px] text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  1
                </span>
                <span>
                  Tap the <strong className="text-foreground">Share</strong> icon{" "}
                  <ShareP2PIcon className="inline size-4 text-primary" /> in the bottom toolbar of Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="text-foreground">&quot;Add to Home Screen&quot;</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                  3
                </span>
                <span>
                  Tap <strong className="text-foreground">Add</strong> in the top-right corner.
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              className="w-full"
              size="sm"
              onClick={() => setShowIosModal(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
