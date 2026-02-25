import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addMistakeScenario,
  cloneScenario,
  getScenarioId,
  loadFavoriteScenarios,
  loadMistakeScenarios,
  removeMistakeScenario,
  toggleFavoriteScenario,
} from "@/lib/storage/training-store";
import { NUMBER_TILE_IDS } from "@/engine/mahjong/tiles";
import { Scenario } from "@/types/mahjong";

import { createRemainingCounts } from "../fixtures/hands";

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createLocalStorageMock(): LocalStorageMock {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
  };
}

const quickScenario: Scenario = {
  mode: "quick",
  ruleId: "guizhou-zhuoji",
  selfHand: [0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 21],
  selfDingQue: null,
  opponents: [],
  round: 8,
  remainingCounts: createRemainingCounts(NUMBER_TILE_IDS, [0, 1, 2, 3, 4, 5, 9, 10, 11, 18, 19, 20, 21]),
};

describe("core/training-store-collections", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: createLocalStorageMock(),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("收藏开关应可重复切换", () => {
    expect(loadFavoriteScenarios({ mode: "quick", ruleId: "guizhou-zhuoji" })).toHaveLength(0);

    const firstToggle = toggleFavoriteScenario(quickScenario);
    const secondToggle = toggleFavoriteScenario(quickScenario);

    expect(firstToggle).toBe(true);
    expect(secondToggle).toBe(false);
    expect(loadFavoriteScenarios({ mode: "quick", ruleId: "guizhou-zhuoji" })).toHaveLength(0);
  });

  it("错题应累计次数，且可移除", () => {
    addMistakeScenario(quickScenario);
    addMistakeScenario(quickScenario);

    const mistakes = loadMistakeScenarios({ mode: "quick", ruleId: "guizhou-zhuoji" });
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]?.wrongCount).toBe(2);

    if (mistakes[0]) {
      removeMistakeScenario(mistakes[0].id);
    }

    expect(loadMistakeScenarios({ mode: "quick", ruleId: "guizhou-zhuoji" })).toHaveLength(0);
  });

  it("同一牌局的场景 ID 应稳定", () => {
    const first = getScenarioId(quickScenario);
    const second = getScenarioId(cloneScenario(quickScenario));

    expect(first).toBe(second);
  });
});
