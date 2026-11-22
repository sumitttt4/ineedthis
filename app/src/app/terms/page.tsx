import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using INeedThis: free file tools provided as-is.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="INeedThis is a free set of file tools. By using the site you agree to these terms. They're short on purpose."
    >
      <h2>Using the tools</h2>
      <ul>
        <li>The tools are free to use for personal and commercial work, with no account needed.</li>
        <li>You&apos;re responsible for the files you process and for having the right to use them.</li>
        <li>
          Don&apos;t use the site to break the law, to infringe anyone&apos;s rights, or to disrupt the service (for example by
          automated mass requests to the video downloader).
        </li>
      </ul>

      <h2>Video downloader</h2>
      <p>
        Only download videos you own or have permission to download, and follow the terms of the website the video comes from.
        The downloader relies on third-party services that can change or stop working at any time.
      </p>

      <h2>No warranty</h2>
      <p>
        The site and tools are provided <strong>&quot;as is&quot;</strong>, without warranties of any kind. We work hard to make
        conversions accurate, but we can&apos;t guarantee that every result is perfect or that the site is always available.
        Keep your original files and check important results before relying on them.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, we are not liable for any loss of data, profits or other damages arising from your use of the
        site or tools. Because processing happens on your own device, we never hold copies of your files and can&apos;t recover
        them.
      </p>

      <h2>Ownership</h2>
      <p>
        The tools are free to use, but INeedThis itself — its code, design, name and logo — belongs to Sumit Sharma, all rights
        reserved. Please don&apos;t copy, resell or republish the site or its code. Your files and the results you create are
        yours. Third-party components keep their own licenses, listed on the <Link href="/about">About page</Link>.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version; continuing to use the site means you accept it.</p>

      <h2>Contact</h2>
      <p>
        Reach out on <a href="https://x.com/sumitthq" target="_blank" rel="noopener noreferrer">X (@sumitthq)</a> or via{" "}
        <a href="https://sumitsharma.pro" target="_blank" rel="noopener noreferrer">sumitsharma.pro</a>.
      </p>
    </LegalPage>
  );
}
