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
    <Card className="overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="order-2 flex flex-wrap items-center gap-2 sm:order-1">
            <Badge className="rounded-full bg-amber-500 text-amber-950 hover:bg-amber-500">
              #{opt.rank}
            </Badge>
            <Badge variant="outline" className="max-w-full whitespace-normal font-normal">
              {opt.carriers}
            </Badge>
          </div>
          <div className="order-1 text-left sm:order-2 sm:text-right">
            <p className="font-semibold text-3xl tabular-nums tracking-tight text-sky-600 sm:text-2xl dark:text-sky-400">
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
          <div className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm">
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
              "w-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 font-semibold shadow-sm hover:from-sky-600 hover:to-sky-700 sm:w-auto"
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
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-28 sm:pb-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">Results</h2>
          <p className="text-muted-foreground text-sm">
            Structured view of the ranked report template from Step 8.
          </p>
        </div>
        <Button
          variant="outline"
          className="hidden rounded-full sm:inline-flex"
          onClick={onRerun}
        >
          Re-run with tweaks
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>

      {parsed.tripTitle ? (
        <p className="text-muted-foreground text-sm">{parsed.tripTitle}</p>
      ) : null}

      <Card
        className={cn(
          "relative overflow-hidden border-sky-500/35 bg-gradient-to-br from-sky-500/15 via-background to-background shadow-sm",
          "dark:from-sky-500/25"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_55%)]" />
        <CardHeader className="relative space-y-2">
          <div className="flex items-center gap-2 font-medium text-sky-800 text-sm dark:text-sky-200">
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

      <section className="space-y-4">
        <h3 className="font-semibold text-lg tracking-tight">Top 3 options</h3>
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

      <Accordion defaultValue={["also"]} className="rounded-xl border bg-card px-2 shadow-sm">
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
        variant="default"
        size="lg"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[45] min-h-12 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 px-5 shadow-lg focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        onClick={onRerun}
      >
        Re-run
        <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  );
}
