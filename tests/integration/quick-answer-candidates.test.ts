import { describe, expect, it } from "vitest";

import { getQuickAnswerCandidates } from "@/engine/mahjong/scenario";
import { NUMBER_TILE_IDS, RIICHI_TILE_IDS } from "@/engine/mahjong/tiles";

import { READY_SINGLE_WAIT_HAND, createRemainingCounts, createScenario } from "../fixtures/hands";

describe("integration/quick-answer-candidates", () => {
  it("通用规则应识别单骑听牌", () => {
    const scenario = createScenario("guizhou-zhuoji", READY_SINGLE_WAIT_HAND, {
      remainingCounts: createRemainingCounts(NUMBER_TILE_IDS, READY_SINGLE_WAIT_HAND),
    });

    expect(getQuickAnswerCandidates(scenario)).toEqual([18]);
  });

  it("长沙 258 将应过滤非 2/5/8 将的候选", () => {
    const scenario = createScenario("changsha-258-jiang", READY_SINGLE_WAIT_HAND, {
      remainingCounts: createRemainingCounts(NUMBER_TILE_IDS, READY_SINGLE_WAIT_HAND),
    });

    expect(getQuickAnswerCandidates(scenario)).toEqual([]);
  });

  it("四川定缺会从快答答案中过滤缺门牌", () => {
    const scenario = createScenario("sichuan-blood-battle", READY_SINGLE_WAIT_HAND, {
      selfDingQue: "tong",
      remainingCounts: createRemainingCounts(NUMBER_TILE_IDS, READY_SINGLE_WAIT_HAND),
    });

    expect(getQuickAnswerCandidates(scenario)).toEqual([]);
  });

  it("海南海口版应过滤无番听口", () => {
    const scenario = createScenario("hainan-mahjong", READY_SINGLE_WAIT_HAND, {
      remainingCounts: createRemainingCounts(RIICHI_TILE_IDS, READY_SINGLE_WAIT_HAND),
    });

    expect(getQuickAnswerCandidates(scenario)).toEqual([]);
  });
});
