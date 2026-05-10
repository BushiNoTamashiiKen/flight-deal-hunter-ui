"use client";

import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { FlightRouteBar } from "@/components/flight-route-bar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ParsedFlightOption, ParsedReport } from "@/lib/parse-report";
import { cn } from "@/lib/utils";

function OptionCard({ opt }: { opt: ParsedFlightOption }) {
  const tradeoffBadges =
    opt.tradeoffs
      ?.split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <Card className="overflow-hidden border-accent/30 shadow-dashboard transition-shadow duration-300 ease-spring hover:shadow-dashboard-lg focus-within:shadow-dashboard-lg dark:border-accent/35">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="order-2 flex flex-wrap items-center gap-2 sm:order-1">
            <Badge className="rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary">
              #{opt.rank}
            </Badge>
            <Badge variant="outline" className="max-w-full whitespace-normal font-normal">
              {opt.carriers}
            </Badge>
          </div>
          <div className="order-1 text-left sm:order-2 sm:text-right">
            <p className="font-semibold text-3xl tracking-tight tabular-nums text-foreground sm:text-2xl">
              {opt.totalDisplay || opt.fareTotal}{" "}
              {opt.fareCurrency ? (
                <span className="font-medium text-xl sm:text-lg">{opt.fareCurrency}</span>
              ) : null}
            </p>
          </div>
        </div>
        <CardTitle className="order-3 font-medium text-base leading-snug">{opt.headline}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Routing
          </p>
          <FlightRouteBar airports={opt.airports.length ? opt.airports : ["???"]} />
          <p className="text-muted-foreground text-xs">{opt.routing}</p>
        </div>

        {(opt.fareBase !== undefined ||
          opt.fareBags !== undefined ||
          opt.fareTransit !== undefined) && (
          <div className="rounded-xl border border-dashed border-accent/35 bg-muted/35 px-3 py-2 text-sm dark:border-accent/40">
            <span className="text-muted-foreground">Fare breakdown: </span>
            <span className="tabular-nums">
              base {opt.fareBase ?? "—"} + bags {opt.fareBags ?? "—"} + transit{" "}
              {opt.fareTransit ?? "—"} ={" "}
              <span className="font-semibold text-foreground">{opt.fareTotal ?? "—"}</span>
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tradeoffBadges.slice(0, 6).map((t) => (
            <Badge key={t} variant="secondary" className="font-normal">
              {t}
            </Badge>
          ))}
        </div>

        {opt.confidence ? (
          <p className="text-muted-foreground text-xs">
            <span className="font-medium text-foreground">Confidence: </span>
            {opt.confidence}
          </p>
        ) : null}

        {opt.bookingUrl ? (
          <a
            href={opt.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({
                variant: "default",
                size: "default",
              }),
              "w-full rounded-full bg-primary font-semibold text-primary-foreground shadow-dashboard hover:bg-primary/95 sm:w-auto"
            )}
          >
            Book on {opt.bookingLabel ?? "source"}
            <ExternalLink className="ml-2 size-4" />
          </a>
        ) : (
          <Button
            className="w-full rounded-full sm:w-auto"
            type="button"
            disabled
            variant="secondary"
          >
            Booking link not parsed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportView({
  parsed,
  checklistState,
  onChecklistChange,
  onRerun,
}: {
  parsed: ParsedReport;
  checklistState: boolean[];
  onChecklistChange: (next: boolean[]) => void;
  onRerun: () => void;
}) {
  const items = parsed.checklist.length
    ? parsed.checklist
    : [{ text: "No checklist parsed — refer to raw markdown.", done: false }];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-11 pb-32 sm:gap-14 sm:pb-28">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-3">
          <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">Results</h2>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed sm:text-base">
            Structured view of the ranked report template from Step 8.
          </p>
        </div>
        <Button variant="secondary" className="hidden rounded-full px-5 shadow-dashboard sm:inline-flex" onClick={onRerun}>
          Re-run with tweaks
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>

      {parsed.tripTitle ? (
        <p className="text-muted-foreground text-sm">{parsed.tripTitle}</p>
      ) : null}

      <Card
        className={cn(
          "relative overflow-hidden border-border/50 bg-accent shadow-dashboard",
          "dark:border-white/10"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgb(219_234_254/0.65),transparent_55%)] dark:bg-[radial-gradient(circle_at_100%_0%,rgb(30_58_138/0.25),transparent_55%)]" />
        <CardHeader className="relative space-y-2">
          <div className="flex items-center gap-2 font-medium text-accent-foreground text-sm">
            <Sparkles className="size-4" />
            TL;DR
          </div>
          <CardTitle className="font-semibold text-xl leading-snug tracking-tight">
            {parsed.tldr ?? "Recommendation parsing unavailable — see raw output below."}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Highlight reel — best balance of price, protection, and friction.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-6 sm:space-y-8">
        <h3 className="font-semibold text-xl tracking-tight sm:text-2xl">Top 3 options</h3>
        <div className="grid gap-4">
          {parsed.options.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Could not parse flight cards — showing raw markdown in devtools recommended.
              </CardContent>
            </Card>
          ) : (
            parsed.options.map((o) => <OptionCard key={o.rank} opt={o} />)
          )}
        </div>
      </section>

      <Accordion
        defaultValue={["also"]}
        className="rounded-[2rem] border border-accent/35 bg-card px-3 shadow-dashboard sm:rounded-[2.25rem] sm:px-4"
      >
        <AccordionItem value="also">
          <AccordionTrigger className="text-base hover:no-underline">
            Also considered
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {parsed.alsoConsidered.map((line) => (
                <li key={line} className="flex gap-2">
                  <Briefcase className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>{line}</span>
                </li>
              ))}
              {parsed.alsoConsidered.length === 0 ? (
                <li className="text-muted-foreground text-sm">No bullets parsed.</li>
              ) : null}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-rose-500/35 bg-rose-500/5 dark:bg-rose-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-rose-900 dark:text-rose-100">
            <AlertTriangle className="size-5" />
            Risks & caveats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground text-sm">
            {parsed.risks.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-rose-500" />
                {r}
              </li>
            ))}
            {parsed.risks.length === 0 ? (
              <li className="text-muted-foreground text-sm">No bullets parsed.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking checklist</CardTitle>
          <CardDescription>Tick items off as you verify real-world constraints.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.text} className="flex items-start gap-4 py-1">
              <Checkbox
                id={`chk-${idx}`}
                className="mt-0.5 size-6 rounded-md [&_[data-slot=checkbox-indicator]>svg]:size-4"
                checked={checklistState[idx] ?? item.done}
                onCheckedChange={(v) => {
                  const next = [...checklistState];
                  next[idx] = Boolean(v);
                  while (next.length < items.length) next.push(false);
                  onChecklistChange(next);
                }}
              />
              <Label htmlFor={`chk-${idx}`} className="cursor-pointer pt-0.5 font-normal leading-relaxed">
                {item.text}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[45] min-h-12 rounded-full px-5 shadow-dashboard-lg backdrop-blur-md sm:hidden"
        onClick={onRerun}
      >
        Re-run
        <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  );
}
