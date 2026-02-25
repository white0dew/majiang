import { describe, expect, it } from "vitest";

import {
  createCountsByTileIds,
  removeTileOnce,
  tileIdToRank,
  tileIdToShortLabel,
  tileIdToSuit,
  uniqueTileIds,
} from "@/engine/mahjong/tiles";

describe("core/tiles", () => {
  it("数牌的花色和点数映射正确", () => {
    expect(tileIdToSuit(0)).toBe("wan");
    expect(tileIdToRank(0)).toBe(1);
    expect(tileIdToSuit(9)).toBe("tiao");
    expect(tileIdToSuit(18)).toBe("tong");
  });

  it("字牌没有花色与点数", () => {
    expect(tileIdToSuit(31)).toBeNull();
    expect(tileIdToRank(31)).toBe(0);
    expect(tileIdToShortLabel(31)).toBe("C");
  });

  it("按给定牌池生成剩余张数", () => {
    const counts = createCountsByTileIds([0, 1, 31]);
    expect(counts[0]).toBe(4);
    expect(counts[1]).toBe(4);
    expect(counts[31]).toBe(4);
    expect(counts[2]).toBe(0);
  });

  it("removeTileOnce 只删除第一张命中牌", () => {
    expect(removeTileOnce([1, 2, 1, 3], 1)).toEqual([2, 1, 3]);
    expect(removeTileOnce([1, 2, 3], 9)).toEqual([1, 2, 3]);
  });

  it("uniqueTileIds 去重并保留首次出现顺序", () => {
    expect(uniqueTileIds([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });
});
