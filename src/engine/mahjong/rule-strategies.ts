import {
  FA_TILE_ID,
  NUMBER_TILE_IDS,
  RIICHI_TILE_IDS,
  ZHONG_TILE_ID,
  drawTiles,
  randomInt,
  suitLabel,
  tileIdToSuit,
} from "@/engine/mahjong/tiles";
import {
  isWinningHandWithHainanHaikou,
  isWinningHandWithJiang258,
  isWinningHandWithWuhanLaiziJiang258,
} from "@/engine/mahjong/evaluator";
import { Scenario, Suit, TRAINING_RULE_IDS, TrainingRuleId } from "@/types/mahjong";

const SUITS: Suit[] = ["wan", "tiao", "tong"];
export const GUANGDONG_TILE_IDS = [...NUMBER_TILE_IDS, ZHONG_TILE_ID] as const;
export const WUHAN_TILE_IDS = [...NUMBER_TILE_IDS, ZHONG_TILE_ID, FA_TILE_ID] as const;
export const HAINAN_TILE_IDS = [...RIICHI_TILE_IDS] as const;

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

const guangdongHongzhongStrategy = createNoDingQueStrategy({
  id: "guangdong-hongzhong",
  tileIds: GUANGDONG_TILE_IDS,
  title: "广东麻将（红中赖子）",
  shortLabel: "广东红中",
  description: "无定缺，红中作赖子，侧重听牌速度与弃牌安全感。",
  quickSelfHint: "请观察牌局并判断当前可胡牌（红中可当赖子）",
  discardSelfHint: "请选择本巡要打出的牌（红中可当赖子）",
  quickPanelHint: () => "当前按广东红中赖子训练：牌池为万/条/筒 + 红中。",
});

const wuhanHongzhongFaLaiziGangStrategy: TrainingRuleStrategy = {
  id: "wuhan-hongzhong-fa-laizi-gang",
  tileIds: WUHAN_TILE_IDS,
  title: "武汉麻将（红中发财赖子杠）",
  shortLabel: "武汉赖子杠",
  description: "无定缺，按大众口径训练：红中/发财作赖子，胡牌将牌需满足 2/5/8。",
  usesDingQue: false,
  quickSelfHint: "请观察牌局并判断当前可胡牌（红中/发财可作赖子，且将牌需为 2/5/8）",
  discardSelfHint: "请选择本巡要打出的牌（红中/发财可作赖子，且将牌需为 2/5/8）",
  quickPanelHint: () => "当前按武汉大众口径训练：牌池为万/条/筒 + 红中 + 发财，胡牌将牌需满足 2/5/8。",
  createSelfContext: (counts, handSize) => ({
    selfHand: drawTiles(counts, handSize),
    selfDingQue: null,
  }),
  createOpponentDingQue: () => null,
  isSelfHandValid: () => true,
  filterQuickCandidates: (candidates, scenario) =>
    candidates.filter((tileId) => isWinningHandWithWuhanLaiziJiang258(scenario.selfHand.concat(tileId))),
  filterQuickOptionTiles: (tileIds) => tileIds,
};

const changshaJiangStrategy: TrainingRuleStrategy = {
  id: "changsha-258-jiang",
  tileIds: NUMBER_TILE_IDS,
  title: "长沙麻将（258 将）",
  shortLabel: "长沙将牌（258 将）",
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
  shortLabel: "沈阳麻将",
  description: "无定缺，当前先练基础听胡与弃牌决策，后续可接入地方规则。",
});

const hebeiStrategy = createNoDingQueStrategy({
  id: "hebei-mahjong",
  title: "河北麻将（推倒胡）",
  shortLabel: "河北麻将（推倒胡）",
  description: "常见推倒胡口径：无定缺，先练听牌速度与后盘防点炮。",
});

const hangzhouStrategy = createNoDingQueStrategy({
  id: "hangzhou-mahjong",
  title: "杭州麻将",
  shortLabel: "杭州麻将",
  description: "无定缺，当前先按通用训练题生成，优先提升牌效率与防守。",
});

