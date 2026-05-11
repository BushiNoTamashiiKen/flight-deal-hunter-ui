"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import {
  Briefcase,
  Calendar as CalendarIcon,
  MapPin,
  Plane,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import * as React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BOOKING_COUNTRIES } from "@/lib/countries";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  CABIN_VALUES,
  CURRENCIES,
  dateModeEnum,
  defaultIntakeValues,
  intakeSchema,
  type IntakeValues,
} from "@/lib/intake-schema";
import { cn } from "@/lib/utils";

const LazyCalendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => m.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(320px,50dvh)] items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
        Loading calendar…
      </div>
    ),
  }
);

function ChipList({
  label,
  values,
  onChange,
  placeholder,
  disabled,
  selectionTone = "origin",
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  /** Origin chips stay neutral/blue actions; destinations use primary yellow consistently */
  selectionTone?: "origin" | "destination";
}) {
  const isDestination = selectionTone === "destination";
  const [draft, setDraft] = React.useState("");

  const add = React.useCallback(() => {
    const v = draft.trim();
    if (!v || disabled) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  }, [draft, disabled, onChange, values]);

  return (
    <div className="space-y-2">
      <Label
        className={
          isDestination
            ? cn("font-medium", !disabled && "text-primary")
            : cn(!disabled && "font-medium text-accent-foreground")
        }
      >
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Badge
            key={v}
            variant={isDestination ? "default" : "outline"}
            className={cn(
              "min-h-9 gap-1 py-1 pr-1 pl-2 font-normal",
              isDestination &&
                "shadow-[inset_0_1px_0_rgb(255_255_255/0.38)] ring-1 ring-primary-foreground/12",
              !isDestination &&
                "border-accent/55 bg-accent/28 text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.45)] ring-1 ring-accent/25 dark:border-accent/55 dark:bg-accent/35 dark:ring-accent/35"
            )}
          >
            {v}
            <button
              type="button"
              className={cn(
                "-mr-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 active:scale-95",
                isDestination
                  ? "hover:bg-primary-foreground/14 focus-visible:ring-primary/45"
                  : "hover:bg-accent/40 focus-visible:ring-accent/50 dark:hover:bg-accent/50"
              )}
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              disabled={disabled}
            >
              <X className="size-4" aria-hidden />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          enterKeyHint="search"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={cn(
            "min-h-11",
            isDestination &&
              "border-primary/45 shadow-[inset_0_1px_2px_rgb(223_255_0/0.1)] hover:border-primary/55 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/28 dark:border-primary/40 dark:bg-primary/10 dark:hover:border-primary/55 dark:focus-visible:ring-primary/35",
            !isDestination &&
              "border-accent/52 shadow-[inset_0_1px_2px_rgb(160_204_255/0.14)] hover:border-accent/68 focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/32 dark:border-accent/50 dark:bg-accent/15 dark:focus-visible:ring-accent/38"
          )}
        />
        <Button
          type="button"
          variant={isDestination ? "default" : "secondary"}
          className="min-h-11 shrink-0 sm:min-h-8"
          onClick={add}
          disabled={disabled}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        className="size-9 shrink-0 rounded-full active:scale-95"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
      >
        −
      </Button>
      <span className="min-w-[2ch] text-center font-medium text-lg tabular-nums">{value}</span>
      <Button
        type="button"
        variant="secondary"
        className="size-9 shrink-0 rounded-full active:scale-95"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        +
      </Button>
    </div>
  );
}

function PillCheckbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  selectionTone = "default",
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Matches destination yellow lane when unchecked */
  selectionTone?: "default" | "destination";
}) {
  const destUnchecked =
    "border-primary/40 bg-card hover:bg-primary/14 hover:border-primary/55 focus-visible:bg-primary/12 focus-within:ring-2 focus-within:ring-primary/35";
  const defaultUnchecked =
    "border-accent/45 bg-card hover:bg-accent/25 hover:border-accent/55 focus-visible:bg-accent/20";

  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors duration-300 ease-spring focus-within:ring-2",
        selectionTone === "destination" ? "focus-within:ring-primary/35" : "focus-within:ring-ring",
        disabled && "pointer-events-none opacity-50",
        checked
          ? "border-primary/50 bg-primary/20 text-foreground shadow-dashboard"
          : selectionTone === "destination"
            ? destUnchecked
            : defaultUnchecked
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
      />
      {label}
    </label>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (iso: string | undefined) => void;
  disabled?: boolean;
}) {
  const date = value ? parseISO(value) : undefined;
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const triggerClass = cn(
    buttonVariants({ variant: "secondary" }),
    "min-h-11 w-full justify-start font-normal"
  );

  const triggerInner = (
    <>
      <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{date ? format(date, "PPP") : "Pick a date"}</span>
    </>
  );

  const calendar = (
    <LazyCalendar
      mode="single"
      selected={date}
      onSelect={(d) => {
        onChange(d ? format(d, "yyyy-MM-dd") : undefined);
        if (isMobile) setSheetOpen(false);
      }}
      captionLayout="dropdown"
      className="mx-auto w-fit max-w-[calc(100vw-2rem)]"
    />
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {isMobile ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger className={triggerClass} disabled={disabled}>
            {triggerInner}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[min(92dvh,calc(100%+env(safe-area-inset-bottom)))] gap-0 overflow-hidden rounded-t-2xl p-0"
          >
            <SheetHeader className="border-border border-b p-4 text-left">
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            <div className="max-h-[min(70dvh,520px)] overflow-y-auto overflow-x-auto p-4">
              {calendar}
            </div>
            <SheetFooter className="border-border border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button type="button" className="min-h-11 w-full" onClick={() => setSheetOpen(false)}>
                Done
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover>
          <PopoverTrigger disabled={disabled} className={triggerClass}>
            {triggerInner}
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
            {calendar}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function IntakeForm({
  onSubmit,
  initialValues,
  huntBusy,
}: {
  onSubmit: (values: IntakeValues) => void | Promise<void>;
  initialValues?: Partial<IntakeValues>;
  huntBusy?: boolean;
}) {
  const form = useForm({
    resolver: zodResolver(intakeSchema),
    defaultValues: { ...defaultIntakeValues, ...initialValues },
    mode: "onChange",
  });

  const dateMode = form.watch("dateMode");
  const tripType = form.watch("tripType");
  const anywhereIntl = form.watch("anywhereInternational");
  const anywhereEu = form.watch("anywhereEurope");
  const bagPolicy = form.watch("bagPolicy");
  const maxLayoversEnabled = form.watch("constraintMaxLayovers");
  const maxTimeEnabled = form.watch("constraintMaxTotalTime");

  const discoveryLocked = anywhereIntl || anywhereEu;
  const busy = Boolean(huntBusy);
  const isSmallScreen = useMediaQuery("(max-width: 639px)");

  return (
    <FormProvider {...form}>
      <form
        id="skyflint-intake-form"
        className="mx-auto flex w-full max-w-3xl flex-col gap-10 pb-24 sm:gap-12 sm:pb-16"
        onSubmit={form.handleSubmit((values) => onSubmit(values as IntakeValues))}
      >
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-10 border-0 p-0 sm:gap-12">
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="flex items-center gap-5 sm:gap-6">
            <span className="icon-chip size-[3.25rem] sm:size-14 [&_svg]:size-7 sm:[&_svg]:size-8">
              <Plane aria-hidden />
            </span>
            <div className="space-y-2">
              <h2 className="font-semibold text-2xl tracking-tight text-foreground sm:text-3xl">
                New search
              </h2>
              <p className="max-w-xl text-muted-foreground text-sm leading-relaxed sm:text-base">
                Mirrors the Flight Deal Hunter Step 1 intake template — confirm every field before
                hunting.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="icon-chip">
                <MapPin className="size-5" aria-hidden />
              </span>
              Route
            </CardTitle>
            <CardDescription>Origin(s) within ~200km and destination targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-7 sm:space-y-8">
            <Controller
              control={form.control}
              name="origins"
              render={({ field }) => (
                <ChipList
                  label="Origin(s)"
                  placeholder="e.g. CPT, Cape Town"
                  values={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  selectionTone="origin"
                />
              )}
            />
            <div className="flex flex-wrap gap-3">
              <Controller
                control={form.control}
                name="anywhereInternational"
                render={({ field }) => (
                  <PillCheckbox
                    label="Anywhere international"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                    selectionTone="destination"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="anywhereEurope"
                render={({ field }) => (
                  <PillCheckbox
                    label="Anywhere in Europe"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                    selectionTone="destination"
                  />
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="destinations"
              render={({ field }) => (
                <ChipList
                  label="Destination(s)"
                  placeholder={discoveryLocked ? "Optional — discovery mode enabled" : "e.g. LIS, Lisbon"}
                  values={field.value}
                  onChange={field.onChange}
                  disabled={(discoveryLocked && field.value.length === 0) || busy}
                  selectionTone="destination"
                />
              )}
            />
            {discoveryLocked ? (
              <p className="text-muted-foreground text-xs">
                Discovery toggles treat destinations as optional — baseline uses map / Everywhere style
                searches per the skill.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="icon-chip">
                <CalendarIcon className="size-5" aria-hidden />
              </span>
              Dates
            </CardTitle>
            <CardDescription>Windows match your selected mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-7 sm:space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date mode</Label>
                <Controller
                  control={form.control}
                  name="dateMode"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      disabled={busy}
                      onValueChange={(v) => {
                        const m = dateModeEnum.safeParse(v);
                        if (m.success) field.onChange(m.data);
                      }}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Choose mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed dates</SelectItem>
                        <SelectItem value="flexible">Flexible ±N days</SelectItem>
                        <SelectItem value="whole_month">Whole month</SelectItem>
                        <SelectItem value="cheapest_month">Cheapest month</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Trip type</Label>
                <Controller
                  control={form.control}
                  name="tripType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roundtrip">Round trip</SelectItem>
                        <SelectItem value="oneway">One way</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {dateMode === "fixed" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="outboundDate"
                  render={({ field }) => (
                    <DatePickerField
                      label="Outbound window"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={busy}
                    />
                  )}
                />
                {tripType === "roundtrip" ? (
                  <Controller
                    control={form.control}
                    name="returnDate"
                    render={({ field }) => (
                      <DatePickerField
                        label="Return window"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={busy}
                      />
                    )}
                  />
                ) : (
                  <p className="text-muted-foreground self-end text-sm">
                    Return skipped for one-way itineraries.
                  </p>
                )}
              </div>
            ) : null}

            {dateMode === "flexible" ? (
              <div className="space-y-4">
                <Controller
                  control={form.control}
                  name="outboundDate"
                  render={({ field }) => (
                    <DatePickerField
                      label="Center date for ± window"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={busy}
                    />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>± days</Label>
                    <Controller
                      control={form.control}
                      name="flexibleDays"
                      render={({ field }) => (
                        <Stepper
                          disabled={busy}
                          value={field.value}
                          onChange={field.onChange}
                          min={1}
                          max={21}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Trip length (nights)</Label>
                    <Controller
                      control={form.control}
                      name="tripLengthNights"
                      render={({ field }) => (
                        <>
                          <Slider
                            disabled={busy}
                            min={3}
                            max={21}
                            step={1}
                            value={[field.value]}
                            onValueChange={(v) =>
                              field.onChange(Array.isArray(v) ? (v[0] ?? 7) : v)
                            }
                          />
                          <p className="text-muted-foreground text-xs">{field.value} nights</p>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {dateMode === "whole_month" ? (
              <div className="space-y-2">
                <Label htmlFor="monthYear">Month</Label>
                <Controller
                  control={form.control}
                  name="monthYear"
                  render={({ field }) => (
                    <Input
                      id="monthYear"
                      type="month"
                      {...field}
                      value={field.value ?? ""}
                      disabled={busy}
                    />
                  )}
                />
              </div>
            ) : null}

            {dateMode === "cheapest_month" ? (
              <div className="space-y-2">
                <Label htmlFor="cheapestMonth">Cheapest-month anchor</Label>
                <Controller
                  control={form.control}
                  name="cheapestMonth"
                  render={({ field }) => (
                    <Input
                      id="cheapestMonth"
                      type="month"
                      {...field}
                      value={field.value ?? ""}
                      disabled={busy}
                    />
                  )}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="icon-chip">
                <Users className="size-5" aria-hidden />
              </span>
              Travelers & cabin
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Adults</Label>
              <Controller
                control={form.control}
                name="adults"
                render={({ field }) => (
                  <Stepper
                    disabled={busy}
                    value={field.value}
                    onChange={field.onChange}
                    min={1}
                    max={9}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Controller
                control={form.control}
                name="children"
                render={({ field }) => (
                  <Stepper
                    disabled={busy}
                    value={field.value}
                    onChange={field.onChange}
                    min={0}
                    max={9}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Infants</Label>
              <Controller
                control={form.control}
                name="infants"
                render={({ field }) => (
                  <Stepper
                    disabled={busy}
                    value={field.value}
                    onChange={field.onChange}
                    min={0}
                    max={9}
                  />
                )}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cabin</Label>
              <Controller
                control={form.control}
                name="cabin"
                render={({ field }) => (
                  <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                    {CABIN_VALUES.map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={field.value === v ? "default" : "secondary"}
                        size="sm"
                        className="shrink-0 rounded-full"
                        disabled={busy}
                        onClick={() => field.onChange(v)}
                      >
                        {v.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="icon-chip">
                <Briefcase className="size-5" aria-hidden />
              </span>
              Bags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-7">
            <Controller
              control={form.control}
              name="bagPolicy"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label>Bag policy</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={field.value === "personal" ? "default" : "secondary"}
                      size="sm"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => field.onChange("personal")}
                    >
                      Personal item only
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "carryon" ? "default" : "secondary"}
                      size="sm"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => field.onChange("carryon")}
                    >
                      + Carry-on
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "checked" ? "default" : "secondary"}
                      size="sm"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => field.onChange("checked")}
                    >
                      + Checked bags
                    </Button>
                  </div>
                </div>
              )}
            />
            {bagPolicy === "checked" ? (
              <div className="space-y-2">
                <Label>Checked bags (count)</Label>
                <Controller
                  control={form.control}
                  name="checkedBags"
                  render={({ field }) => (
                    <Stepper
                      disabled={busy}
                      value={field.value}
                      onChange={field.onChange}
                      min={1}
                      max={5}
                    />
                  )}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Constraints</CardTitle>
            <CardDescription>Hard filters that eliminate bad fits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-7">
            <div className="flex flex-wrap gap-2">
              <Controller
                control={form.control}
                name="constraintNoRedEyes"
                render={({ field }) => (
                  <PillCheckbox
                    label="No red-eyes"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="constraintMaxLayovers"
                render={({ field }) => (
                  <PillCheckbox
                    label="Max layovers cap"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="constraintMaxTotalTime"
                render={({ field }) => (
                  <PillCheckbox
                    label="Max total time"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                  />
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cn("space-y-2", !maxLayoversEnabled && "opacity-50")}>
                <Label>Max connections</Label>
                <Controller
                  control={form.control}
                  name="constraintMaxLayoversValue"
                  render={({ field }) => (
                    <Stepper
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                      max={4}
                      disabled={busy || !maxLayoversEnabled}
                    />
                  )}
                />
              </div>
              <div className={cn("space-y-2", !maxTimeEnabled && "opacity-50")}>
                <Label>Max itinerary hours</Label>
                <Controller
                  control={form.control}
                  name="constraintMaxHours"
                  render={({ field }) => (
                    <Stepper
                      value={field.value}
                      onChange={field.onChange}
                      min={6}
                      max={48}
                      disabled={busy || !maxTimeEnabled}
                    />
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avoidCarriers">Avoid carriers (free text)</Label>
              <Controller
                control={form.control}
                name="avoidCarriers"
                render={({ field }) => (
                  <Input id="avoidCarriers" placeholder="e.g. FR, U2" {...field} disabled={busy} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="icon-chip">
                <Sparkles className="size-5" aria-hidden />
              </span>
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Controller
              control={form.control}
              name="prefDirect"
              render={({ field }) => (
                <PillCheckbox
                  label="Direct preferred"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={busy}
                />
              )}
            />
            <Controller
              control={form.control}
              name="prefAllianceStatus"
              render={({ field }) => (
                <PillCheckbox
                  label="Alliance for status"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={busy}
                />
              )}
            />
            <Controller
              control={form.control}
              name="prefAvoidUSConnections"
              render={({ field }) => (
                <PillCheckbox
                  label="Avoid US connections"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={busy}
                />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget & residency</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">How much are you willing to spend maximum?</Label>
              <Controller
                control={form.control}
                name="budgetCeiling"
                render={({ field }) => (
                  <Input id="budget" inputMode="decimal" type="number" {...field} disabled={busy} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bookingCountry">Booking residency</Label>
              <Controller
                control={form.control}
                name="bookingCountry"
                render={({ field }) =>
                  isSmallScreen ? (
                    <select
                      id="bookingCountry"
                      disabled={busy}
                      className={cn(
                        "flex h-11 w-full rounded-lg border border-input bg-card/45 px-3 text-base shadow-[inset_0_1px_1.5px_rgb(160_204_255/0.07)] shadow-xs outline-none transition-[color,box-shadow,border-color] duration-300 ease-spring",
                        "hover:border-accent/35 focus-visible:border-accent/55 focus-visible:ring-[3px] focus-visible:ring-accent/22",
                        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/35 dark:shadow-[inset_0_1px_2px_rgb(80_130_200/0.12)] dark:hover:border-accent/45 dark:focus-visible:ring-accent/28"
                      )}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {BOOKING_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                      <SelectTrigger id="bookingCountry" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKING_COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        {Object.keys(form.formState.errors).length > 0 ? (
          <p className="text-destructive text-sm">
            Fix validation errors above before launching the hunt.
          </p>
        ) : null}

        <Separator className="my-3 h-px rounded-full bg-accent/25 dark:bg-accent/30" />
        </fieldset>

        <Button
          type="submit"
          size="lg"
          className="hidden h-12 min-h-12 w-full rounded-full bg-primary text-primary-foreground shadow-dashboard-lg hover:bg-primary/95 focus-visible:ring-2 focus-visible:ring-ring sm:flex sm:h-11 sm:min-h-11 sm:w-auto"
          disabled={!form.formState.isValid || busy}
        >
          Start hunt
        </Button>
      </form>

      <Button
        type="submit"
        size="lg"
        form="skyflint-intake-form"
        className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 h-12 min-h-12 rounded-full bg-primary text-primary-foreground shadow-dashboard-lg focus-visible:ring-2 focus-visible:ring-ring sm:hidden hover:bg-primary/95"
        disabled={!form.formState.isValid || busy}
      >
        {busy ? "Hunting…" : "Start hunt"}
      </Button>
    </FormProvider>
  );
}
