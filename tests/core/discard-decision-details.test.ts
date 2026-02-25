import { describe, expect, it } from "vitest";

import { evaluateDiscardOptions } from "@/engine/scoring/decision";
import { NUMBER_TILE_IDS } from "@/engine/mahjong/tiles";
import { Scenario } from "@/types/mahjong";

import { createRemainingCounts } from "../fixtures/hands";

describe("core/discard-decision-details", () => {
  const selfHand = [0, 0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 21];

  const scenario: Scenario = {
    mode: "discard",
    ruleId: "sichuan-blood-battle",
    selfHand,
    selfDingQue: null,
    round: 8,
    remainingCounts: createRemainingCounts(NUMBER_TILE_IDS, selfHand),
    opponents: [
      {
        seat: "left",
        dingQue: "wan",
        discards: [0, 8, 12],
        melds: [[18, 19, 20]],
      },
      {
        seat: "across",
        dingQue: "tong",
        discards: [3, 6, 10],
        melds: [[9, 10, 11], [12, 13, 14]],
      },
      {
        seat: "right",
        dingQue: null,
        discards: [1, 7, 22],
        melds: [],
      },
    ],
  };

  it("应产出有效进张、风险拆解和三项分计算明细", () => {
    const evaluations = evaluateDiscardOptions(scenario, "balanced");
    const best = evaluations[0];

    expect(evaluations.length).toBeGreaterThan(0);
    expect(best.effectiveTileDetails.length).toBeGreaterThan(0);
    expect(best.riskDetail.opponents).toHaveLength(3);
    expect(best.efficiencyDetail.formula).toContain("效率");
    expect(best.demandAvoidanceDetail.formula).toContain("需牌规避");
    expect(best.riskControlDetail.formula).toContain("风险控制");
  });

  it("对手已打过同牌时，应在风险因子里标注现物", () => {
    const evaluations = evaluateDiscardOptions(scenario, "balanced");
    const discardOneWan = evaluations.find((item) => item.tileId === 0);

    expect(discardOneWan).toBeTruthy();
    const leftOpponent = discardOneWan?.riskDetail.opponents.find((item) => item.seat === "left");
    expect(leftOpponent).toBeTruthy();
    expect(leftOpponent?.factors.some((item) => item.label.includes("现物"))).toBe(true);
  });
});
