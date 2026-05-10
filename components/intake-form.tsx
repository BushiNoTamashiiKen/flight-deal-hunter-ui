"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
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
import { BOOKING_COUNTRIES } from "@/lib/countries";
import {
  CABIN_VALUES,
  CURRENCIES,
  dateModeEnum,
  defaultIntakeValues,
  intakeSchema,
  type IntakeValues,
} from "@/lib/intake-schema";
import { cn } from "@/lib/utils";

function ChipList({
  label,
  values,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState("");

  const add = React.useCallback(() => {
    const v = draft.trim();
    if (!v || disabled) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  }, [draft, disabled, onChange, values]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Badge
            key={v}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            {v}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={disabled}>
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
        variant="outline"
        size="icon-sm"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </Button>
      <span className="min-w-[2ch] text-center font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
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
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        checked
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background hover:bg-muted/60"
      )}
    >
      <Checkbox
        checked={checked}
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

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-start font-normal"
          )}
        >
          <CalendarIcon className="mr-2 size-4 opacity-70" />
          {date ? format(date, "PPP") : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : undefined)}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function IntakeForm({
  onSubmit,
  initialValues,
}: {
  onSubmit: (values: IntakeValues) => void | Promise<void>;
  initialValues?: Partial<IntakeValues>;
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

  return (
    <FormProvider {...form}>
      <form
        className="mx-auto flex max-w-3xl flex-col gap-8 pb-16"
        onSubmit={form.handleSubmit((values) => onSubmit(values as IntakeValues))}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Plane className="size-7 text-sky-500" aria-hidden />
            <div>
              <h2 className="font-semibold text-2xl tracking-tight">New search</h2>
              <p className="text-muted-foreground text-sm">
                Mirrors the Flight Deal Hunter Step 1 intake template — confirm every field before
                hunting.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="size-5 text-sky-500" />
              Route
            </CardTitle>
            <CardDescription>Origin(s) within ~200km and destination targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Controller
              control={form.control}
              name="origins"
              render={({ field }) => (
                <ChipList
                  label="Origin(s)"
                  placeholder="e.g. CPT, Cape Town"
                  values={field.value}
                  onChange={field.onChange}
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
                  disabled={discoveryLocked && field.value.length === 0}
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="size-5 text-sky-500" />
              Dates
            </CardTitle>
            <CardDescription>Windows match your selected mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date mode</Label>
                <Controller
                  control={form.control}
                  name="dateMode"
                  render={({ field }) => (
                    <Select
                      value={field.value}
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
                    <Input id="monthYear" type="month" {...field} value={field.value ?? ""} />
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
                    <Input id="cheapestMonth" type="month" {...field} value={field.value ?? ""} />
                  )}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5 text-sky-500" />
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
                  <Stepper value={field.value} onChange={field.onChange} min={1} max={9} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Controller
                control={form.control}
                name="children"
                render={({ field }) => (
                  <Stepper value={field.value} onChange={field.onChange} min={0} max={9} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Infants</Label>
              <Controller
                control={form.control}
                name="infants"
                render={({ field }) => (
                  <Stepper value={field.value} onChange={field.onChange} min={0} max={9} />
                )}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cabin</Label>
              <Controller
                control={form.control}
                name="cabin"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {CABIN_VALUES.map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={field.value === v ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="size-5 text-sky-500" />
              Bags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={form.control}
              name="bagPolicy"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <Label>Bag policy</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={field.value === "personal" ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => field.onChange("personal")}
                    >
                      Personal item only
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "carryon" ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => field.onChange("carryon")}
                    >
                      + Carry-on
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "checked" ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
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
                    <Stepper value={field.value} onChange={field.onChange} min={1} max={5} />
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Controller
                control={form.control}
                name="constraintNoRedEyes"
                render={({ field }) => (
                  <PillCheckbox
                    label="No red-eyes"
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
                      disabled={!maxLayoversEnabled}
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
                      disabled={!maxTimeEnabled}
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
                  <Input id="avoidCarriers" placeholder="e.g. FR, U2" {...field} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-sky-500" />
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
              <Label htmlFor="budget">Budget ceiling</Label>
              <Controller
                control={form.control}
                name="budgetCeiling"
                render={({ field }) => (
                  <Input id="budget" inputMode="decimal" type="number" {...field} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
              <Label>Booking residency</Label>
              <Controller
                control={form.control}
                name="bookingCountry"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
                )}
              />
            </div>
          </CardContent>
        </Card>

        {Object.keys(form.formState.errors).length > 0 ? (
          <p className="text-destructive text-sm">
            Fix validation errors above before launching the hunt.
          </p>
        ) : null}

        <Separator />

        <Button
          type="submit"
          size="lg"
          className="h-11 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 text-primary-foreground shadow-sm hover:from-sky-600 hover:to-sky-700"
          disabled={!form.formState.isValid}
        >
          Start hunt
        </Button>
      </form>
    </FormProvider>
  );
}
