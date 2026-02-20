import {
  drawTiles,
  pickRandomTileId,
  randomInt,
  removeTileOnce,
  tileIdToSuit,
  uniqueTileIds,
  createFullCounts,
} from "@/engine/mahjong/tiles";
import { estimateShanten, getEffectiveTileInfo, getWinningTileCandidates } from "@/engine/mahjong/evaluator";
import { Scenario, Suit, TrainingMode } from "@/types/mahjong";

const SUITS: Suit[] = ["wan", "tiao", "tong"];

function randomSuit(): Suit {
  return SUITS[randomInt(0, SUITS.length - 1)];
}

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

function buildOpponents(counts: number[]): Scenario["opponents"] {
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
      dingQue: randomSuit(),
      discards,
      melds,
    };
  });
}

function createRawScenario(mode: TrainingMode): Scenario {
  const counts = createFullCounts();
  const handSize = mode === "quick" ? 13 : 14;
  const selfDingQue = randomSuit();
  const selfHand = drawTiles(counts, handSize, (tileId) => tileIdToSuit(tileId) !== selfDingQue);
  const opponents = buildOpponents(counts);

  return {
    mode,
    selfHand,
    selfDingQue,
    opponents,
    round: randomInt(3, 14),
    wallRemaining: counts.reduce((sum, current) => sum + current, 0),
    remainingCounts: counts,
  };
}

function quickModeValid(scenario: Scenario): boolean {
  if (hasSelfDingQueTiles(scenario)) {
    return false;
  }
  const waits = getWinningTileCandidates(scenario.selfHand, scenario.remainingCounts);
  return waits.length > 0 && waits.length <= 9;
}

function discardModeValid(scenario: Scenario): boolean {
  if (scenario.selfHand.some((tileId) => tileIdToSuit(tileId) === scenario.selfDingQue)) {
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

export function generateScenario(mode: TrainingMode): Scenario {
  for (let i = 0; i < 220; i += 1) {
    const scenario = createRawScenario(mode);
    if (mode === "quick" && quickModeValid(scenario)) {
      return scenario;
    }
    if (mode === "discard" && discardModeValid(scenario)) {
      return scenario;
    }
  }

  return createRawScenario(mode);
}

export function hasSelfDingQueTiles(scenario: Scenario): boolean {
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
