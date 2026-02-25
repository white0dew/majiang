import {
  getEffectiveTileInfo,
  getEffectiveTileInfoWithHainanHaikou,
  getEffectiveTileInfoWithHongzhongLaizi,
  getEffectiveTileInfoWithWuhanLaiziJiang258,
  getEffectiveTileInfoWithJiang258,
  estimateShanten,
  estimateShantenWithHainanHaikou,
  estimateShantenWithHongzhongLaizi,
  estimateShantenWithWuhanLaiziJiang258,
  estimateShantenWithJiang258,
} from "@/engine/mahjong/evaluator";
import { detectFlushSuit } from "@/engine/mahjong/scenario";
import { removeTileOnce, tileIdToRank, tileIdToSuit, tileIdToLabel, uniqueTileIds } from "@/engine/mahjong/tiles";
import {
  DiscardEvaluation,
  DiscardMetricBreakdown,
  DiscardOpponentRiskDetail,
  DiscardPlayStyle,
  DiscardRiskFactor,
  DISCARD_PLAY_STYLES,
  Scenario,
} from "@/types/mahjong";

type DiscardStyleProfile = {
  label: string;
  description: string;
  acceptanceGap: number;
  weights: {
    efficiency: number;
    demandAvoidance: number;
    riskControl: number;
  };
};

const DISCARD_STYLE_PROFILES: Record<DiscardPlayStyle, DiscardStyleProfile> = {
  balanced: {
    label: "均衡",
    description: "兼顾进攻效率与防守稳定。",
    acceptanceGap: 2,
    weights: {
      efficiency: 0.4,
      demandAvoidance: 0.3,
      riskControl: 0.3,
    },
  },
  aggressive: {
    label: "激进",
    description: "优先提速听牌与进张，接受更高波动。",
    acceptanceGap: 3,
    weights: {
      efficiency: 0.75,
      demandAvoidance: 0.15,
      riskControl: 0.1,
    },
  },
  steady: {
    label: "稳健",
    description: "优先规避放铳与喂牌，降低失误成本。",
    acceptanceGap: 1.5,
    weights: {
      efficiency: 0.15,
      demandAvoidance: 0.35,
      riskControl: 0.5,
    },
  },
};

type DiscardBaseEvaluation = Omit<DiscardEvaluation, "totalScore" | "reasons">;
type DiscardDecisionLevel = "best" | "acceptable" | "improvable";

export type DiscardDecisionInsight = {
  level: DiscardDecisionLevel;
  title: string;
  gapScore: number;
  gapSummary: string;
  scoreNote: string;
  actionTips: string[];
};

