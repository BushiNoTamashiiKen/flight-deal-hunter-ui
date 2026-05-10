"use client";

import * as React from "react";
import { Loader2, Moon, Search as SearchIcon, Sun, Trophy } from "lucide-react";
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
        toast.error(`Hunt failed to start (${res.status}).`);
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
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 font-bold text-lg text-white shadow-sm">
              S
            </div>
            <div>
              <p className="font-semibold text-lg tracking-tight">Skyflint</p>
              <p className="text-muted-foreground text-xs">Flight deal hunter</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <ThemeToggleButton mounted={mounted} resolvedTheme={resolvedTheme} setTheme={setTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8">
        <Tabs
          value={tab}
          onValueChange={(v: string) => setTab(v as typeof tab)}
          className="gap-8"
        >
          <TabsList className="hidden h-auto w-full grid-cols-3 rounded-2xl bg-muted/60 p-1 sm:grid">
            <TabsTrigger value="intake" className="rounded-xl py-2 text-sm">
              New search
            </TabsTrigger>
            <TabsTrigger value="run" disabled={!runStarted} className="rounded-xl py-2 text-sm">
              Hunting…
            </TabsTrigger>
            <TabsTrigger value="report" disabled={!reportMd} className="rounded-xl py-2 text-sm">
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

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around gap-1 border-t bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md sm:hidden"
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
      className={`flex min-h-11 min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
        active ? "text-primary" : "text-muted-foreground"
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
            : "inline-flex size-11 items-center justify-center rounded-lg border border-border opacity-50 sm:size-8"
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
        className="flex min-h-11 min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      className="size-11 min-h-11 min-w-11 sm:size-8 sm:min-h-8 sm:min-w-8"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
