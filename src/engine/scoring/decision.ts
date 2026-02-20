import { getEffectiveTileInfo, estimateShanten } from "@/engine/mahjong/evaluator";
import { detectFlushSuit } from "@/engine/mahjong/scenario";
import { removeTileOnce, tileIdToRank, tileIdToSuit, tileIdToLabel, uniqueTileIds } from "@/engine/mahjong/tiles";
import { DiscardEvaluation, Scenario } from "@/types/mahjong";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateTileRiskAndDemand(tileId: number, scenario: Scenario): { risk: number; demand: number } {
  const suit = tileIdToSuit(tileId);
  const tileRank = tileIdToRank(tileId);

  let riskTotal = 0;
  let demandTotal = 0;

  for (const opponent of scenario.opponents) {
    let risk = 0.62;
    let demand = 0.55;

    if (opponent.discards.includes(tileId)) {
      risk -= 0.45;
      demand -= 0.35;
    }

    if (opponent.dingQue === suit) {
      risk -= 0.2;
      demand -= 0.22;
    }

    const flushSuit = detectFlushSuit(opponent.melds);
    if (flushSuit === suit) {
      risk += 0.18;
      demand += 0.2;
    }

    if (opponent.melds.length >= 2) {
      risk += 0.06;
      demand += 0.05;
    }

    if (tileRank >= 3 && tileRank <= 7) {
      risk += 0.08;
      demand += 0.06;
    } else {
      risk -= 0.03;
      demand -= 0.03;
    }

    riskTotal += clamp(risk, 0.03, 0.95);
    demandTotal += clamp(demand, 0.03, 0.95);
  }

  return {
    risk: riskTotal / scenario.opponents.length,
    demand: demandTotal / scenario.opponents.length,
  };
}

function buildReasons(result: DiscardEvaluation): string[] {
  const reasons: string[] = [];

  if (result.shantenAfter <= 1) {
    reasons.push("向听较低，可保持进攻节奏");
  } else if (result.shantenAfter >= 3) {
    reasons.push("向听偏高，优先保留改良空间");
  }

  if (result.effectiveTiles >= 22) {
    reasons.push("有效进张多，后续摸牌弹性较大");
  } else if (result.effectiveTiles <= 10) {
    reasons.push("有效进张偏少，牌型延展受限");
  }

  if (result.risk <= 0.32) {
    reasons.push("放铳风险较低，适合当前节奏");
  } else if (result.risk >= 0.55) {
    reasons.push("放铳风险偏高，需警惕他家成牌");
  }

  return reasons;
}

export function evaluateDiscardOptions(scenario: Scenario): DiscardEvaluation[] {
  const options = uniqueTileIds(scenario.selfHand);

  const results = options.map((tileId) => {
    const nextHand = removeTileOnce(scenario.selfHand, tileId);
    const shantenAfter = estimateShanten(nextHand);
    const effective = getEffectiveTileInfo(nextHand, scenario.remainingCounts);
    const { risk, demand } = estimateTileRiskAndDemand(tileId, scenario);

    const efficiency = clamp(100 - shantenAfter * 22 + effective.copyCount * 1.3, 0, 100);
    const demandAvoidance = clamp(100 - demand * 100, 0, 100);
    const riskControl = clamp(100 - risk * 100 + (shantenAfter <= 1 ? 8 : 0), 0, 100);

    const totalScore = clamp(
      efficiency * 0.4 + demandAvoidance * 0.3 + riskControl * 0.3,
      0,
      100,
    );

    const evaluation: DiscardEvaluation = {
      tileId,
      efficiency,
      demandAvoidance,
      riskControl,
      totalScore,
      shantenAfter,
      effectiveTiles: effective.copyCount,
      risk,
      reasons: [],
    };

    evaluation.reasons = buildReasons(evaluation);
    return evaluation;
  });

  return results.sort((a, b) => b.totalScore - a.totalScore);
}

export function explainDiscardComparison(
  best: DiscardEvaluation,
  chosen: DiscardEvaluation,
): string[] {
  if (best.tileId === chosen.tileId) {
    return ["你的选择与系统推荐一致，这手在效率与风险之间更平衡。"];
  }

  const bestLabel = tileIdToLabel(best.tileId);
  const chosenLabel = tileIdToLabel(chosen.tileId);
  const reasons: string[] = [];

  reasons.push(
    `${bestLabel} 总分更高 ${Math.max(0.1, best.totalScore - chosen.totalScore).toFixed(1)} 分（${best.totalScore.toFixed(1)} vs ${chosen.totalScore.toFixed(1)}）`,
  );

  if (best.shantenAfter < chosen.shantenAfter) {
    reasons.push(
      `打 ${bestLabel} 后向听更低（${best.shantenAfter} 向听 vs ${chosen.shantenAfter} 向听），更容易先听牌`,
    );
  } else if (best.effectiveTiles > chosen.effectiveTiles) {
    reasons.push(
      `两者向听接近时，打 ${bestLabel} 的有效进张更多（${best.effectiveTiles} 张 vs ${chosen.effectiveTiles} 张）`,
    );
  }

  if (best.risk + 0.03 < chosen.risk) {
    reasons.push(
      `打 ${bestLabel} 放铳风险更低（${Math.round(best.risk * 100)}% vs ${Math.round(chosen.risk * 100)}%），防守更稳`,
    );
  }

  if (best.efficiency > chosen.efficiency + 3) {
    reasons.push(
      `${bestLabel} 的进攻效率更好（${best.efficiency.toFixed(0)} vs ${chosen.efficiency.toFixed(0)}）`,
    );
  }

  if (best.demandAvoidance > chosen.demandAvoidance + 3) {
    reasons.push(
      `打 ${bestLabel} 更不容易给他家喂牌（需牌规避 ${best.demandAvoidance.toFixed(0)} vs ${chosen.demandAvoidance.toFixed(0)}）`,
    );
  }

  if (reasons.length === 1) {
    reasons.push(
      `相比 ${chosenLabel}，${bestLabel} 在效率、风险和需牌规避三项综合更优`,
    );
  }

  return reasons.slice(0, 4);
}

export function quickModeScore(selected: number[], answer: number[]): {
  score: number;
  correct: boolean;
  precision: number;
  recall: number;
  summary: string;
} {
  const selectedSet = new Set(selected);
  const answerSet = new Set(answer);

  let truePositive = 0;
  for (const tile of selectedSet) {
    if (answerSet.has(tile)) {
      truePositive += 1;
    }
  }

  const precision =
    selectedSet.size === 0 ? (answerSet.size === 0 ? 1 : 0) : truePositive / selectedSet.size;
  const recall =
    answerSet.size === 0 ? (selectedSet.size === 0 ? 1 : 0) : truePositive / answerSet.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const score = Math.round(f1 * 100);
  const exact = selectedSet.size === answerSet.size && truePositive === answerSet.size;

  const answerLabel = answer.length
    ? answer.map((tileId) => tileIdToLabel(tileId)).join("、")
    : "当前非听牌";

  return {
    score,
    correct: exact,
    precision,
    recall,
    summary: `正确答案：${answerLabel}`,
  };
}
