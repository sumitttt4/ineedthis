import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap font-medium tracking-[-0.02em] outline-none transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-power2-out focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rounded-[10px] bg-primary text-primary-foreground shadow-[0px_4px_10px_0px_rgba(37,117,255,0.28),0px_0px_0px_1px_rgba(0,0,0,0.2),inset_0px_1px_1px_0px_rgba(255,255,255,0.22)] hover:opacity-95 hover:shadow-[0px_6px_14px_0px_rgba(37,117,255,0.36)]",
        secondary:
          "rounded-[10px] bg-card text-foreground border border-border shadow-control hover:bg-secondary hover:text-foreground data-[active=true]:bg-secondary data-[active=true]:border-primary/40",
        muted:
          "rounded-[10px] bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground",
        ghost:
          "rounded-lg text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground data-[active=true]:bg-foreground/[0.08] data-[active=true]:text-foreground",
        chip: "rounded-full bg-card text-muted-foreground border border-border shadow-ring hover:text-foreground hover:border-subtle data-[active=true]:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:border-primary",
        danger:
          "rounded-[10px] bg-destructive text-white hover:opacity-90 shadow-sm",
        nav: "w-full justify-start rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm data-[active=true]:font-semibold",
      },
      size: {
        xs: "h-6 px-2 text-[12px] rounded-md",
        sm: "h-7 px-2.5 text-[13px]",
        md: "h-8 px-3 text-[14px]",
        lg: "h-10 px-4 text-[14px]",
        icon: "size-8 p-0 rounded-lg",
        "icon-sm": "size-7 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "sm",
    },
  }
);

export type ButtonProps = VariantProps<typeof buttonVariants> &
  ComponentProps<"button"> & {
    href?: ComponentProps<typeof Link>["href"];
  };

export default function Button({
  variant,
  size,
  className,
  href,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(props as Omit<ComponentProps<typeof Link>, "href" | "className">)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
