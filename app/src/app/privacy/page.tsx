import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How INeedThis handles your data: files are processed on your device and never uploaded. No accounts, no ads, no analytics.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Short version: your files are processed by your own browser and are never uploaded to us. We don't have accounts, ads, analytics or tracking cookies. The rest of this page explains the few exceptions in plain language."
    >
      <h2>Your files stay on your device</h2>
      <p>
        Almost every tool on INeedThis (PDF, image, video, audio, archive, text and AI tools) runs inside your browser using
        WebAssembly and JavaScript. The files you choose are read and processed on your device and the results are saved straight
        back to it. They are not sent to our servers or to anyone else.
      </p>

      <h2>The exceptions</h2>
      <ul>
        <li>
          <strong>Video downloader.</strong> When you paste a link, that link is sent to our server, which asks third-party
          services (for example cobalt API instances, fxtwitter and tikwm) and the website hosting the video to find a downloadable
          file. The video may then stream through our server to your device. We don&apos;t store the link or the video.
        </li>
        <li>
          <strong>Peer-to-peer transfer.</strong> Files go directly from one browser to the other over an encrypted WebRTC
          connection. To connect, your browser contacts public STUN servers (operated by Google), which see your IP address. If a
          relay (TURN) server is configured it may carry the encrypted data, but cannot read it.
        </li>
        <li>
          <strong>Downloading tool engines.</strong> Some tools download their engine the first time you use them: AI models from
          the Hugging Face CDN, and WebAssembly files from the jsDelivr CDN. These services see your IP address and which file was
          requested, like any website you load. They never receive your files.
        </li>
      </ul>

      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>No accounts, sign-ups or email addresses.</li>
        <li>No advertising, analytics or tracking scripts.</li>
        <li>No selling or sharing of personal data — we don&apos;t have any to sell.</li>
      </ul>

      <h2>Hosting and logs</h2>
      <p>
        The site is hosted on Cloudflare. Like any web host, Cloudflare processes your IP address and request details to deliver
        the site and keep it secure, and keeps short-lived request logs that we use only to fix problems. Requests to the video
        downloader, including the link you pasted, can appear in those logs for a limited time under Cloudflare&apos;s retention
        rules. See{" "}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
          Cloudflare&apos;s privacy policy
        </a>
        .
      </p>

      <h2>Storage on your device</h2>
      <ul>
        <li><strong>Theme</strong> — your light/dark choice is saved in your browser&apos;s local storage.</li>
        <li><strong>Sidebar</strong> — a small functional cookie (<code>sidebar_state</code>) remembers whether the sidebar is collapsed.</li>
        <li>
          <strong>Offline cache</strong> — if your browser supports it, a service worker caches the site and tool engines so they
          load faster and work offline. Clearing your browser data removes all of this.
        </li>
      </ul>
      <p>None of these are used to track you.</p>

      <h2>Children</h2>
      <p>INeedThis is a general-purpose tool and doesn&apos;t knowingly collect information from anyone, including children.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>

      <h2>Contact</h2>
      <p>
        Questions? Reach out on{" "}
        <a href="https://x.com/sumitthq" target="_blank" rel="noopener noreferrer">X (@sumitthq)</a>, via{" "}
        <a href="https://sumitsharma.pro" target="_blank" rel="noopener noreferrer">sumitsharma.pro</a>, or use &quot;Request a feature&quot; in the sidebar.
      </p>
    </LegalPage>
  );
}
