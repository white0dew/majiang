import { TILE_KIND_COUNT } from "@/engine/mahjong/tiles";
import {
  DISCARD_PLAY_STYLES,
  OpponentState,
  Scenario,
  TRAINING_MODES,
  TRAINING_RULE_IDS,
  TrainingMode,
  TrainingRecord,
  TrainingRuleId,
} from "@/types/mahjong";

const STORAGE_KEY = "majiang-trainer-records-v1";
const FAVORITES_KEY = "majiang-trainer-favorites-v1";
const MISTAKES_KEY = "majiang-trainer-mistakes-v1";
const DEFAULT_RULE_ID: TrainingRuleId = "sichuan-blood-battle";
const MAX_SCENARIO_COLLECTION = 200;
const LEGACY_RULE_ALIAS: Record<string, TrainingRuleId> = {
  "guiyang-zhuoji": "guizhou-zhuoji",
};

export type StoredScenarioQuestion = {
  id: string;
  mode: TrainingMode;
  ruleId: TrainingRuleId;
  scenario: Scenario;
  createdAt: string;
  updatedAt: string;
  wrongCount: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function isTrainingMode(value: string): value is TrainingMode {
  return (TRAINING_MODES as readonly string[]).includes(value);
}

function isTrainingRuleId(value: string): value is TrainingRuleId {
  return (TRAINING_RULE_IDS as readonly string[]).includes(value);
}

function isDiscardPlayStyle(value: string): value is NonNullable<TrainingRecord["discardStyle"]> {
  return (DISCARD_PLAY_STYLES as readonly string[]).includes(value);
}

function isSeat(value: string): value is OpponentState["seat"] {
  return value === "left" || value === "across" || value === "right";
}

function isTileId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < TILE_KIND_COUNT;
}

function normalizeTileArray(input: unknown): number[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const tiles: number[] = [];
  for (const item of input) {
    if (!isTileId(item)) {
      return null;
    }
    tiles.push(item);
  }
  return tiles;
}

function normalizeMelds(input: unknown): number[][] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const melds: number[][] = [];
  for (const meld of input) {
    const normalized = normalizeTileArray(meld);
    if (!normalized) {
      return null;
    }
    melds.push(normalized);
  }
  return melds;
}

function normalizeOpponent(input: unknown): OpponentState | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const raw = input as Partial<OpponentState>;
  if (typeof raw.seat !== "string" || !isSeat(raw.seat)) {
    return null;
  }
  if (raw.dingQue !== null && raw.dingQue !== "wan" && raw.dingQue !== "tiao" && raw.dingQue !== "tong") {
    return null;
  }

  const discards = normalizeTileArray(raw.discards);
  const melds = normalizeMelds(raw.melds);
  if (!discards || !melds) {
    return null;
  }

  return {
    seat: raw.seat,
    dingQue: raw.dingQue,
    discards,
    melds,
  };
}

function normalizeRemainingCounts(input: unknown): number[] | null {
  if (!Array.isArray(input) || input.length !== TILE_KIND_COUNT) {
    return null;
  }

  const counts: number[] = [];
  for (const item of input) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 0 || item > 4) {
      return null;
    }
    counts.push(item);
  }
  return counts;
}

export function cloneScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    selfHand: scenario.selfHand.slice(),
    opponents: scenario.opponents.map((opponent) => ({
      ...opponent,
      discards: opponent.discards.slice(),
      melds: opponent.melds.map((meld) => meld.slice()),
    })),
    remainingCounts: scenario.remainingCounts.slice(),
  };
}

function normalizeScenario(input: unknown): Scenario | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const raw = input as Partial<Scenario>;
  if (typeof raw.mode !== "string" || !isTrainingMode(raw.mode)) {
    return null;
  }

  const normalizedRuleId = typeof raw.ruleId === "string" ? (LEGACY_RULE_ALIAS[raw.ruleId] ?? raw.ruleId) : "";
  const ruleId = isTrainingRuleId(normalizedRuleId) ? normalizedRuleId : null;
  if (!ruleId) {
    return null;
  }

  const selfHand = normalizeTileArray(raw.selfHand);
  if (!selfHand) {
    return null;
  }

  if (
    raw.selfDingQue !== null &&
    raw.selfDingQue !== "wan" &&
    raw.selfDingQue !== "tiao" &&
    raw.selfDingQue !== "tong"
  ) {
    return null;
  }

  if (typeof raw.round !== "number" || !Number.isInteger(raw.round) || raw.round < 0 || raw.round > 30) {
    return null;
  }

  if (!Array.isArray(raw.opponents)) {
    return null;
  }

  const opponents: OpponentState[] = [];
  for (const opponent of raw.opponents) {
    const normalizedOpponent = normalizeOpponent(opponent);
    if (!normalizedOpponent) {
      return null;
    }
    opponents.push(normalizedOpponent);
  }

  const remainingCounts = normalizeRemainingCounts(raw.remainingCounts);
  if (!remainingCounts) {
    return null;
  }

  return {
    mode: raw.mode,
    ruleId,
    selfHand,
    selfDingQue: raw.selfDingQue,
    opponents,
    round: raw.round,
    remainingCounts,
  };
}

function fingerprintHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function getScenarioId(scenario: Scenario): string {
  const normalized = {
    mode: scenario.mode,
    ruleId: scenario.ruleId,
    selfHand: scenario.selfHand,
    selfDingQue: scenario.selfDingQue,
    round: scenario.round,
    opponents: scenario.opponents,
    remainingCounts: scenario.remainingCounts,
  };
  const encoded = JSON.stringify(normalized);
  return `${scenario.mode}-${scenario.ruleId}-${fingerprintHash(encoded)}`;
}

function readJsonArray(key: string): unknown[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, input: unknown[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(input));
}

function normalizeRecord(input: unknown): TrainingRecord | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const item = input as Partial<TrainingRecord>;
  if (
    typeof item.mode !== "string" ||
    !isTrainingMode(item.mode) ||
    typeof item.score !== "number" ||
    typeof item.correct !== "boolean" ||
    (typeof item.discardStyle !== "undefined" &&
      (typeof item.discardStyle !== "string" || !isDiscardPlayStyle(item.discardStyle))) ||
    (typeof item.elapsedMs !== "undefined" && typeof item.elapsedMs !== "number") ||
    typeof item.summary !== "string" ||
    typeof item.id !== "string" ||
    typeof item.createdAt !== "string"
  ) {
    return null;
  }

  const normalizedRuleId = typeof item.ruleId === "string" ? (LEGACY_RULE_ALIAS[item.ruleId] ?? item.ruleId) : "";
  const ruleId = isTrainingRuleId(normalizedRuleId) ? normalizedRuleId : DEFAULT_RULE_ID;

  return {
    id: item.id,
    mode: item.mode,
    ruleId,
    discardStyle: item.discardStyle,
    correct: item.correct,
    score: item.score,
    elapsedMs: item.elapsedMs,
    createdAt: item.createdAt,
    summary: item.summary,
  };
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
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeRecord(item))
        .filter((item): item is TrainingRecord => Boolean(item));
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

function normalizeStoredScenarioQuestion(input: unknown): StoredScenarioQuestion | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const raw = input as Partial<StoredScenarioQuestion>;
  const scenario = normalizeScenario(raw.scenario);
  if (!scenario) {
    return null;
  }

  const normalizedMode = typeof raw.mode === "string" && isTrainingMode(raw.mode) ? raw.mode : scenario.mode;
  const normalizedRuleIdRaw =
    typeof raw.ruleId === "string" ? (LEGACY_RULE_ALIAS[raw.ruleId] ?? raw.ruleId) : scenario.ruleId;
  const normalizedRuleId = isTrainingRuleId(normalizedRuleIdRaw) ? normalizedRuleIdRaw : scenario.ruleId;
  const wrongCount =
    typeof raw.wrongCount === "number" && Number.isInteger(raw.wrongCount) && raw.wrongCount >= 0 ? raw.wrongCount : 0;

  const normalizedScenario = cloneScenario({
    ...scenario,
    mode: normalizedMode,
    ruleId: normalizedRuleId,
  });

  return {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : getScenarioId(normalizedScenario),
    mode: normalizedMode,
    ruleId: normalizedRuleId,
    scenario: normalizedScenario,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
    wrongCount,
  };
}

