"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  DayEntry,
  DayStatus,
  TrackerType,
  computeMonthStats,
  dateKey,
  getMonthDays,
  getTrackerServerSnapshot,
  getTrackerSnapshot,
  subscribeTracker,
  updateTracker,
} from "@/lib/tracker";

const THEME = {
  work: {
    label: "Work",
    accentText: "text-cyan-300",
    accentBorder: "border-cyan-400/40",
    accentRing: "focus:ring-cyan-400/50 focus:border-cyan-400/70",
    glow: "shadow-[0_0_25px_-5px_rgba(34,211,238,0.45)]",
    dot: "bg-cyan-400",
    gradient: "from-cyan-500/15 via-cyan-400/5 to-transparent",
    barGradient: "from-cyan-400 to-sky-500",
  },
  study: {
    label: "Study",
    accentText: "text-fuchsia-300",
    accentBorder: "border-fuchsia-400/40",
    accentRing: "focus:ring-fuchsia-400/50 focus:border-fuchsia-400/70",
    glow: "shadow-[0_0_25px_-5px_rgba(232,121,249,0.45)]",
    dot: "bg-fuchsia-400",
    gradient: "from-fuchsia-500/15 via-fuchsia-400/5 to-transparent",
    barGradient: "from-fuchsia-400 to-purple-500",
  },
} as const;

const STATUS_STYLES: Record<
  DayStatus,
  { icon: string; classes: string; label: string }
> = {
  done: {
    icon: "✓",
    label: "Done",
    classes:
      "bg-emerald-400/15 text-emerald-300 border-emerald-400/60 shadow-[0_0_14px_-2px_rgba(52,211,153,0.6)]",
  },
  missed: {
    icon: "✕",
    label: "Missed",
    classes:
      "bg-rose-500/15 text-rose-300 border-rose-400/60 shadow-[0_0_14px_-2px_rgba(244,63,94,0.6)]",
  },
  pending: {
    icon: "·",
    label: "Pending",
    classes: "bg-white/[0.03] text-white/25 border-white/10",
  },
};

const NEXT_STATUS: Record<DayStatus, DayStatus> = {
  pending: "done",
  done: "missed",
  missed: "pending",
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export default function TrackerBoard({ type }: { type: TrackerType }) {
  const theme = THEME[type];
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const data = useSyncExternalStore(
    subscribeTracker,
    () => getTrackerSnapshot(type),
    getTrackerServerSnapshot,
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const stats = useMemo(
    () => computeMonthStats(data, year, month),
    [data, year, month],
  );
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  function updateEntry(key: string, patch: Partial<DayEntry>) {
    updateTracker(type, (prev) => ({
      ...prev,
      [key]: {
        status: prev[key]?.status ?? "pending",
        note: prev[key]?.note ?? "",
        ...patch,
      },
    }));
  }

  function cycleStatus(key: string) {
    const current = data[key]?.status ?? "pending";
    updateEntry(key, { status: NEXT_STATUS[current] });
  }

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  const leadingBlanks = days[0].getDay();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
            progress-tracker
          </p>
          <h1
            className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${theme.accentText}`}
          >
            {theme.label} Log
          </h1>
        </div>
        <nav className="flex gap-4 font-mono text-xs text-white/40">
          <Link href="/" className="transition hover:text-white/80">
            home
          </Link>
          <Link
            href={type === "work" ? "/study" : "/work"}
            className="transition hover:text-white/80"
          >
            {type === "work" ? "study →" : "work →"}
          </Link>
        </nav>
      </header>

      {/* Month nav */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <button
          onClick={() => shiftMonth(-1)}
          className="rounded-md px-3 py-1 font-mono text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          ‹
        </button>
        <div className="flex items-center gap-2 font-mono text-sm text-white/80">
          <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
          {MONTH_FORMATTER.format(cursor)}
        </div>
        <button
          onClick={() => shiftMonth(1)}
          className="rounded-md px-3 py-1 font-mono text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          ›
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Complete" value={`${stats.completionPct}%`} theme={theme} />
        <StatTile label="Done" value={String(stats.done)} theme={theme} />
        <StatTile label="Streak" value={String(stats.currentStreak)} theme={theme} />
        <StatTile label="Best" value={String(stats.longestStreak)} theme={theme} />
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full bg-gradient-to-r ${theme.barGradient} transition-all duration-500`}
          style={{ width: `${stats.completionPct}%` }}
        />
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid grid-cols-7 gap-1.5 font-mono text-[10px] text-white/30">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const key = dateKey(day);
            const status = data[key]?.status ?? "pending";
            const isToday = key === dateKey(today);
            return (
              <div
                key={key}
                title={`${day.getDate()} — ${STATUS_STYLES[status].label}`}
                className={`aspect-square rounded-md border ${STATUS_STYLES[status].classes} ${
                  isToday ? "ring-1 ring-white/60" : ""
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Day list */}
      <div className="flex flex-col gap-2">
        {days.map((day) => {
          const key = dateKey(day);
          const entry = data[key];
          const status = entry?.status ?? "pending";
          const isToday = key === dateKey(today);
          const isFuture = day > today && !isSameDay(day, today);
          return (
            <div
              key={key}
              className={`group flex items-center gap-3 rounded-lg border bg-white/[0.015] px-3 py-2 transition ${
                isToday
                  ? `${theme.accentBorder} bg-gradient-to-r ${theme.gradient}`
                  : "border-white/10 hover:border-white/20"
              } ${isFuture ? "opacity-50" : ""}`}
            >
              <button
                onClick={() => cycleStatus(key)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono text-sm transition ${STATUS_STYLES[status].classes}`}
              >
                {STATUS_STYLES[status].icon}
              </button>
              <div className="flex w-14 shrink-0 flex-col font-mono leading-tight">
                <span className="text-sm text-white/80">
                  {String(day.getDate()).padStart(2, "0")}
                </span>
                <span className="text-[10px] uppercase text-white/30">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
              </div>
              <input
                type="text"
                value={entry?.note ?? ""}
                onChange={(e) => updateEntry(key, { note: e.target.value })}
                placeholder={
                  type === "work" ? "What's the task?" : "What are you studying?"
                }
                className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-mono text-sm text-white/80 outline-none transition placeholder:text-white/20 focus:border-white/10 focus:bg-white/[0.03] ${theme.accentRing}`}
              />
            </div>
          );
        })}
      </div>

      <p className="text-center font-mono text-[11px] text-white/20">
        {isCurrentMonth
          ? "click the box to cycle · pending → done → missed"
          : "viewing history — click home to return to today"}
      </p>
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function StatTile({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: (typeof THEME)[TrackerType];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl font-semibold ${theme.accentText}`}>
        {value}
      </p>
    </div>
  );
}
