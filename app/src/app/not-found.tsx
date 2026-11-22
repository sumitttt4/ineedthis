import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-[13px] font-medium tabular-nums text-muted-foreground">404</p>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
        There&apos;s no tool here
      </h1>
      <Link
        href="/"
        className="rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground"
      >
        Back to all tools
      </Link>
    </main>
  );
}