function loadScenarioCollection(key: string): StoredScenarioQuestion[] {
  return readJsonArray(key)
    .map((item) => normalizeStoredScenarioQuestion(item))
    .filter((item): item is StoredScenarioQuestion => Boolean(item))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function saveScenarioCollection(key: string, input: StoredScenarioQuestion[]): void {
  writeJsonArray(key, input.slice(0, MAX_SCENARIO_COLLECTION));
}

function collectionMatches(
  item: StoredScenarioQuestion,
  options?: { mode?: TrainingMode; ruleId?: TrainingRuleId },
): boolean {
  if (!options) {
    return true;
  }
  if (options.mode && item.mode !== options.mode) {
    return false;
  }
  if (options.ruleId && item.ruleId !== options.ruleId) {
    return false;
  }
  return true;
}

function upsertCollectionItem(
  items: StoredScenarioQuestion[],
  scenario: Scenario,
  updater?: (existing: StoredScenarioQuestion | null) => StoredScenarioQuestion,
): StoredScenarioQuestion[] {
  const scenarioCopy = cloneScenario(scenario);
  const id = getScenarioId(scenarioCopy);
  const now = new Date().toISOString();
  const index = items.findIndex((item) => item.id === id);
  const existing = index >= 0 ? items[index] : null;

  const nextItem =
    updater?.(existing) ??
    ({
      id,
      mode: scenarioCopy.mode,
      ruleId: scenarioCopy.ruleId,
      scenario: scenarioCopy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      wrongCount: existing?.wrongCount ?? 0,
    } satisfies StoredScenarioQuestion);

  const next = items.slice();
  if (index >= 0) {
    next.splice(index, 1);
  }
  next.unshift(nextItem);
  return next;
}

export function loadFavoriteScenarios(options?: {
  mode?: TrainingMode;
  ruleId?: TrainingRuleId;
}): StoredScenarioQuestion[] {
  return loadScenarioCollection(FAVORITES_KEY).filter((item) => collectionMatches(item, options));
}

export function loadMistakeScenarios(options?: {
  mode?: TrainingMode;
  ruleId?: TrainingRuleId;
}): StoredScenarioQuestion[] {
  return loadScenarioCollection(MISTAKES_KEY).filter((item) => collectionMatches(item, options));
}

export function isScenarioFavorited(scenario: Scenario): boolean {
  const id = getScenarioId(scenario);
  return loadScenarioCollection(FAVORITES_KEY).some((item) => item.id === id);
}

export function isScenarioInMistakes(scenario: Scenario): boolean {
  const id = getScenarioId(scenario);
  return loadScenarioCollection(MISTAKES_KEY).some((item) => item.id === id);
}

export function toggleFavoriteScenario(scenario: Scenario): boolean {
  const favorites = loadScenarioCollection(FAVORITES_KEY);
  const id = getScenarioId(scenario);
  const existingIndex = favorites.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    const next = favorites.slice();
    next.splice(existingIndex, 1);
    saveScenarioCollection(FAVORITES_KEY, next);
    return false;
  }

  const next = upsertCollectionItem(favorites, scenario);
  saveScenarioCollection(FAVORITES_KEY, next);
  return true;
}

export function removeFavoriteScenario(id: string): void {
  const favorites = loadScenarioCollection(FAVORITES_KEY);
  saveScenarioCollection(
    FAVORITES_KEY,
    favorites.filter((item) => item.id !== id),
  );
}

export function addMistakeScenario(scenario: Scenario): void {
  const mistakes = loadScenarioCollection(MISTAKES_KEY);
  const next = upsertCollectionItem(mistakes, scenario, (existing) => {
    const scenarioCopy = cloneScenario(scenario);
    const id = getScenarioId(scenarioCopy);
    const now = new Date().toISOString();
    return {
      id,
      mode: scenarioCopy.mode,
      ruleId: scenarioCopy.ruleId,
      scenario: scenarioCopy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      wrongCount: (existing?.wrongCount ?? 0) + 1,
    };
  });
  saveScenarioCollection(MISTAKES_KEY, next);
}

export function removeMistakeScenario(id: string): void {
  const mistakes = loadScenarioCollection(MISTAKES_KEY);
  saveScenarioCollection(
    MISTAKES_KEY,
    mistakes.filter((item) => item.id !== id),
  );
}

export type ProgressStats = {
  total: number;
  avgScore: number;
  accuracy: number;
  byMode: Record<TrainingMode, { count: number; avgScore: number; accuracy: number }>;
  byRule: Record<TrainingRuleId, { count: number; avgScore: number; accuracy: number }>;
};

export function summarizeRecords(records: TrainingRecord[]): ProgressStats {
  const baseByMode: ProgressStats["byMode"] = {
    quick: { count: 0, avgScore: 0, accuracy: 0 },
    discard: { count: 0, avgScore: 0, accuracy: 0 },
  };
  const baseByRule = Object.fromEntries(
    TRAINING_RULE_IDS.map((ruleId) => [ruleId, { count: 0, avgScore: 0, accuracy: 0 }]),
  ) as ProgressStats["byRule"];

  if (records.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      accuracy: 0,
      byMode: baseByMode,
      byRule: baseByRule,
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

    const ruleStats = baseByRule[item.ruleId];
    if (ruleStats) {
      ruleStats.count += 1;
      ruleStats.avgScore += item.score;
      ruleStats.accuracy += item.correct ? 1 : 0;
    }
  }

  for (const mode of Object.keys(baseByMode) as TrainingMode[]) {
    const modeStats = baseByMode[mode];
    if (modeStats.count > 0) {
      modeStats.avgScore = Math.round(modeStats.avgScore / modeStats.count);
      modeStats.accuracy = Math.round((modeStats.accuracy / modeStats.count) * 100);
    }
  }

  for (const ruleId of TRAINING_RULE_IDS) {
    const ruleStats = baseByRule[ruleId];
    if (ruleStats.count > 0) {
      ruleStats.avgScore = Math.round(ruleStats.avgScore / ruleStats.count);
      ruleStats.accuracy = Math.round((ruleStats.accuracy / ruleStats.count) * 100);
    }
  }

  return {
    total: records.length,
    avgScore: Math.round(scoreSum / records.length),
    accuracy: Math.round((correctCount / records.length) * 100),
    byMode: baseByMode,
    byRule: baseByRule,
  };
}
