import {
  createCountsByTileIds,
  isNumberTile,
  pickRandomTileId,
  randomInt,
  removeTileOnce,
  tileIdToSuit,
  uniqueTileIds,
} from "@/engine/mahjong/tiles";
import { getQuickOptionTilesByRule, getTrainingRuleStrategy } from "@/engine/mahjong/rule-strategies";
import {
  estimateShanten,
  estimateShantenWithHainanHaikou,
  estimateShantenWithHongzhongLaizi,
  estimateShantenWithWuhanLaiziJiang258,
  estimateShantenWithJiang258,
  getEffectiveTileInfo,
  getEffectiveTileInfoWithHainanHaikou,
  getEffectiveTileInfoWithHongzhongLaizi,
  getEffectiveTileInfoWithWuhanLaiziJiang258,
  getEffectiveTileInfoWithJiang258,
  getWinningTileCandidates,
  getWinningTileCandidatesWithHainanHaikou,
  getWinningTileCandidatesWithHongzhongLaizi,
  getWinningTileCandidatesWithWuhanLaiziJiang258,
} from "@/engine/mahjong/evaluator";
import { Scenario, Suit, TrainingMode, TrainingRuleId } from "@/types/mahjong";

const MAX_SCENARIO_ATTEMPTS: Record<TrainingMode, number> = {
  quick: 20000,
  discard: 220,
};

function drawPung(counts: number[], canUseTile: (tileId: number) => boolean = () => true): number[] | null {
  const candidates: number[] = [];
  for (let id = 0; id < counts.length; id += 1) {
    if (counts[id] >= 3 && canUseTile(id)) {
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
    const dingQue = strategy.createOpponentDingQue();
    const canMeldTile = (tileId: number) =>
      !(strategy.usesDingQue && dingQue && tileIdToSuit(tileId) === dingQue);
    const melds: number[][] = [];
    const meldCount = randomInt(0, 2);

    for (let i = 0; i < meldCount; i += 1) {
      if (Math.random() < 0.65) {
        const pung = drawPung(counts, canMeldTile);
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
      dingQue,
      discards,
      melds,
    };
  });
}

function createRawScenario(mode: TrainingMode, ruleId: TrainingRuleId): Scenario {
  const strategy = getTrainingRuleStrategy(ruleId);
  const counts = createCountsByTileIds(strategy.tileIds);
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
    remainingCounts: counts,
  };
}

export function getQuickAnswerCandidates(scenario: Scenario): number[] {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  const waits =
    scenario.ruleId === "guangdong-hongzhong"
      ? getWinningTileCandidatesWithHongzhongLaizi(
          scenario.selfHand,
          scenario.remainingCounts,
          strategy.tileIds,
        )
      : scenario.ruleId === "wuhan-hongzhong-fa-laizi-gang"
        ? getWinningTileCandidatesWithWuhanLaiziJiang258(
            scenario.selfHand,
            scenario.remainingCounts,
            strategy.tileIds,
          )
      : scenario.ruleId === "hainan-mahjong"
        ? getWinningTileCandidatesWithHainanHaikou(
            scenario.selfHand,
            scenario.remainingCounts,
            strategy.tileIds,
          )
      : getWinningTileCandidates(scenario.selfHand, scenario.remainingCounts);
  return strategy.filterQuickCandidates(waits, scenario);
}

export function getQuickOptionTiles(scenario: Scenario): number[] {
  return getQuickOptionTilesByRule(scenario);
}

function opponentsValidByRule(scenario: Scenario): boolean {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  if (!strategy.usesDingQue) {
    return true;
  }

  return scenario.opponents.every((opponent) =>
    opponent.dingQue
      ? opponent.melds.every((meld) => meld.every((tileId) => tileIdToSuit(tileId) !== opponent.dingQue))
      : true,
  );
}

function quickModeValid(scenario: Scenario): boolean {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  if (!strategy.isSelfHandValid(scenario)) {
    return false;
  }
  if (!opponentsValidByRule(scenario)) {
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
  if (!opponentsValidByRule(scenario)) {
    return false;
  }

  const options = uniqueTileIds(scenario.selfHand);
  if (options.length < 4) {
    return false;
  }

  const scores = options.map((tileId) => {
    const next = removeTileOnce(scenario.selfHand, tileId);
    const shanten =
      scenario.ruleId === "changsha-258-jiang"
        ? estimateShantenWithJiang258(next)
        : scenario.ruleId === "guangdong-hongzhong"
          ? estimateShantenWithHongzhongLaizi(next)
          : scenario.ruleId === "wuhan-hongzhong-fa-laizi-gang"
            ? estimateShantenWithWuhanLaiziJiang258(next)
            : scenario.ruleId === "hainan-mahjong"
              ? estimateShantenWithHainanHaikou(next)
          : estimateShanten(next);
    const effective =
      scenario.ruleId === "changsha-258-jiang"
        ? getEffectiveTileInfoWithJiang258(next, scenario.remainingCounts).copyCount
        : scenario.ruleId === "guangdong-hongzhong"
          ? getEffectiveTileInfoWithHongzhongLaizi(next, scenario.remainingCounts).copyCount
          : scenario.ruleId === "wuhan-hongzhong-fa-laizi-gang"
            ? getEffectiveTileInfoWithWuhanLaiziJiang258(next, scenario.remainingCounts).copyCount
            : scenario.ruleId === "hainan-mahjong"
              ? getEffectiveTileInfoWithHainanHaikou(next, scenario.remainingCounts).copyCount
          : getEffectiveTileInfo(next, scenario.remainingCounts).copyCount;
    return 20 - shanten * 4 + effective * 0.35;
  });

  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return max - min >= 3;
}

export function generateScenario(mode: TrainingMode, ruleId: TrainingRuleId): Scenario {
  const maxAttempts = MAX_SCENARIO_ATTEMPTS[mode];
  for (let i = 0; i < maxAttempts; i += 1) {
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

  const firstTile = melds[0][0];
  if (!isNumberTile(firstTile)) {
    return null;
  }
  const firstSuit = tileIdToSuit(firstTile);
  if (!firstSuit) {
    return null;
  }
  for (const meld of melds) {
    if (!meld.every((tile) => isNumberTile(tile) && tileIdToSuit(tile) === firstSuit)) {
      return null;
    }
  }
  return firstSuit;
}
