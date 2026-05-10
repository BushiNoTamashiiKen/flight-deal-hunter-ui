"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";

function IconWell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-[1.05rem]",
        className
      )}
    >
      {children}
    </span>
  );
}

const toastShell =
  "relative flex w-full max-w-[min(356px,calc(100vw-2rem))] items-start gap-3 rounded-[1.25rem] border p-4 pr-11 text-sm shadow-dashboard-lg ring-1 ring-black/[0.04] backdrop-blur-[2px] dark:ring-white/[0.06] sm:rounded-[1.35rem] sm:p-[1.125rem] sm:pr-12";

const skyflintToastClassNames = {
  toast: cn(toastShell, "border-accent/30 bg-card text-card-foreground"),
  default: "border-border/75",
  success:
    "border-primary/45 bg-card shadow-[0_0_0_1px_rgb(223_255_0/0.14)] dark:border-primary/35 dark:shadow-[0_0_0_1px_rgb(223_255_0/0.08)]",
  error: "border-destructive/45 bg-card dark:border-destructive/40",
  warning: "border-amber-500/45 bg-card dark:border-amber-400/35",
  info: "border-accent/55 bg-card dark:border-accent/45",
  loading: "border-accent/45 bg-card dark:border-accent/40",
  title:
    "font-semibold text-[0.9375rem] leading-snug tracking-tight text-foreground sm:text-[0.96875rem]",
  description: "text-muted-foreground text-xs leading-relaxed sm:text-[0.8125rem]",
  icon: "mt-0.5 shrink-0",
  content: "min-w-0 flex-1 gap-1 !gap-1 pr-0",
  closeButton:
    "absolute top-3 right-3 z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/75 bg-background/95 text-muted-foreground shadow-sm transition-colors duration-300 ease-spring hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/12 dark:bg-card/95",
  actionButton:
    "rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs shadow-dashboard hover:bg-primary/90",
  cancelButton:
    "rounded-full border border-border/80 bg-muted/70 px-3 py-1.5 font-medium text-muted-foreground text-xs hover:bg-muted",
};

const Toaster = ({ toastOptions, className, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      {...props}
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster group font-sans", className)}
      richColors={false}
      closeButton
      position="top-center"
      icons={{
        success: (
          <IconWell className="bg-primary/25 text-primary-foreground dark:bg-primary/28">
            <CircleCheckIcon aria-hidden />
          </IconWell>
        ),
        info: (
          <IconWell className="bg-accent/40 text-accent-foreground dark:bg-accent/35">
            <InfoIcon aria-hidden />
          </IconWell>
        ),
        warning: (
          <IconWell className="bg-amber-500/18 text-amber-800 dark:bg-amber-400/22 dark:text-amber-200">
            <TriangleAlertIcon aria-hidden />
          </IconWell>
        ),
        error: (
          <IconWell className="bg-destructive/12 text-destructive dark:bg-destructive/22">
            <OctagonXIcon aria-hidden />
          </IconWell>
        ),
        loading: (
          <IconWell className="bg-accent/35 text-accent-foreground">
            <Loader2Icon className="animate-spin" aria-hidden />
          </IconWell>
        ),
      }}
      toastOptions={{
        unstyled: true,
        duration: 4800,
        ...toastOptions,
        classNames: {
          ...skyflintToastClassNames,
          ...toastOptions?.classNames,
        },
      }}
    />
  );
};

export { Toaster };
