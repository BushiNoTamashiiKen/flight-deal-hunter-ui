"use client";

import * as React from "react";
import {
  Loader2,
  Moon,
  MoreHorizontal,
  Search as SearchIcon,
  Sun,
  Trophy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { IntakeForm } from "@/components/intake-form";
import { ReportView } from "@/components/report-view";
import { RunView, type StepPhase } from "@/components/run-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IntakeValues } from "@/lib/intake-schema";
import { defaultIntakeValues } from "@/lib/intake-schema";
import { parseRankedReport } from "@/lib/parse-report";
import type { HuntStreamEvent } from "@/lib/stream-events";
import { WORKFLOW_STEPS } from "@/lib/workflow";

function emptyStepPhase(): Record<number, StepPhase> {
  return Object.fromEntries(
    WORKFLOW_STEPS.map((s) => [s.id, "pending" as StepPhase])
  ) as Record<number, StepPhase>;
}

export function SkyflintApp() {
  const [tab, setTab] = React.useState<"intake" | "run" | "report">("intake");
  const [lastIntake, setLastIntake] = React.useState<IntakeValues>(defaultIntakeValues);
  const [formKey, setFormKey] = React.useState(0);
  const [stepPhase, setStepPhase] = React.useState<Record<number, StepPhase>>(emptyStepPhase);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [reportMd, setReportMd] = React.useState<string | null>(null);
  const [checklistState, setChecklistState] = React.useState<boolean[]>([]);
  const [runStarted, setRunStarted] = React.useState(false);
  const [huntBusy, setHuntBusy] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const parsed = React.useMemo(() => {
    if (!reportMd) {
      return parseRankedReport("");
    }
    return parseRankedReport(reportMd);
  }, [reportMd]);

  React.useEffect(() => {
    if (!reportMd) return;
    const next = parseRankedReport(reportMd);
    setChecklistState(next.checklist.map((c) => c.done));
  }, [reportMd]);

  const handleStream = React.useCallback(async (values: IntakeValues) => {
    setLastIntake(values);
    setRunStarted(true);
    setReportMd(null);
    setLogs([]);
    setStepPhase(emptyStepPhase());
    setTab("run");
    setHuntBusy(true);

    try {
      let res: Response;
      try {
        res = await fetch("/api/hunt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      } catch {
        toast.error("Network error starting hunt.");
        setTab("intake");
        return;
      }

      if (!res.ok) {
        let msg = `Hunt failed to start (${res.status}).`;
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          try {
            const payload = (await res.json()) as { error?: string };
            if (typeof payload?.error === "string" && payload.error.length > 0) {
              msg =
                payload.error.length > 320
                  ? `${payload.error.slice(0, 317)}…`
                  : payload.error;
            }
          } catch {
            /* ignore */
          }
        }
        toast.error(msg);
        setTab("intake");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        toast.error("No response stream.");
        setTab("intake");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let evt: HuntStreamEvent;
            try {
              evt = JSON.parse(trimmed) as HuntStreamEvent;
            } catch {
              setLogs((prev) => [...prev, trimmed]);
              continue;
            }

            if (evt.type === "log") {
              setLogs((prev) => [...prev, evt.text]);
            } else if (evt.type === "step") {
              setStepPhase((prev) => {
                const next = { ...prev };
                if (evt.status === "running") {
                  next[evt.step] = "running";
                } else if (evt.status === "done") {
                  next[evt.step] = "done";
                }
                return next;
              });
            } else if (evt.type === "report") {
              setReportMd(evt.markdown);
              setTab("report");
              toast.success("Ranked report ready.");
            } else if (evt.type === "error") {
              toast.error(evt.message);
            }
          }

          if (done) break;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Stream interrupted.");
      } finally {
        reader.releaseLock();
      }
    } finally {
      setHuntBusy(false);
    }
  }, []);

  const handleRerun = React.useCallback(() => {
    setFormKey((k) => k + 1);
    setTab("intake");
    setReportMd(null);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 px-5 pb-4 pt-8 sm:px-10 lg:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex items-center gap-4 rounded-[2rem] bg-primary px-6 py-5 shadow-dashboard-lg sm:gap-5 sm:rounded-[2.25rem] sm:px-8 sm:py-6">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/45 font-bold text-xl text-primary-foreground shadow-inner backdrop-blur-sm dark:bg-black/25 sm:size-14 sm:text-2xl"
              aria-hidden
            >
              S
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-xl leading-tight tracking-tight text-primary-foreground sm:text-2xl">
                Hi, Jann
              </p>
              <p className="mt-1.5 truncate text-primary-foreground/90 text-sm leading-relaxed sm:text-base">
                Trip hunt ready · 8 workflow steps
              </p>
            </div>
            <button
              type="button"
              className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-dashboard transition-colors duration-300 ease-spring hover:bg-accent/90 sm:inline-flex"
              aria-label="More options"
            >
              <MoreHorizontal className="size-5" />
            </button>
            <div className="hidden sm:block">
              <ThemeToggleButton mounted={mounted} resolvedTheme={resolvedTheme} setTheme={setTheme} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-10 sm:pb-12 sm:pt-8 lg:px-12">
        <Tabs
          value={tab}
          onValueChange={(v: string) => setTab(v as typeof tab)}
          className="gap-10 sm:gap-14"
        >
          <TabsList className="hidden h-auto w-full grid-cols-3 gap-2 rounded-[1.75rem] bg-muted/90 p-2 shadow-dashboard sm:grid">
            <TabsTrigger
              value="intake"
              className="rounded-2xl py-3.5 font-medium text-sm data-[active]:bg-accent data-[active]:text-accent-foreground data-[active]:shadow-dashboard"
            >
              New search
            </TabsTrigger>
            <TabsTrigger
              value="run"
              disabled={!runStarted}
              className="rounded-2xl py-3.5 font-medium text-sm data-[active]:bg-accent data-[active]:text-accent-foreground data-[active]:shadow-dashboard"
            >
              Hunting…
            </TabsTrigger>
            <TabsTrigger
              value="report"
              disabled={!reportMd}
              className="rounded-2xl py-3.5 font-medium text-sm data-[active]:bg-accent data-[active]:text-accent-foreground data-[active]:shadow-dashboard"
            >
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intake" className="focus-visible:outline-none">
            <IntakeForm
              key={formKey}
              initialValues={lastIntake}
              onSubmit={handleStream}
              huntBusy={huntBusy}
            />
          </TabsContent>

          <TabsContent value="run" className="focus-visible:outline-none">
            <RunView stepPhase={stepPhase} logs={logs} />
          </TabsContent>

          <TabsContent value="report" className="focus-visible:outline-none">
            {reportMd ? (
              <ReportView
                parsed={parsed}
                checklistState={checklistState}
                onChecklistChange={setChecklistState}
                onRerun={handleRerun}
              />
            ) : (
              <p className="text-muted-foreground text-sm">Run a search to see results.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer
        role="contentinfo"
        className="mx-auto mt-auto w-full max-w-5xl border-border/40 border-t px-5 py-6 pb-[calc(4.75rem+env(safe-area-inset-bottom))] text-center sm:px-10 sm:pb-8 lg:px-12"
      >
        <p className="text-[11px] text-muted-foreground/75 leading-relaxed tracking-wide sm:text-xs">
          © 2026 · Designed with love by Thabo
        </p>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around gap-1 border-t border-accent/35 bg-card/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgb(15_23_42/0.08)] backdrop-blur-md sm:hidden dark:border-accent/40"
        aria-label="Primary navigation"
      >
        <MobileNavItem
          active={tab === "intake"}
          icon={<SearchIcon className="size-5" aria-hidden />}
          label="Search"
          onClick={() => setTab("intake")}
        />
        <MobileNavItem
          active={tab === "run"}
          icon={
            <Loader2
              className={`size-5 ${huntBusy && tab === "run" ? "animate-spin" : ""}`}
              aria-hidden
            />
          }
          label="Hunting"
          disabled={!runStarted}
          onClick={() => runStarted && setTab("run")}
        />
        <MobileNavItem
          active={tab === "report"}
          icon={<Trophy className="size-5" aria-hidden />}
          label="Results"
          disabled={!reportMd}
          onClick={() => reportMd && setTab("report")}
        />
        <ThemeToggleButton mounted={mounted} resolvedTheme={resolvedTheme} setTheme={setTheme} nav />
      </nav>
    </div>
  );
}

function MobileNavItem({
  active,
  icon,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-12 min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors duration-300 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? "bg-accent/45 font-semibold text-accent-foreground"
          : "text-muted-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ThemeToggleButton({
  mounted,
  resolvedTheme,
  setTheme,
  nav,
}: {
  mounted: boolean;
  resolvedTheme: string | undefined;
  setTheme: (t: string) => void;
  nav?: boolean;
}) {
  if (!mounted) {
    return (
      <span
        className={
          nav
            ? "inline-flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 opacity-50"
            : "inline-flex size-11 items-center justify-center rounded-lg border border-accent/40 opacity-50 sm:size-8 dark:border-accent/45"
        }
        aria-hidden
      />
    );
  }
  const dark = resolvedTheme === "dark";
  if (nav) {
    return (
      <button
        type="button"
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className="flex min-h-11 min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-300 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {dark ? <Sun className="size-5 shrink-0" /> : <Moon className="size-5 shrink-0" />}
        <span>Theme</span>
      </button>
    );
  }
    return (
      <Button
        type="button"
        variant="outline"
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        className="size-11 min-h-11 min-w-11 rounded-full border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 sm:size-10 sm:min-h-10 sm:min-w-10 dark:border-white/20 dark:bg-white/10 dark:text-white"
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    );
}
