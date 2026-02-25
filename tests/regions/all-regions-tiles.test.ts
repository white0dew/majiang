import { describe, expect, it } from "vitest";

import { getQuickOptionTilesByRule, getTrainingRuleStrategy } from "@/engine/mahjong/rule-strategies";
import {
  BAIBAN_TILE_ID,
  DONG_TILE_ID,
  FA_TILE_ID,
  NUMBER_TILE_IDS,
  RIICHI_TILE_IDS,
  ZHONG_TILE_ID,
  tileIdToSuit,
} from "@/engine/mahjong/tiles";
import { TRAINING_RULE_IDS, TrainingRuleId } from "@/types/mahjong";

import { READY_SINGLE_WAIT_HAND, createScenario } from "../fixtures/hands";

type RegionTileCase = {
  ruleId: TrainingRuleId;
  expectedTileIds: readonly number[];
  usesDingQue: boolean;
  includeTiles: number[];
  excludeTiles: number[];
};

function numberOnlyCase(ruleId: TrainingRuleId): RegionTileCase {
  return {
    ruleId,
    expectedTileIds: NUMBER_TILE_IDS,
    usesDingQue: ruleId === "sichuan-blood-battle",
    includeTiles: [0, 8, 9, 17, 18, 26],
    excludeTiles: [ZHONG_TILE_ID, FA_TILE_ID, DONG_TILE_ID],
  };
}

const REGION_TILE_CASES: RegionTileCase[] = [
  numberOnlyCase("sichuan-blood-battle"),
  numberOnlyCase("changsha-258-jiang"),
  {
    ruleId: "wuhan-hongzhong-fa-laizi-gang",
    expectedTileIds: [...NUMBER_TILE_IDS, ZHONG_TILE_ID, FA_TILE_ID],
    usesDingQue: false,
    includeTiles: [0, 26, ZHONG_TILE_ID, FA_TILE_ID],
    excludeTiles: [DONG_TILE_ID],
  },
  numberOnlyCase("guizhou-zhuoji"),
  {
    ruleId: "guangdong-hongzhong",
    expectedTileIds: [...NUMBER_TILE_IDS, ZHONG_TILE_ID],
    usesDingQue: false,
    includeTiles: [0, 26, ZHONG_TILE_ID],
    excludeTiles: [FA_TILE_ID, DONG_TILE_ID],
  },
  numberOnlyCase("xiamen-mahjong"),
  numberOnlyCase("fujian-mahjong"),
  numberOnlyCase("shenyang-mahjong"),
  numberOnlyCase("hebei-mahjong"),
  numberOnlyCase("hangzhou-mahjong"),
  {
    ruleId: "hainan-mahjong",
    expectedTileIds: RIICHI_TILE_IDS,
    usesDingQue: false,
    includeTiles: [0, 26, DONG_TILE_ID, ZHONG_TILE_ID, FA_TILE_ID, BAIBAN_TILE_ID],
    excludeTiles: [],
  },
  {
    ruleId: "japanese-riichi",
    expectedTileIds: RIICHI_TILE_IDS,
    usesDingQue: false,
    includeTiles: [0, 26, DONG_TILE_ID, ZHONG_TILE_ID, FA_TILE_ID, BAIBAN_TILE_ID],
    excludeTiles: [],
  },
  numberOnlyCase("suzhou-mahjong"),
];

describe("regions/all-regions-tiles", () => {
  it("用例应覆盖全部地区玩法", () => {
    expect(REGION_TILE_CASES.map((item) => item.ruleId)).toEqual(TRAINING_RULE_IDS);
  });

  it.each(REGION_TILE_CASES)("$ruleId 的牌池配置正确", ({ ruleId, expectedTileIds, usesDingQue, includeTiles, excludeTiles }) => {
    const strategy = getTrainingRuleStrategy(ruleId);
    expect(strategy.tileIds).toEqual(expectedTileIds);
    expect(strategy.usesDingQue).toBe(usesDingQue);
    expect(new Set(strategy.tileIds).size).toBe(expectedTileIds.length);

    for (const tileId of includeTiles) {
      expect(strategy.tileIds).toContain(tileId);
    }

    for (const tileId of excludeTiles) {
      expect(strategy.tileIds).not.toContain(tileId);
    }
  });

  it.each(REGION_TILE_CASES.filter((item) => !item.usesDingQue))(
    "$ruleId 无定缺时快答候选牌应覆盖完整牌池",
    ({ ruleId, expectedTileIds }) => {
      const scenario = createScenario(ruleId, READY_SINGLE_WAIT_HAND);
      expect(getQuickOptionTilesByRule(scenario)).toEqual([...expectedTileIds]);
    },
  );

  it("四川定缺时快答候选牌应剔除缺门", () => {
    const scenario = createScenario("sichuan-blood-battle", READY_SINGLE_WAIT_HAND, {
      selfDingQue: "tong",
    });
    const options = getQuickOptionTilesByRule(scenario);

    expect(options).toHaveLength(18);
    expect(options.every((tileId) => tileIdToSuit(tileId) !== "tong")).toBe(true);
  });
});
