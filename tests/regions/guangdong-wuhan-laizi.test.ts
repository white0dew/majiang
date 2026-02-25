import { describe, expect, it } from "vitest";

import {
  estimateShanten,
  estimateShantenWithHongzhongLaizi,
  isWinningHand,
  isWinningHandWithHongzhongLaizi,
  isWinningHandWithWuhanLaiziJiang258,
} from "@/engine/mahjong/evaluator";

import {
  HONGZHONG_LAIZI_WIN,
  HONGZHONG_READY_HAND,
  WUHAN_JIANG_FALSE_HAND,
  WUHAN_JIANG_TRUE_HAND,
  WUHAN_JIANG_TRUE_WITH_FA_HAND,
} from "../fixtures/hands";

describe("regions/guangdong-wuhan-laizi", () => {
  it("广东红中赖子可以补将成胡", () => {
    expect(isWinningHand(HONGZHONG_LAIZI_WIN)).toBe(false);
    expect(isWinningHandWithHongzhongLaizi(HONGZHONG_LAIZI_WIN)).toBe(true);
  });

  it("武汉规则支持红中/发财作赖子且满足 258 将", () => {
    expect(isWinningHandWithWuhanLaiziJiang258(WUHAN_JIANG_TRUE_HAND)).toBe(true);
    expect(isWinningHandWithWuhanLaiziJiang258(WUHAN_JIANG_TRUE_WITH_FA_HAND)).toBe(true);
  });

  it("武汉规则下将牌非 258 时不可胡", () => {
    expect(isWinningHandWithWuhanLaiziJiang258(WUHAN_JIANG_FALSE_HAND)).toBe(false);
  });

  it("赖子向听不应高于普通算法", () => {
    const normalShanten = estimateShanten(HONGZHONG_READY_HAND);
    const laiziShanten = estimateShantenWithHongzhongLaizi(HONGZHONG_READY_HAND);
    expect(laiziShanten).toBeLessThanOrEqual(normalShanten);
  });
});
