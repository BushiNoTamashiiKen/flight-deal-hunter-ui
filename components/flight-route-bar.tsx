"use client";

import { cn } from "@/lib/utils";

export function FlightRouteBar({
  airports,
  className,
}: {
  airports: string[];
  className?: string;
}) {
  if (airports.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Routing segments appear after search.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {airports.map((code, i) => (
        <div key={`${code}-${i}`} className="flex items-center gap-1">
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs tracking-wide">
            {code}
          </span>
          {i < airports.length - 1 ? (
            <>
              <span
                className="flex items-center gap-0.5 text-muted-foreground text-[10px]"
                aria-hidden
              >
                <span className="size-1 rounded-full bg-sky-500" />
                <span className="h-px w-6 bg-gradient-to-r from-sky-500/80 to-border" />
              </span>
              <span className="rounded-full bg-amber-400/40 px-1.5 py-0 text-[9px] font-medium text-amber-950 dark:text-amber-100">
                layover
              </span>
              <span className="h-px w-6 bg-gradient-to-r from-border to-sky-500/80" aria-hidden />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
