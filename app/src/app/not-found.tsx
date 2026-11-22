import Image from "next/image";
import Link from "next/link";
import GrainBackdrop from "@/components/shaders/grain-backdrop";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-5 overflow-hidden bg-background px-6 text-center">
      <GrainBackdrop />
      <Image src="/icon.svg" alt="" width={48} height={48} unoptimized className="size-12 rounded-xl" />
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium tabular-nums text-muted-foreground">404</p>
        <h1 className="text-balance text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[34px]">
          There&apos;s no tool here
        </h1>
        <p className="mx-auto max-w-sm text-[14px] text-muted-foreground">
          The page you were looking for doesn&apos;t exist. All 54 tools are one click away.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-semibold text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Back to all tools
      </Link>
    </main>
  );
}
