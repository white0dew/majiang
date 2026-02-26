export type Suit = "wan" | "tiao" | "tong";

export const TRAINING_MODES = ["quick", "discard"] as const;
export type TrainingMode = (typeof TRAINING_MODES)[number];
export const DISCARD_PLAY_STYLES = ["balanced", "aggressive", "steady"] as const;
export type DiscardPlayStyle = (typeof DISCARD_PLAY_STYLES)[number];
export const TRAINING_RULE_IDS = [
  "sichuan-blood-battle",
  "changsha-258-jiang",
  "wuhan-hongzhong-fa-laizi-gang",
  "guizhou-zhuoji",
  "guangdong-hongzhong",
  "xiamen-mahjong",
  "fujian-mahjong",
  "shenyang-mahjong",
  "hebei-mahjong",
  "hangzhou-mahjong",
  "hainan-mahjong",
  "japanese-riichi",
  "suzhou-mahjong",
  "tianjin-mahjong",
  "nanning-mahjong",
  "guangdong-tuidaohu",
  "shanxi-koudiandian",
  "ningxia-huashui-mahjong",
  "luoyang-gangci",
  "nanjing-mahjong",
] as const;
export type TrainingRuleId = (typeof TRAINING_RULE_IDS)[number];

export type OpponentState = {
  seat: "left" | "across" | "right";
  dingQue: Suit | null;
  discards: number[];
  melds: number[][];
};

export type DiscardEffectiveTileDetail = {
  tileId: number;
  remainCount: number;
};

export type DiscardRiskFactor = {
  label: string;
  riskDelta: number;
  demandDelta: number;
};

export type DiscardOpponentRiskDetail = {
  seat: OpponentState["seat"];
  baseRisk: number;
  baseDemand: number;
  finalRisk: number;
  finalDemand: number;
  factors: DiscardRiskFactor[];
};

export type DiscardRiskDetail = {
  averageRisk: number;
  averageDemand: number;
  opponents: DiscardOpponentRiskDetail[];
};

export type DiscardMetricBreakdown = {
  formula: string;
  baseScore: number;
  penaltyTerms: Array<{ label: string; value: number }>;
  bonusTerms: Array<{ label: string; value: number }>;
  finalScore: number;
};

export type Scenario = {
  mode: TrainingMode;
  ruleId: TrainingRuleId;
  selfHand: number[];
  selfDingQue: Suit | null;
  opponents: OpponentState[];
  round: number;
  remainingCounts: number[];
};

export type DiscardEvaluation = {
  tileId: number;
  efficiency: number;
  demandAvoidance: number;
  riskControl: number;
  totalScore: number;
  shantenAfter: number;
  effectiveTiles: number;
  risk: number;
  effectiveTileDetails: DiscardEffectiveTileDetail[];
  riskDetail: DiscardRiskDetail;
  efficiencyDetail: DiscardMetricBreakdown;
  demandAvoidanceDetail: DiscardMetricBreakdown;
  riskControlDetail: DiscardMetricBreakdown;
  reasons: string[];
};

export type TrainingRecord = {
  id: string;
  mode: TrainingMode;
  ruleId: TrainingRuleId;
  discardStyle?: DiscardPlayStyle;
  correct: boolean;
  score: number;
  elapsedMs?: number;
  createdAt: string;
  summary: string;
};
