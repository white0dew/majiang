import { describe, expect, it } from "vitest";

import { getTrainingRuleStrategy } from "@/engine/mahjong/rule-strategies";
import { tileIdToSuit } from "@/engine/mahjong/tiles";
import { evaluateDiscardOptions, evaluateDiscardOptionsByStyle } from "@/engine/scoring/decision";
import { DISCARD_PLAY_STYLES, Scenario, TRAINING_RULE_IDS, TrainingRuleId } from "@/types/mahjong";

const SEATS: Scenario["opponents"][number]["seat"][] = ["left", "across", "right"];

function pickLoop(tiles: readonly number[], start: number, count: number): number[] {
  const result: number[] = [];
  if (tiles.length === 0) {
    return result;
  }
  for (let i = 0; i < count; i += 1) {
    result.push(tiles[(start + i) % tiles.length] as number);
  }
  return result;
}

function consumeSeenTiles(remainingCounts: number[], tiles: number[]): void {
  for (const tileId of tiles) {
    if (tileId >= 0 && tileId < remainingCounts.length && remainingCounts[tileId] > 0) {
      remainingCounts[tileId] -= 1;
    }
  }
}

function createDiscardScenario(ruleId: TrainingRuleId): Scenario {
  const strategy = getTrainingRuleStrategy(ruleId);
  const selfDingQue = strategy.usesDingQue ? "tong" : null;
  const selfCandidatePool =
    strategy.usesDingQue && selfDingQue
      ? strategy.tileIds.filter((tileId) => tileIdToSuit(tileId) !== selfDingQue)
      : [...strategy.tileIds];
  const selfHand = selfCandidatePool.slice(0, 14);
  const remainingCounts = Array.from({ length: 34 }, () => 0);
  for (const tileId of strategy.tileIds) {
    remainingCounts[tileId] = 4;
  }
  consumeSeenTiles(remainingCounts, selfHand);

  const opponents = SEATS.map((seat, index) => {
    const pool = [...strategy.tileIds];
    const discards = pickLoop(pool, 14 + index * 8, 3);
    const meld1 = pickLoop(pool, 20 + index * 8, 3);
    const meld2 = index === 1 ? pickLoop(pool, 23 + index * 8, 3) : [];
    const melds = meld2.length > 0 ? [meld1, meld2] : [meld1];
    consumeSeenTiles(remainingCounts, discards);
    consumeSeenTiles(remainingCounts, melds.flat());

    return {
      seat,
      dingQue: strategy.usesDingQue ? (index === 0 ? "wan" : index === 1 ? "tiao" : "tong") : null,
      discards,
      melds,
    };
  });

  return {
    mode: "discard",
    ruleId,
    selfHand,
    selfDingQue,
    opponents,
    round: 9,
    remainingCounts,
  };
}

function expectSortedByTotalScoreDesc(items: Array<{ totalScore: number }>): void {
  for (let i = 1; i < items.length; i += 1) {
    expect(items[i - 1]?.totalScore ?? 0).toBeGreaterThanOrEqual(items[i]?.totalScore ?? 0);
  }
}

describe("regions/all-regions-discard", () => {
  it.each(TRAINING_RULE_IDS)("%s 应能输出稳定的弃牌评分与明细", (ruleId) => {
    const scenario = createDiscardScenario(ruleId);
    const evaluations = evaluateDiscardOptions(scenario, "balanced");
    const uniqueCount = new Set(scenario.selfHand).size;

    expect(evaluations).toHaveLength(uniqueCount);
    expect([...evaluations.map((item) => item.tileId)].sort((a, b) => a - b)).toEqual(
      [...new Set(scenario.selfHand)].sort((a, b) => a - b),
    );
    expectSortedByTotalScoreDesc(evaluations);

    for (const item of evaluations) {
      expect(item.totalScore).toBeGreaterThanOrEqual(0);
      expect(item.totalScore).toBeLessThanOrEqual(100);
      expect(item.risk).toBeGreaterThanOrEqual(0);
      expect(item.risk).toBeLessThanOrEqual(1);
      expect(item.riskDetail.averageRisk).toBeCloseTo(item.risk, 6);
      expect(item.riskDetail.opponents).toHaveLength(3);
      expect(item.effectiveTiles).toBe(
        item.effectiveTileDetails.reduce((sum, detail) => sum + detail.remainCount, 0),
      );
      expect(item.efficiencyDetail.finalScore).toBeCloseTo(item.efficiency, 6);
      expect(item.demandAvoidanceDetail.finalScore).toBeCloseTo(item.demandAvoidance, 6);
      expect(item.riskControlDetail.finalScore).toBeCloseTo(item.riskControl, 6);
    }
  });

  it.each(TRAINING_RULE_IDS)("%s 三种打法应共享候选集合并保持有序", (ruleId) => {
    const scenario = createDiscardScenario(ruleId);
    const byStyle = evaluateDiscardOptionsByStyle(scenario);
    const baseline = [...new Set(scenario.selfHand)].sort((a, b) => a - b);

    for (const style of DISCARD_PLAY_STYLES) {
      const list = byStyle[style];
      expect(list).toHaveLength(baseline.length);
      expect([...list.map((item) => item.tileId)].sort((a, b) => a - b)).toEqual(baseline);
      expectSortedByTotalScoreDesc(list);
    }
  });
});
