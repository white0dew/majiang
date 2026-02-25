import { describe, expect, it } from "vitest";

import { estimateShanten, getWinningTileCandidates, isWinningHand } from "@/engine/mahjong/evaluator";
import { NUMBER_TILE_IDS } from "@/engine/mahjong/tiles";

import { READY_SINGLE_WAIT_HAND, STANDARD_WIN_HAND, createRemainingCounts } from "../fixtures/hands";

describe("core/evaluator", () => {
  it("普通胡牌结构应判定为可胡", () => {
    expect(isWinningHand(STANDARD_WIN_HAND)).toBe(true);
  });

  it("非 3n+2 张手牌不能胡", () => {
    expect(isWinningHand(READY_SINGLE_WAIT_HAND)).toBe(false);
  });

  it("已和牌时向听数为 -1", () => {
    expect(estimateShanten(STANDARD_WIN_HAND)).toBe(-1);
  });

  it("单骑听牌时只返回唯一候选", () => {
    const remaining = createRemainingCounts(NUMBER_TILE_IDS, READY_SINGLE_WAIT_HAND);
    expect(getWinningTileCandidates(READY_SINGLE_WAIT_HAND, remaining)).toEqual([18]);
  });

  it("剩余张数为 0 的牌不会进入候选", () => {
    const remaining = createRemainingCounts(NUMBER_TILE_IDS, READY_SINGLE_WAIT_HAND);
    remaining[18] = 0;
    expect(getWinningTileCandidates(READY_SINGLE_WAIT_HAND, remaining)).toEqual([]);
  });
});
