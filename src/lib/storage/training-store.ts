import { TRAINING_MODES, TrainingMode, TrainingRecord } from "@/types/mahjong";

const STORAGE_KEY = "majiang-trainer-records-v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function isTrainingMode(value: string): value is TrainingMode {
  return (TRAINING_MODES as readonly string[]).includes(value);
}

export function loadRecords(): TrainingRecord[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as TrainingRecord[];
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is TrainingRecord =>
          typeof item === "object" &&
          item !== null &&
          typeof item.mode === "string" &&
          isTrainingMode(item.mode) &&
          typeof item.score === "number" &&
          typeof item.correct === "boolean" &&
          (typeof item.elapsedMs === "undefined" || typeof item.elapsedMs === "number") &&
          typeof item.summary === "string",
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRecord(record: Omit<TrainingRecord, "id" | "createdAt">): void {
  if (!canUseStorage()) {
    return;
  }

  const all = loadRecords();
  const next: TrainingRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  const latest = [next, ...all].slice(0, 300);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
}

export function clearRecords(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export type ProgressStats = {
  total: number;
  avgScore: number;
  accuracy: number;
  byMode: Record<TrainingMode, { count: number; avgScore: number; accuracy: number }>;
};

export function summarizeRecords(records: TrainingRecord[]): ProgressStats {
  const baseByMode: ProgressStats["byMode"] = {
    quick: { count: 0, avgScore: 0, accuracy: 0 },
    discard: { count: 0, avgScore: 0, accuracy: 0 },
  };

  if (records.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      accuracy: 0,
      byMode: baseByMode,
    };
  }

  let scoreSum = 0;
  let correctCount = 0;

  for (const item of records) {
    scoreSum += item.score;
    if (item.correct) {
      correctCount += 1;
    }

    const modeStats = baseByMode[item.mode];
    if (modeStats) {
      modeStats.count += 1;
      modeStats.avgScore += item.score;
      modeStats.accuracy += item.correct ? 1 : 0;
    }
  }

  for (const mode of Object.keys(baseByMode) as TrainingMode[]) {
    const modeStats = baseByMode[mode];
    if (modeStats.count > 0) {
      modeStats.avgScore = Math.round(modeStats.avgScore / modeStats.count);
      modeStats.accuracy = Math.round((modeStats.accuracy / modeStats.count) * 100);
    }
  }

  return {
    total: records.length,
    avgScore: Math.round(scoreSum / records.length),
    accuracy: Math.round((correctCount / records.length) * 100),
    byMode: baseByMode,
  };
}
