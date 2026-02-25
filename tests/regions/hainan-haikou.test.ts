import { describe, expect, it } from "vitest";

import {
  estimateShantenWithHainanHaikou,
  getWinningTileCandidatesWithHainanHaikou,
  isWinningHand,
  isWinningHandWithHainanHaikou,
} from "@/engine/mahjong/evaluator";

// 2+3+3+3+3 成型，但仅平胡且将牌为 1（按海口有番门槛应不可胡）
const HAINAN_NO_FAN_WIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 18];
// 将牌为 2，按训练近似可视为有番
const HAINAN_258_FAN_WIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 19, 19];
// 十三幺：幺九字牌各一张 + 一对
const HAINAN_THIRTEEN_ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 31];
const HAINAN_READY_NO_FAN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18];

describe("regions/hainan-haikou", () => {
  it("海口版：普通成型但无番时不可胡", () => {
    expect(isWinningHand(HAINAN_NO_FAN_WIN)).toBe(true);
    expect(isWinningHandWithHainanHaikou(HAINAN_NO_FAN_WIN)).toBe(false);
  });

  it("海口版：普通成型且满足番型时可胡", () => {
    expect(isWinningHandWithHainanHaikou(HAINAN_258_FAN_WIN)).toBe(true);
  });

  it("海口版：支持十三幺胡牌", () => {
    expect(isWinningHandWithHainanHaikou(HAINAN_THIRTEEN_ORPHANS)).toBe(true);
  });

  it("海口版：无番听口不应计为可胡候选", () => {
    expect(getWinningTileCandidatesWithHainanHaikou(HAINAN_READY_NO_FAN)).toEqual([]);
    expect(estimateShantenWithHainanHaikou(HAINAN_READY_NO_FAN)).toBe(1);
  });
});

