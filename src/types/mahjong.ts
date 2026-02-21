export type Suit = "wan" | "tiao" | "tong";

export const TRAINING_MODES = ["quick", "discard"] as const;
export type TrainingMode = (typeof TRAINING_MODES)[number];
export const TRAINING_RULE_IDS = ["sichuan-blood-battle", "guizhou-zhuoji"] as const;
export type TrainingRuleId = (typeof TRAINING_RULE_IDS)[number];

export type OpponentState = {
  seat: "left" | "across" | "right";
  dingQue: Suit | null;
  discards: number[];
  melds: number[][];
};

export type Scenario = {
  mode: TrainingMode;
  ruleId: TrainingRuleId;
  selfHand: number[];
  selfDingQue: Suit | null;
  opponents: OpponentState[];
  round: number;
  wallRemaining: number;
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
  reasons: string[];
};

export type TrainingRecord = {
  id: string;
  mode: TrainingMode;
  ruleId: TrainingRuleId;
  correct: boolean;
  score: number;
  elapsedMs?: number;
  createdAt: string;
  summary: string;
};
