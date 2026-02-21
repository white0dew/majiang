import {
  TILE_KIND_COUNT,
  drawTiles,
  randomInt,
  suitLabel,
  tileIdToSuit,
} from "@/engine/mahjong/tiles";
import { Scenario, Suit, TRAINING_RULE_IDS, TrainingRuleId } from "@/types/mahjong";

const SUITS: Suit[] = ["wan", "tiao", "tong"];
const ALL_TILE_IDS = Array.from({ length: TILE_KIND_COUNT }, (_, tileId) => tileId);

export const DEFAULT_TRAINING_RULE_ID: TrainingRuleId = "sichuan-blood-battle";

function randomSuit(): Suit {
  return SUITS[randomInt(0, SUITS.length - 1)];
}

type SelfContext = {
  selfHand: number[];
  selfDingQue: Suit | null;
};

export type TrainingRuleStrategy = {
  id: TrainingRuleId;
  title: string;
  shortLabel: string;
  description: string;
  usesDingQue: boolean;
  quickSelfHint: string;
  discardSelfHint: string;
  quickPanelHint: (scenario: Scenario) => string;
  createSelfContext: (counts: number[], handSize: number) => SelfContext;
  createOpponentDingQue: () => Suit | null;
  isSelfHandValid: (scenario: Scenario) => boolean;
  filterQuickCandidates: (candidates: number[], scenario: Scenario) => number[];
  filterQuickOptionTiles: (tileIds: number[], scenario: Scenario) => number[];
};

const sichuanBloodBattleStrategy: TrainingRuleStrategy = {
  id: "sichuan-blood-battle",
  title: "四川麻将（血战到底）",
  shortLabel: "四川血战",
  description: "有定缺，重点练听胡反应和弃牌风险控制。",
  usesDingQue: true,
  quickSelfHint: "请观察牌局并判断当前可胡牌",
  discardSelfHint: "请选择本巡要打出的牌",
  quickPanelHint: (scenario) =>
    scenario.selfDingQue ? `已隐藏定缺花色：${suitLabel(scenario.selfDingQue)}` : "已隐藏定缺花色",
  createSelfContext: (counts, handSize) => {
    const selfDingQue = randomSuit();
    const selfHand = drawTiles(counts, handSize, (tileId) => tileIdToSuit(tileId) !== selfDingQue);
    return { selfHand, selfDingQue };
  },
  createOpponentDingQue: () => randomSuit(),
  isSelfHandValid: (scenario) =>
    Boolean(scenario.selfDingQue) &&
    !scenario.selfHand.some((tileId) => tileIdToSuit(tileId) === scenario.selfDingQue),
  filterQuickCandidates: (candidates, scenario) =>
    scenario.selfDingQue
      ? candidates.filter((tileId) => tileIdToSuit(tileId) !== scenario.selfDingQue)
      : candidates,
  filterQuickOptionTiles: (tileIds, scenario) =>
    scenario.selfDingQue
      ? tileIds.filter((tileId) => tileIdToSuit(tileId) !== scenario.selfDingQue)
      : tileIds,
};

const guizhouZhuojiStrategy: TrainingRuleStrategy = {
  id: "guizhou-zhuoji",
  title: "贵州麻将（捉鸡）",
  shortLabel: "贵州捉鸡",
  description: "无定缺，重点练胡牌效率和鸡牌收益前的风险判断。",
  usesDingQue: false,
  quickSelfHint: "请观察牌局并判断当前可胡牌",
  discardSelfHint: "请选择本巡要打出的牌",
  quickPanelHint: () => "本玩法无定缺，候选牌覆盖万/条/筒三门。",
  createSelfContext: (counts, handSize) => ({
    selfHand: drawTiles(counts, handSize),
    selfDingQue: null,
  }),
  createOpponentDingQue: () => null,
  isSelfHandValid: () => true,
  filterQuickCandidates: (candidates) => candidates,
  filterQuickOptionTiles: (tileIds) => tileIds,
};

export const TRAINING_RULE_STRATEGIES: Record<TrainingRuleId, TrainingRuleStrategy> = {
  "sichuan-blood-battle": sichuanBloodBattleStrategy,
  "guizhou-zhuoji": guizhouZhuojiStrategy,
};

export function isTrainingRuleId(value: string): value is TrainingRuleId {
  return (TRAINING_RULE_IDS as readonly string[]).includes(value);
}

export function resolveTrainingRuleId(ruleId?: string): TrainingRuleId {
  if (ruleId && isTrainingRuleId(ruleId)) {
    return ruleId;
  }
  return DEFAULT_TRAINING_RULE_ID;
}

export function getTrainingRuleStrategy(ruleId: TrainingRuleId): TrainingRuleStrategy {
  return TRAINING_RULE_STRATEGIES[ruleId];
}

export function listTrainingRuleStrategies(): TrainingRuleStrategy[] {
  return TRAINING_RULE_IDS.map((ruleId) => TRAINING_RULE_STRATEGIES[ruleId]);
}

export function getQuickOptionTilesByRule(scenario: Scenario): number[] {
  const strategy = getTrainingRuleStrategy(scenario.ruleId);
  return strategy.filterQuickOptionTiles(ALL_TILE_IDS, scenario);
}
