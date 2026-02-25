import { describe, expect, it } from "vitest";

import { getQuickOptionTilesByRule, listTrainingRuleStrategies, resolveTrainingRuleId } from "@/engine/mahjong/rule-strategies";
import { DONG_TILE_ID, FA_TILE_ID, ZHONG_TILE_ID, tileIdToSuit } from "@/engine/mahjong/tiles";

import { READY_SINGLE_WAIT_HAND, createScenario } from "../fixtures/hands";

describe("modes/rule-strategies", () => {
  it("未知玩法 id 自动回退到默认规则", () => {
    expect(resolveTrainingRuleId("not-exist")).toBe("sichuan-blood-battle");
  });

  it("规则列表应包含已注册玩法", () => {
    const strategies = listTrainingRuleStrategies();
    expect(strategies.length).toBeGreaterThanOrEqual(10);
    expect(strategies.some((item) => item.id === "japanese-riichi")).toBe(true);
  });

  it("四川定缺会过滤掉缺门候选牌", () => {
    const scenario = createScenario("sichuan-blood-battle", READY_SINGLE_WAIT_HAND, {
      selfDingQue: "wan",
    });
    const options = getQuickOptionTilesByRule(scenario);

    expect(options.every((tileId) => tileIdToSuit(tileId) !== "wan")).toBe(true);
  });

  it("广东与武汉玩法的候选牌应包含赖子", () => {
    const guangdongOptions = getQuickOptionTilesByRule(createScenario("guangdong-hongzhong", READY_SINGLE_WAIT_HAND));
    expect(guangdongOptions).toContain(ZHONG_TILE_ID);

    const wuhanOptions = getQuickOptionTilesByRule(createScenario("wuhan-hongzhong-fa-laizi-gang", READY_SINGLE_WAIT_HAND));
    expect(wuhanOptions).toContain(ZHONG_TILE_ID);
    expect(wuhanOptions).toContain(FA_TILE_ID);
  });

  it("海南海口玩法候选牌应包含字牌", () => {
    const hainanOptions = getQuickOptionTilesByRule(createScenario("hainan-mahjong", READY_SINGLE_WAIT_HAND));
    expect(hainanOptions).toContain(DONG_TILE_ID);
    expect(hainanOptions).toContain(ZHONG_TILE_ID);
  });
});
