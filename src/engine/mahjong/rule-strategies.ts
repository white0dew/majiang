import {
  NUMBER_TILE_IDS,
  RIICHI_TILE_IDS,
  drawTiles,
  randomInt,
  suitLabel,
  tileIdToSuit,
} from "@/engine/mahjong/tiles";
import { isWinningHandWithJiang258 } from "@/engine/mahjong/evaluator";
import { Scenario, Suit, TRAINING_RULE_IDS, TrainingRuleId } from "@/types/mahjong";

const SUITS: Suit[] = ["wan", "tiao", "tong"];

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
  tileIds: readonly number[];
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

function createNoDingQueStrategy(input: {
  id: TrainingRuleId;
  tileIds?: readonly number[];
  title: string;
  shortLabel: string;
  description: string;
  quickSelfHint?: string;
  discardSelfHint?: string;
  quickPanelHint?: () => string;
}): TrainingRuleStrategy {
  return {
    id: input.id,
    tileIds: input.tileIds ?? NUMBER_TILE_IDS,
    title: input.title,
    shortLabel: input.shortLabel,
    description: input.description,
    usesDingQue: false,
    quickSelfHint: input.quickSelfHint ?? "请观察牌局并判断当前可胡牌",
    discardSelfHint: input.discardSelfHint ?? "请选择本巡要打出的牌",
    quickPanelHint: input.quickPanelHint ?? (() => "本玩法无定缺，候选牌覆盖万/条/筒三门。"),
    createSelfContext: (counts, handSize) => ({
      selfHand: drawTiles(counts, handSize),
      selfDingQue: null,
    }),
    createOpponentDingQue: () => null,
    isSelfHandValid: () => true,
    filterQuickCandidates: (candidates) => candidates,
    filterQuickOptionTiles: (tileIds) => tileIds,
  };
}

const sichuanBloodBattleStrategy: TrainingRuleStrategy = {
  id: "sichuan-blood-battle",
  tileIds: NUMBER_TILE_IDS,
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

const guizhouZhuojiStrategy = createNoDingQueStrategy({
  id: "guizhou-zhuoji",
  title: "贵州麻将（捉鸡）",
  shortLabel: "贵州捉鸡",
  description: "无定缺，重点练胡牌效率和鸡牌收益前的风险判断。",
});

const changshaJiangStrategy: TrainingRuleStrategy = {
  id: "changsha-258-jiang",
  tileIds: NUMBER_TILE_IDS,
  title: "长沙麻将（258 将）",
  shortLabel: "长沙将牌",
  description: "无定缺，快答按 258 将规则判断可胡牌。",
  usesDingQue: false,
  quickSelfHint: "请观察牌局并判断当前可胡牌（将牌需为 2/5/8）",
  discardSelfHint: "请选择本巡要打出的牌（将牌需为 2/5/8）",
  quickPanelHint: () => "本玩法无定缺，胡牌时将牌（对子）需满足 2/5/8。",
  createSelfContext: (counts, handSize) => ({
    selfHand: drawTiles(counts, handSize),
    selfDingQue: null,
  }),
  createOpponentDingQue: () => null,
  isSelfHandValid: () => true,
  filterQuickCandidates: (candidates, scenario) =>
    candidates.filter((tileId) => isWinningHandWithJiang258(scenario.selfHand.concat(tileId))),
  filterQuickOptionTiles: (tileIds) => tileIds,
};

const xiamenStrategy = createNoDingQueStrategy({
  id: "xiamen-mahjong",
  title: "厦门麻将",
  shortLabel: "厦门",
  description: "无定缺，当前先按通用胡牌效率训练，后续可叠加本地细则。",
});

const fujianStrategy = createNoDingQueStrategy({
  id: "fujian-mahjong",
  title: "福建麻将",
  shortLabel: "福建",
  description: "无定缺，当前先按通用局面训练，重点练进张与风险平衡。",
});

const shenyangStrategy = createNoDingQueStrategy({
  id: "shenyang-mahjong",
  title: "沈阳麻将",
  shortLabel: "沈阳",
  description: "无定缺，当前先练基础听胡与弃牌决策，后续可接入地方规则。",
});

const hangzhouStrategy = createNoDingQueStrategy({
  id: "hangzhou-mahjong",
  title: "杭州麻将",
  shortLabel: "杭州",
  description: "无定缺，当前先按通用训练题生成，优先提升牌效率与防守。",
});

const japaneseRiichiStrategy = createNoDingQueStrategy({
  id: "japanese-riichi",
  tileIds: RIICHI_TILE_IDS,
  title: "日本麻将（立直）",
  shortLabel: "日本立直",
  description: "无定缺，使用万/条/筒 + 东南西北中发白训练（暂不含赤宝牌与完整役种校验）。",
  quickPanelHint: () => "当前立直训练含字牌（东南西北中发白），暂不含赤宝牌。",
});

const suzhouStrategy = createNoDingQueStrategy({
  id: "suzhou-mahjong",
  title: "苏州麻将",
  shortLabel: "苏州",
  description: "无定缺，当前先按通用决策训练，后续可补苏州本地细则。",
});

export const TRAINING_RULE_STRATEGIES: Record<TrainingRuleId, TrainingRuleStrategy> = {
  "sichuan-blood-battle": sichuanBloodBattleStrategy,
  "changsha-258-jiang": changshaJiangStrategy,
  "guizhou-zhuoji": guizhouZhuojiStrategy,
  "xiamen-mahjong": xiamenStrategy,
  "fujian-mahjong": fujianStrategy,
  "shenyang-mahjong": shenyangStrategy,
  "hangzhou-mahjong": hangzhouStrategy,
  "japanese-riichi": japaneseRiichiStrategy,
  "suzhou-mahjong": suzhouStrategy,
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
  return strategy.filterQuickOptionTiles([...strategy.tileIds], scenario);
}