export type DiscardScoreFormula = {
  totalFormula: string;
  componentFormulas: string[];
  termDefinitions: Array<{ term: string; explain: string }>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateTileRiskAndDemand(tileId: number, scenario: Scenario): {
  risk: number;
  demand: number;
  opponents: DiscardOpponentRiskDetail[];
} {
  const suit = tileIdToSuit(tileId);
  const tileRank = tileIdToRank(tileId);
  const safeOpponentCount = Math.max(1, scenario.opponents.length);

  let riskTotal = 0;
  let demandTotal = 0;
  const opponentDetails: DiscardOpponentRiskDetail[] = [];

  for (const opponent of scenario.opponents) {
    const factors: DiscardRiskFactor[] = [];
    const baseRisk = 0.62;
    const baseDemand = 0.55;
    let risk = baseRisk;
    let demand = baseDemand;

    if (opponent.discards.includes(tileId)) {
      risk -= 0.45;
      demand -= 0.35;
      factors.push({
        label: "该牌已在对手河里出现（现物）",
        riskDelta: -0.45,
        demandDelta: -0.35,
      });
    }

    if (suit && opponent.dingQue === suit) {
      risk -= 0.2;
      demand -= 0.22;
      factors.push({
        label: "对手该花色定缺",
        riskDelta: -0.2,
        demandDelta: -0.22,
      });
    }

    const flushSuit = detectFlushSuit(opponent.melds);
    if (flushSuit && suit && flushSuit === suit) {
      risk += 0.18;
      demand += 0.2;
      factors.push({
        label: "对手副露同花色集中（清一色倾向）",
        riskDelta: 0.18,
        demandDelta: 0.2,
      });
    }

    if (opponent.melds.length >= 2) {
      risk += 0.06;
      demand += 0.05;
      factors.push({
        label: "对手副露较多（>=2 组）",
        riskDelta: 0.06,
        demandDelta: 0.05,
      });
    }

    if (tileRank >= 3 && tileRank <= 7) {
      risk += 0.08;
      demand += 0.06;
      factors.push({
        label: "中张（3-7）通常更易放铳",
        riskDelta: 0.08,
        demandDelta: 0.06,
      });
    } else {
      risk -= 0.03;
      demand -= 0.03;
      factors.push({
        label: "幺九牌相对更安全",
        riskDelta: -0.03,
        demandDelta: -0.03,
      });
    }

    const finalRisk = clamp(risk, 0.03, 0.95);
    const finalDemand = clamp(demand, 0.03, 0.95);
    const riskClampDelta = finalRisk - risk;
    const demandClampDelta = finalDemand - demand;
    if (riskClampDelta !== 0 || demandClampDelta !== 0) {
      factors.push({
        label: "边界裁剪（clamp 到 3%-95%）",
        riskDelta: riskClampDelta,
        demandDelta: demandClampDelta,
      });
    }

    riskTotal += finalRisk;
    demandTotal += finalDemand;
    opponentDetails.push({
      seat: opponent.seat,
      baseRisk,
      baseDemand,
      finalRisk,
      finalDemand,
      factors,
    });
  }

  return {
    risk: riskTotal / safeOpponentCount,
    demand: demandTotal / safeOpponentCount,
    opponents: opponentDetails,
  };
}

function buildMetricBreakdown(input: {
  formula: string;
  baseScore: number;
  penalties: Array<{ label: string; value: number }>;
  bonuses?: Array<{ label: string; value: number }>;
  finalScore: number;
}): DiscardMetricBreakdown {
  return {
    formula: input.formula,
    baseScore: input.baseScore,
    penaltyTerms: input.penalties,
    bonusTerms: input.bonuses ?? [],
    finalScore: input.finalScore,
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

function evaluateDiscardBaseOptions(scenario: Scenario): DiscardBaseEvaluation[] {
  const options = uniqueTileIds(scenario.selfHand);

  return options.map((tileId) => {
    const nextHand = removeTileOnce(scenario.selfHand, tileId);
    const shantenAfter =
      scenario.ruleId === "changsha-258-jiang"
        ? estimateShantenWithJiang258(nextHand)
        : scenario.ruleId === "guangdong-hongzhong"
          ? estimateShantenWithHongzhongLaizi(nextHand)
          : scenario.ruleId === "wuhan-hongzhong-fa-laizi-gang"
            ? estimateShantenWithWuhanLaiziJiang258(nextHand)
            : scenario.ruleId === "hainan-mahjong"
              ? estimateShantenWithHainanHaikou(nextHand)
          : estimateShanten(nextHand);
    const effective =
      scenario.ruleId === "changsha-258-jiang"
        ? getEffectiveTileInfoWithJiang258(nextHand, scenario.remainingCounts)
        : scenario.ruleId === "guangdong-hongzhong"
          ? getEffectiveTileInfoWithHongzhongLaizi(nextHand, scenario.remainingCounts)
          : scenario.ruleId === "wuhan-hongzhong-fa-laizi-gang"
            ? getEffectiveTileInfoWithWuhanLaiziJiang258(nextHand, scenario.remainingCounts)
            : scenario.ruleId === "hainan-mahjong"
              ? getEffectiveTileInfoWithHainanHaikou(nextHand, scenario.remainingCounts)
          : getEffectiveTileInfo(nextHand, scenario.remainingCounts);
    const riskEstimate = estimateTileRiskAndDemand(tileId, scenario);
    const { risk, demand } = riskEstimate;
    const lowShantenBonus = shantenAfter <= 1 ? 8 : 0;
    const efficiency = clamp(100 - shantenAfter * 22 + effective.copyCount * 1.3, 0, 100);
    const demandAvoidance = clamp(100 - demand * 100, 0, 100);
    const riskControl = clamp(100 - risk * 100 + lowShantenBonus, 0, 100);

    const effectiveTileDetails = effective.improvingTiles
      .map((improvingTileId) => ({
        tileId: improvingTileId,
        remainCount: Math.max(0, scenario.remainingCounts[improvingTileId] ?? 0),
      }))
      .sort((a, b) => b.remainCount - a.remainCount || a.tileId - b.tileId);

    const evaluation: DiscardBaseEvaluation = {
      tileId,
      efficiency,
      demandAvoidance,
      riskControl,
      shantenAfter,
      effectiveTiles: effective.copyCount,
      risk,
      effectiveTileDetails,
      riskDetail: {
        averageRisk: risk,
        averageDemand: demand,
        opponents: riskEstimate.opponents,
      },
      efficiencyDetail: buildMetricBreakdown({
        formula: "效率 = clamp(100 - 向听 × 22 + 有效进张 × 1.3, 0, 100)",
        baseScore: 100,
        penalties: [{ label: `向听惩罚（${shantenAfter} × 22）`, value: shantenAfter * 22 }],
        bonuses: [{ label: `进张加成（${effective.copyCount} × 1.3）`, value: effective.copyCount * 1.3 }],
        finalScore: efficiency,
      }),
      demandAvoidanceDetail: buildMetricBreakdown({
        formula: "需牌规避 = clamp(100 - 需牌概率 × 100, 0, 100)",
        baseScore: 100,
        penalties: [{ label: `需牌概率惩罚（${Math.round(demand * 1000) / 10}%）`, value: demand * 100 }],
        finalScore: demandAvoidance,
      }),
      riskControlDetail: buildMetricBreakdown({
        formula: "风险控制 = clamp(100 - 放铳风险 × 100 + 低向听奖励, 0, 100)",
        baseScore: 100,
        penalties: [{ label: `放铳风险惩罚（${Math.round(risk * 1000) / 10}%）`, value: risk * 100 }],
        bonuses:
          lowShantenBonus > 0
            ? [{ label: `低向听奖励（向听 ${shantenAfter}）`, value: lowShantenBonus }]
            : [],
        finalScore: riskControl,
      }),
    };
    return evaluation;
  });
}

function scoreByStyle(base: DiscardBaseEvaluation, playStyle: DiscardPlayStyle): number {
  const profile = DISCARD_STYLE_PROFILES[playStyle];
  return clamp(
    base.efficiency * profile.weights.efficiency +
      base.demandAvoidance * profile.weights.demandAvoidance +
      base.riskControl * profile.weights.riskControl,
    0,
    100,
  );
}

function finalizeEvaluations(baseOptions: DiscardBaseEvaluation[], playStyle: DiscardPlayStyle): DiscardEvaluation[] {
  const results = baseOptions.map((base) => {
    const evaluation: DiscardEvaluation = {
      ...base,
      totalScore: scoreByStyle(base, playStyle),
      reasons: [],
    };
    evaluation.reasons = buildReasons(evaluation);
    return evaluation;
  });

  return results.sort((a, b) => b.totalScore - a.totalScore);
}

export function getDiscardStyleProfile(playStyle: DiscardPlayStyle): DiscardStyleProfile {
  return DISCARD_STYLE_PROFILES[playStyle];
}

export function listDiscardStyleProfiles(): Array<
  DiscardStyleProfile & {
    id: DiscardPlayStyle;
  }
> {
  return DISCARD_PLAY_STYLES.map((style) => ({
    id: style,
    ...DISCARD_STYLE_PROFILES[style],
  }));
}

export function getDiscardScoreFormula(playStyle: DiscardPlayStyle): DiscardScoreFormula {
  const profile = getDiscardStyleProfile(playStyle);
  const fmt = (value: number): string => value.toFixed(2);

  return {
    totalFormula: `总分 = 效率 × ${fmt(profile.weights.efficiency)} + 需牌规避 × ${fmt(profile.weights.demandAvoidance)} + 风险控制 × ${fmt(profile.weights.riskControl)}`,
    componentFormulas: [
      "效率 = clamp(100 - 向听 × 22 + 有效进张 × 1.3, 0, 100)",
      "需牌规避 = clamp(100 - 需牌概率 × 100, 0, 100)",
      "风险控制 = clamp(100 - 放铳风险 × 100 + 低向听奖励, 0, 100)",
      "低向听奖励：向听 <= 1 时 +8 分",
    ],
    termDefinitions: [
      {
        term: "向听",
        explain: "距离听牌还差几步。数字越小越接近听牌，0 表示已听牌。",
      },
      {
        term: "有效进张",
        explain: "打出该牌后，能让手牌更接近听牌的剩余牌总张数（按当前剩余牌估算）。",
      },
      {
        term: "放铳风险",
        explain: "由现物/定缺/副露集中/中张与副露数量综合估计，按三家取均值。",
      },
      {
        term: "需牌概率",
        explain: "该牌像“他家正需要”的程度估计，越高越容易喂牌。",
      },
      {
        term: "clamp(a, 0, 100)",
        explain: "把分数限制在 0 到 100 之间，避免出现负分或超过 100。",
      },
    ],
  };
}

export function evaluateDiscardOptions(
  scenario: Scenario,
  playStyle: DiscardPlayStyle = "balanced",
): DiscardEvaluation[] {
  return finalizeEvaluations(evaluateDiscardBaseOptions(scenario), playStyle);
}

export function evaluateDiscardOptionsByStyle(
  scenario: Scenario,
): Record<DiscardPlayStyle, DiscardEvaluation[]> {
  const baseOptions = evaluateDiscardBaseOptions(scenario);
  return {
    balanced: finalizeEvaluations(baseOptions, "balanced"),
    aggressive: finalizeEvaluations(baseOptions, "aggressive"),
    steady: finalizeEvaluations(baseOptions, "steady"),
  };
}

export function explainDiscardComparison(
  best: DiscardEvaluation,
  chosen: DiscardEvaluation,
  playStyle: DiscardPlayStyle = "balanced",
): string[] {
  const styleLabel = getDiscardStyleProfile(playStyle).label;

  if (best.tileId === chosen.tileId) {
    return [`你的选择与系统推荐一致（${styleLabel}打法），这手在效率与风险之间更平衡。`];
  }

  const bestLabel = tileIdToLabel(best.tileId);
  const chosenLabel = tileIdToLabel(chosen.tileId);
  const reasons: string[] = [];

  reasons.push(
    `按${styleLabel}打法，${bestLabel} 总分更高 ${Math.max(0.1, best.totalScore - chosen.totalScore).toFixed(1)} 分（${best.totalScore.toFixed(1)} vs ${chosen.totalScore.toFixed(1)}）`,
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
      `相比 ${chosenLabel}，${bestLabel} 在${styleLabel}权重下综合更优`,
    );
  }

  return reasons.slice(0, 4);
}

export function getDiscardDecisionInsight(
  best: DiscardEvaluation,
  chosen: DiscardEvaluation,
  playStyle: DiscardPlayStyle = "balanced",
): DiscardDecisionInsight {
  const profile = getDiscardStyleProfile(playStyle);
  const gapScore = Math.max(0, best.totalScore - chosen.totalScore);

  let level: DiscardDecisionLevel = "improvable";
  let title = "该打法下有优化空间";
  if (gapScore <= 0.5) {
    level = "best";
    title = "命中该打法最优选择";
  } else if (gapScore <= profile.acceptanceGap) {
    level = "acceptable";
    title = "该打法下判断合理";
  }

  const actionTips: string[] = [];
  const shantenGap = chosen.shantenAfter - best.shantenAfter;
  const effectiveGap = best.effectiveTiles - chosen.effectiveTiles;
  const riskGap = chosen.risk - best.risk;
  const demandGap = best.demandAvoidance - chosen.demandAvoidance;

  if (level === "best") {
    actionTips.push("保持当前打法节奏，下一巡优先沿同方向留改良。");
  } else {
    if (riskGap >= 0.08) {
      actionTips.push("优先降低放铳风险，尽量先打更安全的现张/边张。");
    }
    if (shantenGap >= 1) {
      actionTips.push("避免主动增向听，先保证更快进入听牌节奏。");
    }
    if (effectiveGap >= 4) {
      actionTips.push("保留进张更多的搭子，减少后续摸牌受限。");
    }
    if (demandGap >= 6) {
      actionTips.push("少打他家可能高需求的牌，降低喂牌概率。");
    }
    if (actionTips.length === 0) {
      actionTips.push(`优先考虑打 ${tileIdToLabel(best.tileId)}，并观察下一巡场况再调整。`);
    }
  }

  return {
    level,
    title,
    gapScore,
    gapSummary: `与该打法推荐相比，当前选择落后 ${gapScore.toFixed(1)} 分。`,
    scoreNote: "分数只用于同一牌局、同一打法的相对比较，不代表胡牌概率。",
    actionTips: actionTips.slice(0, 3),
  };
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
