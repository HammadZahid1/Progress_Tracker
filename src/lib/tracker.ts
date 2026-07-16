export type TrackerType = "work" | "study";

export type DayStatus = "done" | "missed" | "pending";

export interface DayEntry {
  status: DayStatus;
  note: string;
}

export type TrackerData = Record<string, DayEntry>;

const STORAGE_PREFIX = "progress-tracker:";

function isBrowser() {
  return typeof window !== "undefined";
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readFromStorage(type: TrackerType): TrackerData {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + type);
    return raw ? (JSON.parse(raw) as TrackerData) : {};
  } catch {
    return {};
  }
}

const EMPTY_DATA: TrackerData = {};
const snapshots = new Map<TrackerType, TrackerData>();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

export function subscribeTracker(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTrackerSnapshot(type: TrackerType): TrackerData {
  if (!isBrowser()) return EMPTY_DATA;
  if (!snapshots.has(type)) {
    snapshots.set(type, readFromStorage(type));
  }
  return snapshots.get(type)!;
}

export function getTrackerServerSnapshot(): TrackerData {
  return EMPTY_DATA;
}

export function updateTracker(
  type: TrackerType,
  updater: (data: TrackerData) => TrackerData,
): void {
  const next = updater(getTrackerSnapshot(type));
  snapshots.set(type, next);
  window.localStorage.setItem(STORAGE_PREFIX + type, JSON.stringify(next));
  emitChange();
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export interface MonthStats {
  done: number;
  missed: number;
  pending: number;
  totalTracked: number;
  completionPct: number;
  currentStreak: number;
  longestStreak: number;
}

export function computeMonthStats(
  data: TrackerData,
  year: number,
  month: number,
): MonthStats {
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const allDays = getMonthDays(year, month);
  const daysPassed = isCurrentMonth
    ? allDays.slice(0, today.getDate())
    : allDays;

  let done = 0;
  let missed = 0;
  let pending = 0;

  for (const day of daysPassed) {
    const entry = data[dateKey(day)];
    const status = entry?.status ?? "pending";
    if (status === "done") done++;
    else if (status === "missed") missed++;
    else pending++;
  }

  const totalTracked = daysPassed.length;
  const completionPct =
    totalTracked > 0 ? Math.round((done / totalTracked) * 100) : 0;

  // Current streak: walk backward from today (or month end) while status is "done".
  let currentStreak = 0;
  const cursor = new Date(today);
  if (!isCurrentMonth) {
    cursor.setFullYear(year, month + 1, 0);
  }
  for (;;) {
    const status = data[dateKey(cursor)]?.status;
    if (status !== "done") break;
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak across all recorded history for this tracker.
  const sortedKeys = Object.keys(data).sort();
  let longestStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;
  for (const key of sortedKeys) {
    if (data[key].status !== "done") {
      running = 0;
      prevDate = null;
      continue;
    }
    const [y, m, d] = key.split("-").map(Number);
    const current = new Date(y, m - 1, d);
    if (prevDate) {
      const dayDiff = Math.round(
        (current.getTime() - prevDate.getTime()) / 86400000,
      );
      running = dayDiff === 1 ? running + 1 : 1;
    } else {
      running = 1;
    }
    longestStreak = Math.max(longestStreak, running);
    prevDate = current;
  }

  return {
    done,
    missed,
    pending,
    totalTracked,
    completionPct,
    currentStreak,
    longestStreak,
  };
}
