import {
  pickRandomTileId,
  randomInt,
  removeTileOnce,
  tileIdToSuit,
  uniqueTileIds,
  createFullCounts,
} from "@/engine/mahjong/tiles";
import { getQuickOptionTilesByRule, getTrainingRuleStrategy } from "@/engine/mahjong/rule-strategies";
import { estimateShanten, getEffectiveTileInfo, getWinningTileCandidates } from "@/engine/mahjong/evaluator";
import { Scenario, Suit, TrainingMode, TrainingRuleId } from "@/types/mahjong";

function drawPung(counts: number[]): number[] | null {
  const candidates: number[] = [];
  for (let id = 0; id < counts.length; id += 1) {
    if (counts[id] >= 3) {
      candidates.push(id);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const target = candidates[randomInt(0, candidates.length - 1)];
  counts[target] -= 3;
  return [target, target, target];
}

function buildOpponents(counts: number[], ruleId: TrainingRuleId): Scenario["opponents"] {
  const strategy = getTrainingRuleStrategy(ruleId);
  const seats: Scenario["opponents"][number]["seat"][] = ["left", "across", "right"];

  return seats.map((seat) => {
    const melds: number[][] = [];
    const meldCount = randomInt(0, 2);

    for (let i = 0; i < meldCount; i += 1) {
      if (Math.random() < 0.65) {
        const pung = drawPung(counts);
        if (pung) {
          melds.push(pung);
        }
      }
    }

    const discards: number[] = [];
    const discardCount = randomInt(5, 12);
    for (let i = 0; i < discardCount; i += 1) {
      const tile = pickRandomTileId(counts);
      if (tile === -1) {
        break;
      }
      discards.push(tile);
    }

    return {
      seat,
      dingQue: strategy.createOpponentDingQue(),
      discards,
      melds,
    };
  });
}

function createRawScenario(mode: TrainingMode, ruleId: TrainingRuleId): Scenario {
  const strategy = getTrainingRuleStrategy(ruleId);
  const counts = createFullCounts();
  const handSize = mode === "quick" ? 13 : 14;
  const { selfHand, selfDingQue } = strategy.createSelfContext(counts, handSize);
  const opponents = buildOpponents(counts, ruleId);

  return {
    ruleId,
    mode,
    selfHand,
    selfDingQue,
    opponents,
    round: randomInt(3, 14),
    wallRemaining: counts.reduce((sum, current) => sum + current, 0),
    remainingCounts: counts,
  };
}

export function getQuickAnswerCandidates(scenario: Scenario): number[] {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  const waits = getWinningTileCandidates(scenario.selfHand, scenario.remainingCounts);
  return strategy.filterQuickCandidates(waits, scenario);
}

export function getQuickOptionTiles(scenario: Scenario): number[] {
  return getQuickOptionTilesByRule(scenario);
}

function quickModeValid(scenario: Scenario): boolean {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  if (!strategy.isSelfHandValid(scenario)) {
    return false;
  }
  const waits = getQuickAnswerCandidates(scenario);
  return waits.length > 0 && waits.length <= 9;
}

function discardModeValid(scenario: Scenario): boolean {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  if (!strategy.isSelfHandValid(scenario)) {
    return false;
  }

  const options = uniqueTileIds(scenario.selfHand);
  if (options.length < 4) {
    return false;
  }

  const scores = options.map((tileId) => {
    const next = removeTileOnce(scenario.selfHand, tileId);
    const shanten = estimateShanten(next);
    const effective = getEffectiveTileInfo(next, scenario.remainingCounts).copyCount;
    return 20 - shanten * 4 + effective * 0.35;
  });

  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return max - min >= 3;
}

export function generateScenario(mode: TrainingMode, ruleId: TrainingRuleId): Scenario {
  for (let i = 0; i < 220; i += 1) {
    const scenario = createRawScenario(mode, ruleId);
    if (mode === "quick" && quickModeValid(scenario)) {
      return scenario;
    }
    if (mode === "discard" && discardModeValid(scenario)) {
      return scenario;
    }
  }

  return createRawScenario(mode, ruleId);
}

export function hasSelfDingQueTiles(scenario: Scenario): boolean {
  if (!scenario.selfDingQue) {
    return false;
  }
  return scenario.selfHand.some((tileId) => tileIdToSuit(tileId) === scenario.selfDingQue);
}

export function detectFlushSuit(melds: number[][]): Suit | null {
  if (melds.length === 0) {
    return null;
  }

  const firstSuit = tileIdToSuit(melds[0][0]);
  for (const meld of melds) {
    if (!meld.every((tile) => tileIdToSuit(tile) === firstSuit)) {
      return null;
    }
  }
  return firstSuit;
}
