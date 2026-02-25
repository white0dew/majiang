import { NUMBER_TILE_IDS, TILE_KIND_COUNT } from "@/engine/mahjong/tiles";
import { Scenario, TrainingRuleId } from "@/types/mahjong";

// 通用平胡：123万 456万 789万 123条 + 11筒
export const STANDARD_WIN_HAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 18];

// 13 张听牌：补 1 筒可胡（单骑将）
export const READY_SINGLE_WAIT_HAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18];

// 普通规则可胡，但将牌是 1 万（非 2/5/8）
export const STANDARD_WIN_PAIR_1 = [0, 1, 2, 9, 10, 11, 18, 19, 20, 3, 4, 5, 0, 0];

// 258 将可胡：将牌为 2 万
export const STANDARD_WIN_PAIR_2 = [0, 1, 2, 9, 10, 11, 18, 19, 20, 3, 4, 5, 1, 1];

// 红中作赖子补将
export const HONGZHONG_LAIZI_WIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 31];

// 红中赖子 13 张样例
export const HONGZHONG_READY_HAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 31];

// 武汉规则：赖子 + 258 将成立（将牌为 2 筒）
export const WUHAN_JIANG_TRUE_HAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 19, 31];
export const WUHAN_JIANG_TRUE_WITH_FA_HAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 19, 32];

// 武汉规则：赖子只能补成 1 筒将（非 258），应判不可胡
export const WUHAN_JIANG_FALSE_HAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 31];

export function createRemainingCounts(tileIds: readonly number[], usedTiles: number[]): number[] {
  const counts = Array.from({ length: TILE_KIND_COUNT }, () => 0);

  for (const tileId of tileIds) {
    if (tileId >= 0 && tileId < TILE_KIND_COUNT) {
      counts[tileId] = 4;
    }
  }

  for (const tileId of usedTiles) {
    if (tileId >= 0 && tileId < TILE_KIND_COUNT && counts[tileId] > 0) {
      counts[tileId] -= 1;
    }
  }

  return counts;
}

export function createScenario(
  ruleId: TrainingRuleId,
  selfHand: number[],
  overrides: Partial<Scenario> = {},
): Scenario {
  return {
    mode: "quick",
    ruleId,
    selfHand,
    selfDingQue: null,
    opponents: [],
    round: 8,
    remainingCounts: createRemainingCounts(NUMBER_TILE_IDS, selfHand),
    ...overrides,
  };
}
