"use client";

import { CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WORKFLOW_STEPS } from "@/lib/workflow";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

export type StepPhase = "pending" | "running" | "done";

export function RunView({
  stepPhase,
  logs,
}: {
  stepPhase: Record<number, StepPhase>;
  logs: string[];
}) {
  const isSmallScreen = useMediaQuery("(max-width: 639px)");
  const [logsOpen, setLogsOpen] = React.useState(false);

  React.useEffect(() => {
    if (isSmallScreen === false) setLogsOpen(true);
    if (isSmallScreen === true) setLogsOpen(false);
  }, [isSmallScreen]);

  const showLogPanel = isSmallScreen !== true || logsOpen;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
      <div>
        <h2 className="font-semibold text-2xl tracking-tight">Hunting…</h2>
        <p className="text-muted-foreground text-sm">
          Live Trip Hunt Progress checklist — mirrors the Flight Deal Hunter workflow.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Hunt Progress</CardTitle>
          <CardDescription>
            Steps animate pending → in-progress → done as the agent advances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WORKFLOW_STEPS.map((s) => {
            const phase = stepPhase[s.id] ?? "pending";
            return (
              <div
                key={s.id}
                className={cn(
                  "flex min-h-[48px] items-start gap-3 rounded-xl border px-3 py-3 transition-colors duration-300 sm:py-2.5",
                  phase === "running" &&
                    "animate-skyflint-step-pulse border-sky-500/40 bg-sky-500/10 shadow-sm",
                  phase === "done" && "border-emerald-500/30 bg-emerald-500/5",
                  phase === "pending" && "border-border bg-muted/30"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {phase === "done" ? (
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  ) : phase === "running" ? (
                    <Loader2 className="size-5 animate-spin text-sky-600 dark:text-sky-400" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground/70" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm leading-snug">
                    <span className="text-muted-foreground">{s.id}. </span>
                    {s.label}
                  </p>
                  {phase === "running" ? (
                    <p className="mt-1 text-sky-700 text-xs dark:text-sky-300">Working…</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">Agent stream</CardTitle>
            <CardDescription>Intermediate reasoning, tools, and citations land here.</CardDescription>
          </div>
          {isSmallScreen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0 gap-1"
              aria-expanded={logsOpen}
              onClick={() => setLogsOpen((o) => !o)}
            >
              {logsOpen ? (
                <>
                  Hide details <ChevronUp className="size-4" aria-hidden />
                </>
              ) : (
                <>
                  Show details <ChevronDown className="size-4" aria-hidden />
                </>
              )}
            </Button>
          ) : null}
        </CardHeader>
        {showLogPanel ? (
          <CardContent>
            <div className="max-h-[min(420px,50dvh)] overflow-y-auto overscroll-y-contain rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-[85%]" />
                  <Skeleton className="h-3 w-[70%]" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ) : (
                logs.map((line, i) => (
                  <p key={`${i}-${line.slice(0, 24)}`} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
