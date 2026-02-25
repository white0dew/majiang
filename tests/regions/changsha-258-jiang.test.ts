import { describe, expect, it } from "vitest";

import {
  getWinningTileCandidates,
  isWinningHand,
  isWinningHandWithJiang258,
} from "@/engine/mahjong/evaluator";

import { READY_SINGLE_WAIT_HAND, STANDARD_WIN_PAIR_1, STANDARD_WIN_PAIR_2 } from "../fixtures/hands";

describe("regions/changsha-258-jiang", () => {
  it("普通规则可胡但将牌非 258 时应判不可胡", () => {
    expect(isWinningHand(STANDARD_WIN_PAIR_1)).toBe(true);
    expect(isWinningHandWithJiang258(STANDARD_WIN_PAIR_1)).toBe(false);
  });

  it("将牌为 2/5/8 时可胡", () => {
    expect(isWinningHandWithJiang258(STANDARD_WIN_PAIR_2)).toBe(true);
  });

  it("同一听牌在 258 将规则下会过滤非 2/5/8 将", () => {
    const normalCandidates = getWinningTileCandidates(READY_SINGLE_WAIT_HAND);
    const jiangCandidates = normalCandidates.filter((tileId) =>
      isWinningHandWithJiang258(READY_SINGLE_WAIT_HAND.concat(tileId)),
    );

    expect(normalCandidates).toContain(18);
    expect(jiangCandidates).not.toContain(18);
  });
});