const hainanStrategy: TrainingRuleStrategy = {
  id: "hainan-mahjong",
  tileIds: HAINAN_TILE_IDS,
  title: "海南麻将（海口版）",
  shortLabel: "海南海口",
  description: "按海口大众口径训练：含字牌，普通胡牌需满足至少 1 番（训练近似）。",
  usesDingQue: false,
  quickSelfHint: "请观察牌局并判断当前可胡牌（海口版：普通胡牌需有番）",
  discardSelfHint: "请选择本巡要打出的牌（海口版：兼顾有番门槛）",
  quickPanelHint: () => "当前按海南海口版训练：牌池含东南西北中发白，普通胡牌需至少 1 番。",
  createSelfContext: (counts, handSize) => ({
    selfHand: drawTiles(counts, handSize),
    selfDingQue: null,
  }),
  createOpponentDingQue: () => null,
  isSelfHandValid: () => true,
  filterQuickCandidates: (candidates, scenario) =>
    candidates.filter((tileId) => isWinningHandWithHainanHaikou(scenario.selfHand.concat(tileId))),
  filterQuickOptionTiles: (tileIds) => tileIds,
};

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
  shortLabel: "苏州麻将",
  description: "无定缺，当前先按通用决策训练，后续可补苏州本地细则。",
});

const tianjinStrategy = createNoDingQueStrategy({
  id: "tianjin-mahjong",
  title: "天津麻将",
  shortLabel: "天津麻将",
  description: "无定缺，先按通用题型训练听牌速度、进张质量与后盘防守。",
});

const nanningStrategy = createNoDingQueStrategy({
  id: "nanning-mahjong",
  title: "南宁麻将",
  shortLabel: "南宁麻将",
  description: "无定缺，先练稳定听牌与风险控制，再逐步叠加地方结算细则。",
});

const guangdongTuiDaoHuStrategy = createNoDingQueStrategy({
  id: "guangdong-tuidaohu",
  title: "广东麻将（推倒胡）",
  shortLabel: "广东推倒胡",
  description: "常见推倒胡口径：无定缺，先提速听牌，再减少中后盘点炮。",
});

const shanxiKouDianDianStrategy = createNoDingQueStrategy({
  id: "shanxi-koudiandian",
  title: "山西麻将（扣点点）",
  shortLabel: "山西扣点点",
  description: "无定缺，先按通用训练提升决策稳定性，后续可接入扣点点细则。",
});

const ningxiaHuaShuiStrategy = createNoDingQueStrategy({
  id: "ningxia-huashui-mahjong",
  title: "宁夏划水麻将",
  shortLabel: "宁夏划水",
  description: "无定缺，优先训练听牌效率与防守切换，避免高风险硬冲。",
});

const luoyangGangCiStrategy = createNoDingQueStrategy({
  id: "luoyang-gangci",
  title: "洛阳麻将（杠次）",
  shortLabel: "洛阳杠次",
  description: "无定缺，先练基础胡牌路线与弃牌安全性，再补杠次结算细节。",
});

const nanjingStrategy = createNoDingQueStrategy({
  id: "nanjing-mahjong",
  title: "南京麻将",
  shortLabel: "南京麻将",
  description: "无定缺，先以通用决策框架训练，后续可扩展南京本地规则。",
});

export const TRAINING_RULE_STRATEGIES: Record<TrainingRuleId, TrainingRuleStrategy> = {
  "sichuan-blood-battle": sichuanBloodBattleStrategy,
  "changsha-258-jiang": changshaJiangStrategy,
  "wuhan-hongzhong-fa-laizi-gang": wuhanHongzhongFaLaiziGangStrategy,
  "guizhou-zhuoji": guizhouZhuojiStrategy,
  "guangdong-hongzhong": guangdongHongzhongStrategy,
  "xiamen-mahjong": xiamenStrategy,
  "fujian-mahjong": fujianStrategy,
  "shenyang-mahjong": shenyangStrategy,
  "hebei-mahjong": hebeiStrategy,
  "hangzhou-mahjong": hangzhouStrategy,
  "hainan-mahjong": hainanStrategy,
  "japanese-riichi": japaneseRiichiStrategy,
  "suzhou-mahjong": suzhouStrategy,
  "tianjin-mahjong": tianjinStrategy,
  "nanning-mahjong": nanningStrategy,
  "guangdong-tuidaohu": guangdongTuiDaoHuStrategy,
  "shanxi-koudiandian": shanxiKouDianDianStrategy,
  "ningxia-huashui-mahjong": ningxiaHuaShuiStrategy,
  "luoyang-gangci": luoyangGangCiStrategy,
  "nanjing-mahjong": nanjingStrategy,
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
