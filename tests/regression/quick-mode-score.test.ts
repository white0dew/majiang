import { describe, expect, it } from "vitest";

import { quickModeScore } from "@/engine/scoring/decision";

describe("regression/quick-mode-score", () => {
  it("完全命中应返回满分", () => {
    const result = quickModeScore([18, 19], [19, 18]);

    expect(result.correct).toBe(true);
    expect(result.score).toBe(100);
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
  });

  it("部分命中按 F1 计算分数", () => {
    const result = quickModeScore([18], [18, 19]);

    expect(result.correct).toBe(false);
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(0.5);
    expect(result.score).toBe(67);
  });

  it("答案和选择都为空时视为正确", () => {
    const result = quickModeScore([], []);

    expect(result.correct).toBe(true);
    expect(result.score).toBe(100);
  });
});
