"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { ScenarioPanel } from "@/components/scenario-panel";
import { TileChip } from "@/components/tile-chip";
import { getTrainingRuleStrategy } from "@/engine/mahjong/rule-strategies";
import { generateScenario, getQuickAnswerCandidates, getQuickOptionTiles, hasSelfDingQueTiles } from "@/engine/mahjong/scenario";
import {
  evaluateDiscardOptions,
  evaluateDiscardOptionsByStyle,
  explainDiscardComparison,
  getDiscardScoreFormula,
  getDiscardDecisionInsight,
  getDiscardStyleProfile,
  listDiscardStyleProfiles,
  quickModeScore,
} from "@/engine/scoring/decision";
import { tileIdToLabel } from "@/engine/mahjong/tiles";
import {
  addMistakeScenario,
  cloneScenario,
  getScenarioId,
  loadFavoriteScenarios,
  loadMistakeScenarios,
  removeFavoriteScenario,
  removeMistakeScenario,
  saveRecord,
  StoredScenarioQuestion,
  toggleFavoriteScenario,
} from "@/lib/storage/training-store";
import { DiscardEvaluation, DiscardMetricBreakdown, DiscardPlayStyle, Scenario, TrainingMode, TrainingRuleId } from "@/types/mahjong";

const modeText: Record<TrainingMode, { title: string; subtitle: string }> = {
  quick: {
    title: "快答模式",
    subtitle: "识别可胡牌并记录耗时，提升听胡反应速度",
  },
  discard: {
    title: "弃牌模式",
    subtitle: "选择本巡最优弃牌，平衡效率与风险",
  },
};

const MOBILE_MAX_WIDTH = 900;

type DiscardStyleOption = ReturnType<typeof listDiscardStyleProfiles>[number];
type DiscardStyleRecommendation = {
  style: DiscardStyleOption;
  best: DiscardEvaluation;
};

const SEAT_LABEL: Record<Scenario["opponents"][number]["seat"], string> = {
  left: "左家",
  across: "上家",
  right: "右家",
};

function createModeScenario(mode: TrainingMode, ruleId: TrainingRuleId): Scenario {
  let scenario = generateScenario(mode, ruleId);

  // Safety net: any mode must not contain self ding-que tiles in hand.
  for (let i = 0; i < 24 && hasSelfDingQueTiles(scenario); i += 1) {
    scenario = generateScenario(mode, ruleId);
  }

  return scenario;
}

function shouldForceLandscape(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const isMobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  return isMobile && isCoarsePointer && !isLandscape;
}

function listenMediaChange(media: MediaQueryList, listener: () => void): () => void {
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }

  media.addListener(listener);
  return () => media.removeListener(listener);
}

function LandscapeRequiredOverlay() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const syncBlockedState = () => setBlocked(shouldForceLandscape());
    syncBlockedState();

    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const orientationQuery = window.matchMedia("(orientation: landscape)");
    const offMobile = listenMediaChange(mobileQuery, syncBlockedState);
    const offPointer = listenMediaChange(pointerQuery, syncBlockedState);
    const offOrientation = listenMediaChange(orientationQuery, syncBlockedState);
    window.addEventListener("resize", syncBlockedState);
    window.addEventListener("orientationchange", syncBlockedState);

    return () => {
      offMobile();
      offPointer();
      offOrientation();
      window.removeEventListener("resize", syncBlockedState);
      window.removeEventListener("orientationchange", syncBlockedState);
    };
  }, []);

  useEffect(() => {
    if (blocked) {
      document.body.classList.add("orientation-locked");
      return () => {
        document.body.classList.remove("orientation-locked");
      };
    }

    document.body.classList.remove("orientation-locked");
    return () => {
      document.body.classList.remove("orientation-locked");
    };
  }, [blocked]);

  if (!blocked) {
    return null;
  }

  return (
    <div className="orientation-lock-overlay" role="alertdialog" aria-modal="true" aria-live="assertive">
      <div className="orientation-lock-card">
        <h2>请切换为横屏</h2>
        <p>训练模式仅支持手机横屏，切换后将自动继续。</p>
      </div>
    </div>
  );
}

export function TrainingModeClient({ mode, ruleId }: { mode: TrainingMode; ruleId: TrainingRuleId }) {
  return (
    <>
      <LandscapeRequiredOverlay key={`${mode}-${ruleId}`} />
      {mode === "quick" ? <QuickMode ruleId={ruleId} /> : <DiscardMode ruleId={ruleId} />}
    </>
  );
}

function useScenario(
  mode: TrainingMode,
  ruleId: TrainingRuleId,
): [Scenario | null, () => void, (scenario: Scenario) => void] {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    setScenario(createModeScenario(mode, ruleId));
  }, [mode, ruleId]);

  return [
    scenario,
    () => {
      setScenario(createModeScenario(mode, ruleId));
    },
    (nextScenario) => {
      setScenario(cloneScenario(nextScenario));
    },
  ];
}

function elapsedSince(startedAt: number): number {
  if (startedAt <= 0) {
    return 0;
  }
  return Math.max(0, Date.now() - startedAt);
}

function formatSignedPercentage(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function renderMetricBreakdown(detail: DiscardMetricBreakdown): ReactElement {
  return (
    <div className="metric-breakdown">
      <p className="metric-breakdown-formula">{detail.formula}</p>
      <ul>
        <li>基础分：{detail.baseScore.toFixed(1)}</li>
        {detail.penaltyTerms.map((item) => (
          <li key={item.label}>- {item.label}：{item.value.toFixed(1)}</li>
        ))}
        {detail.bonusTerms.map((item) => (
          <li key={item.label}>+ {item.label}：{item.value.toFixed(1)}</li>
        ))}
        <li>
          <strong>结果：{detail.finalScore.toFixed(1)}</strong>
        </li>
      </ul>
    </div>
  );
}

function DiscardEvaluationDetails({
  title,
  evaluation,
}: {
  title: string;
  evaluation: DiscardEvaluation;
}) {
  return (
    <section className="discard-detail-panel">
      <h4>{title}</h4>
      <p>
        有效进张（共 {evaluation.effectiveTiles} 张）：
        {evaluation.effectiveTileDetails.length > 0
          ? evaluation.effectiveTileDetails.map((item) => `${tileIdToLabel(item.tileId)}×${item.remainCount}`).join("、")
          : "暂无有效进张"}
      </p>
      <div className="discard-risk-breakdown">
        <p>
          放铳风险均值 {Math.round(evaluation.riskDetail.averageRisk * 1000) / 10}%；需牌概率均值{" "}
          {Math.round(evaluation.riskDetail.averageDemand * 1000) / 10}%。
        </p>
        {evaluation.riskDetail.opponents.map((opponent) => (
          <div className="discard-risk-opponent" key={`${evaluation.tileId}-${opponent.seat}`}>
            <p>
              {SEAT_LABEL[opponent.seat]}：风险 {Math.round(opponent.baseRisk * 1000) / 10}% →{" "}
              {Math.round(opponent.finalRisk * 1000) / 10}%；需牌 {Math.round(opponent.baseDemand * 1000) / 10}% →{" "}
              {Math.round(opponent.finalDemand * 1000) / 10}%
            </p>
            <ul>
              {opponent.factors.map((factor) => (
                <li key={`${opponent.seat}-${factor.label}`}>
                  {factor.label}（风险 {formatSignedPercentage(factor.riskDelta)} / 需牌 {formatSignedPercentage(factor.demandDelta)}）
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="discard-metrics-grid">
        <article>
          <h5>进攻效率</h5>
          {renderMetricBreakdown(evaluation.efficiencyDetail)}
        </article>
        <article>
          <h5>需牌规避</h5>
          {renderMetricBreakdown(evaluation.demandAvoidanceDetail)}
        </article>
        <article>
          <h5>风险控制</h5>
          {renderMetricBreakdown(evaluation.riskControlDetail)}
        </article>
      </div>
    </section>
  );
}

function useScenarioCollections(mode: TrainingMode, ruleId: TrainingRuleId): {
  favoriteQuestions: StoredScenarioQuestion[];
  mistakeQuestions: StoredScenarioQuestion[];
  refreshCollections: () => void;
} {
  const [refreshTick, setRefreshTick] = useState(0);

  const favoriteQuestions = useMemo(
    () => {
      void refreshTick;
      return loadFavoriteScenarios({ mode, ruleId });
    },
    [mode, ruleId, refreshTick],
  );
  const mistakeQuestions = useMemo(
    () => {
      void refreshTick;
      return loadMistakeScenarios({ mode, ruleId });
    },
    [mode, ruleId, refreshTick],
  );

  function refreshCollections(): void {
    setRefreshTick((prev) => prev + 1);
  }

  return {
    favoriteQuestions,
    mistakeQuestions,
    refreshCollections,
  };
}

function QuestionCollection({
  title,
  emptyText,
  items,
  onOpen,
  onRemove,
  showWrongCount = false,
}: {
  title: string;
  emptyText: string;
  items: StoredScenarioQuestion[];
  onOpen: (item: StoredScenarioQuestion) => void;
  onRemove: (id: string) => void;
  showWrongCount?: boolean;
}) {
  return (
    <details className="question-bank-card">
      <summary>
        {title}（{items.length}）
      </summary>
      {items.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <div className="question-bank-list">
          {items.slice(0, 12).map((item) => (
            <article className="question-bank-item" key={item.id}>
              <p>
                第 {item.scenario.round} 巡题目，更新于 {new Date(item.updatedAt).toLocaleString()}
              </p>
              {showWrongCount ? <p>累计答错 {item.wrongCount} 次</p> : null}
              <div className="question-bank-item-actions">
                <button className="btn-ghost" onClick={() => onOpen(item)} type="button">
                  打开重做
                </button>
                <button className="btn-ghost" onClick={() => onRemove(item.id)} type="button">
                  移除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </details>
  );
}

function QuickMode({ ruleId }: { ruleId: TrainingRuleId }) {
  const [scenario, resetScenario, setScenario] = useScenario("quick", ruleId);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedNoWait, setSelectedNoWait] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const ruleStrategy = useMemo(() => getTrainingRuleStrategy(ruleId), [ruleId]);
  const { favoriteQuestions, mistakeQuestions, refreshCollections } = useScenarioCollections("quick", ruleId);
  const [result, setResult] = useState<
    | {
        score: number;
        correct: boolean;
        precision: number;
        recall: number;
        summary: string;
        elapsedMs: number;
        selectedLabel: string;
      }
    | null
  >(null);

  const answers = useMemo(() => {
    if (!scenario) {
      return [];
    }
    return getQuickAnswerCandidates(scenario);
  }, [scenario]);

  const quickOptionTiles = useMemo(() => {
    if (!scenario) {
      return [];
    }
    return getQuickOptionTiles(scenario);
  }, [scenario]);

  useEffect(() => {
    if (!scenario || result) {
      return;
    }

    startedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);

    return () => window.clearInterval(timer);
  }, [scenario, result]);

  if (!scenario) {
    return <section className="mode-wrap">正在生成牌局...</section>;
  }

  const scenarioId = getScenarioId(scenario);
  const isFavorited = favoriteQuestions.some((item) => item.id === scenarioId);
  const isMistakeQuestion = mistakeQuestions.some((item) => item.id === scenarioId);

  function resetRoundState(): void {
    setSelected([]);
    setSelectedNoWait(false);
    setResult(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
  }

  function openSavedQuestion(item: StoredScenarioQuestion): void {
    setScenario(item.scenario);
    resetRoundState();
  }

  function openRandomSavedQuestion(items: StoredScenarioQuestion[]): void {
    if (items.length === 0) {
      return;
    }
    const picked = items[Math.floor(Math.random() * items.length)];
    openSavedQuestion(picked);
  }

  function toggleCurrentFavorite(): void {
    if (!scenario) {
      return;
    }
    toggleFavoriteScenario(scenario);
    refreshCollections();
  }

  function toggleTile(tileId: number): void {
    if (result) {
      return;
    }
    setSelectedNoWait(false);
    setSelected((prev) =>
      prev.includes(tileId) ? prev.filter((item) => item !== tileId) : [...prev, tileId],
    );
  }

  function toggleNoWait(): void {
    if (result) {
      return;
    }

    setSelectedNoWait((prev) => {
      const next = !prev;
      if (next) {
        setSelected([]);
      }
      return next;
    });
  }

  function submitQuickAnswer(): void {
    if (!scenario) {
      return;
    }

    const finalElapsed = elapsedSince(startedAtRef.current);
    const picked = selectedNoWait ? [] : selected;
    const pickedLabel =
      picked.length > 0 ? picked.map((tileId) => tileIdToLabel(tileId)).join("、") : "当前非听牌";
    const evaluation = quickModeScore(picked, answers);
    setElapsedMs(finalElapsed);
    setResult({
      ...evaluation,
      elapsedMs: finalElapsed,
      selectedLabel: pickedLabel,
    });

    saveRecord({
      mode: "quick",
      ruleId,
      correct: evaluation.correct,
      score: evaluation.score,
      elapsedMs: finalElapsed,
      summary: `${evaluation.summary}；你的选择：${pickedLabel}；耗时 ${(finalElapsed / 1000).toFixed(1)}s`,
    });

    if (!evaluation.correct) {
      addMistakeScenario(scenario);
      refreshCollections();
    }
  }

  function nextQuestion(): void {
    resetScenario();
    resetRoundState();
  }

  return (
    <section className="mode-wrap">
      <header className="mode-header">
        <p className="rule-tag">{ruleStrategy.title}</p>
        <h1>{modeText.quick.title}</h1>
        <p>{modeText.quick.subtitle}</p>
      </header>

      <div className="countdown">当前用时: {(elapsedMs / 1000).toFixed(1)}s</div>
      <ScenarioPanel scenario={scenario} disableDiscard selfHint={ruleStrategy.quickSelfHint} />

      <section className="scenario-tools-card">
        <p>
          当前题库：收藏 {favoriteQuestions.length} 题，错题 {mistakeQuestions.length} 题。
        </p>
        <div className="scenario-tools-actions">
          <button className="btn-ghost" onClick={toggleCurrentFavorite} type="button">
            {isFavorited ? "取消收藏本题" : "收藏本题"}
          </button>
          <button
            className="btn-ghost"
            disabled={favoriteQuestions.length === 0}
            onClick={() => openRandomSavedQuestion(favoriteQuestions)}
            type="button"
          >
            随机收藏题
          </button>
          <button
            className="btn-ghost"
            disabled={mistakeQuestions.length === 0}
            onClick={() => openRandomSavedQuestion(mistakeQuestions)}
            type="button"
          >
            随机错题
          </button>
          {isMistakeQuestion ? (
            <button
              className="btn-ghost"
              onClick={() => {
                removeMistakeScenario(scenarioId);
                refreshCollections();
              }}
              type="button"
            >
              从错题本移除本题
            </button>
          ) : null}
        </div>
      </section>

      <div className="answer-panel">
        <h3>请选择你认为能胡的牌（⚠️ 请考虑当前已露出的牌）</h3>
        <p>{ruleStrategy.quickPanelHint(scenario)}</p>
        <div className="quick-actions">
          <button
            className={`btn-ghost quick-no-wait ${selectedNoWait ? "quick-no-wait--active" : ""}`}
            onClick={toggleNoWait}
            type="button"
          >
            当前非听牌
          </button>
        </div>
        <div className="tile-grid">
          {quickOptionTiles.map((tileId) => (
            <TileChip
              compact
              key={tileId}
              tileId={tileId}
              onClick={toggleTile}
              selected={selected.includes(tileId)}
              muted={Boolean(result && !answers.includes(tileId))}
            />
          ))}
        </div>

        {!result ? (
          <button className="btn-primary" onClick={submitQuickAnswer} type="button">
            提交答案
          </button>
        ) : (
          <div className="result-card">
            <p>
              得分 <strong>{result.score}</strong>，{result.correct ? "完全正确" : "有偏差"}
            </p>
            <p>精度 {Math.round(result.precision * 100)}%，召回 {Math.round(result.recall * 100)}%</p>
            <p>你的选择：{result.selectedLabel}</p>
            <p>耗时：{(result.elapsedMs / 1000).toFixed(1)}s</p>
            <p>{result.summary}</p>
            <div className="result-action-row">
              <button className="btn-ghost" onClick={toggleCurrentFavorite} type="button">
                {isFavorited ? "取消收藏本题" : "收藏本题"}
              </button>
              {isMistakeQuestion ? (
                <button
                  className="btn-ghost"
                  onClick={() => {
                    removeMistakeScenario(scenarioId);
                    refreshCollections();
                  }}
                  type="button"
                >
                  从错题本移除
                </button>
              ) : null}
            </div>
            <button className="btn-primary" onClick={nextQuestion} type="button">
              下一题
            </button>
          </div>
        )}
      </div>

      <QuestionCollection
        title="收藏题"
        emptyText="还没有收藏题，遇到想复盘的牌局可以先收藏。"
        items={favoriteQuestions}
        onOpen={openSavedQuestion}
        onRemove={(id) => {
          removeFavoriteScenario(id);
          refreshCollections();
        }}
      />
      <QuestionCollection
        title="错题本"
        emptyText="还没有错题。答错题目会自动收录在这里。"
        items={mistakeQuestions}
        onOpen={openSavedQuestion}
        onRemove={(id) => {
          removeMistakeScenario(id);
          refreshCollections();
        }}
        showWrongCount
      />
    </section>
  );
}

function DiscardMode({ ruleId }: { ruleId: TrainingRuleId }) {
  const [scenario, resetScenario, setScenario] = useScenario("discard", ruleId);
  const [pickedDiscard, setPickedDiscard] = useState<number | null>(null);
  const [playStyle, setPlayStyle] = useState<DiscardPlayStyle>("balanced");
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const ruleStrategy = useMemo(() => getTrainingRuleStrategy(ruleId), [ruleId]);
  const { favoriteQuestions, mistakeQuestions, refreshCollections } = useScenarioCollections("discard", ruleId);
  const styleOptions = useMemo(() => listDiscardStyleProfiles(), []);
  const playStyleProfile = useMemo(() => getDiscardStyleProfile(playStyle), [playStyle]);
  const scoreFormula = useMemo(() => getDiscardScoreFormula(playStyle), [playStyle]);
  const [result, setResult] = useState<
    | {
        selectedTileId: number;
        elapsedMs: number;
      }
    | null
  >(null);

  const evaluations = useMemo(() => {
    if (!scenario) {
      return [];
    }
    return evaluateDiscardOptions(scenario, playStyle);
  }, [scenario, playStyle]);

  const styleRecommendations = useMemo(() => {
    if (!scenario) {
      return [] as DiscardStyleRecommendation[];
    }

    const byStyle = evaluateDiscardOptionsByStyle(scenario);
    return styleOptions.reduce<DiscardStyleRecommendation[]>((acc, style) => {
      const best = byStyle[style.id][0];
      if (best) {
        acc.push({ style, best });
      }
      return acc;
    }, []);
  }, [scenario, styleOptions]);

  useEffect(() => {
    if (!scenario || result) {
      return;
    }

    startedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(elapsedSince(startedAtRef.current));
    }, 100);

    return () => window.clearInterval(timer);
  }, [scenario, result]);

  if (!scenario) {
    return <section className="mode-wrap">正在生成牌局...</section>;
  }

  const scenarioId = getScenarioId(scenario);
  const isFavorited = favoriteQuestions.some((item) => item.id === scenarioId);
  const isMistakeQuestion = mistakeQuestions.some((item) => item.id === scenarioId);
  const best = evaluations[0];
  const pickedEvaluation = pickedDiscard !== null ? evaluations.find((item) => item.tileId === pickedDiscard) ?? null : null;
  const resultChosen = result
    ? evaluations.find((item) => item.tileId === result.selectedTileId) ?? null
    : null;
  const resultCorrect =
    resultChosen && best
      ? resultChosen.tileId === best.tileId ||
        resultChosen.totalScore >= best.totalScore - playStyleProfile.acceptanceGap
      : false;
  const resultComparisonReasons =
    resultChosen && best ? explainDiscardComparison(best, resultChosen, playStyle) : [];
  const resultInsight =
    resultChosen && best ? getDiscardDecisionInsight(best, resultChosen, playStyle) : null;
  const resultRank = resultChosen
    ? evaluations.findIndex((item) => item.tileId === resultChosen.tileId) + 1
    : 0;

  function resetRoundState(): void {
    setPickedDiscard(null);
    setResult(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
  }

  function openSavedQuestion(item: StoredScenarioQuestion): void {
    setScenario(item.scenario);
    resetRoundState();
  }

  function openRandomSavedQuestion(items: StoredScenarioQuestion[]): void {
    if (items.length === 0) {
      return;
    }
    const picked = items[Math.floor(Math.random() * items.length)];
    openSavedQuestion(picked);
  }

  function toggleCurrentFavorite(): void {
    if (!scenario) {
      return;
    }
    toggleFavoriteScenario(scenario);
    refreshCollections();
  }

  function submitChoice(): void {
    if (pickedDiscard === null || !best || !scenario) {
      return;
    }

    const chosen = evaluations.find((item) => item.tileId === pickedDiscard);
    if (!chosen) {
      return;
    }

    const finalElapsed = elapsedSince(startedAtRef.current);
    const comparisonReasons = explainDiscardComparison(best, chosen, playStyle);
    setElapsedMs(finalElapsed);
    setResult({ selectedTileId: chosen.tileId, elapsedMs: finalElapsed });

    const correct =
      chosen.tileId === best.tileId ||
      chosen.totalScore >= best.totalScore - playStyleProfile.acceptanceGap;

    saveRecord({
      mode: "discard",
      ruleId,
      discardStyle: playStyle,
      correct,
      score: Math.round(chosen.totalScore),
      elapsedMs: finalElapsed,
      summary: `${playStyleProfile.label}打法推荐打 ${tileIdToLabel(best.tileId)}，你打 ${tileIdToLabel(chosen.tileId)}；${comparisonReasons[0]}；耗时 ${(finalElapsed / 1000).toFixed(1)}s`,
    });

    if (!correct) {
      addMistakeScenario(scenario);
      refreshCollections();
    }
  }

  function nextQuestion(): void {
    resetScenario();
    resetRoundState();
  }

  return (
    <section className="mode-wrap">
      <header className="mode-header">
        <p className="rule-tag">{ruleStrategy.title}</p>
        <h1>{modeText.discard.title}</h1>
        <p>{modeText.discard.subtitle}</p>
      </header>

      <div className="countdown">当前用时: {(elapsedMs / 1000).toFixed(1)}s</div>

      <section className="scenario-tools-card">
        <p>
          当前题库：收藏 {favoriteQuestions.length} 题，错题 {mistakeQuestions.length} 题。
        </p>
        <div className="scenario-tools-actions">
          <button className="btn-ghost" onClick={toggleCurrentFavorite} type="button">
            {isFavorited ? "取消收藏本题" : "收藏本题"}
          </button>
          <button
            className="btn-ghost"
            disabled={favoriteQuestions.length === 0}
            onClick={() => openRandomSavedQuestion(favoriteQuestions)}
            type="button"
          >
            随机收藏题
          </button>
          <button
            className="btn-ghost"
            disabled={mistakeQuestions.length === 0}
            onClick={() => openRandomSavedQuestion(mistakeQuestions)}
            type="button"
          >
            随机错题
          </button>
          {isMistakeQuestion ? (
            <button
              className="btn-ghost"
              onClick={() => {
                removeMistakeScenario(scenarioId);
                refreshCollections();
              }}
              type="button"
            >
              从错题本移除本题
            </button>
          ) : null}
        </div>
      </section>

      <div className="discard-style-bar">
        <p>
          当前打法：<strong>{playStyleProfile.label}</strong>（{playStyleProfile.description}）
        </p>
        <div className="discard-style-actions">
          {styleOptions.map((style) => (
            <button
              className={`btn-ghost discard-style-btn ${playStyle === style.id ? "discard-style-btn--active" : ""}`}
              key={style.id}
              onClick={() => setPlayStyle(style.id)}
              type="button"
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <details className="discard-formula-card">
        <summary>计分公式与术语说明（展开查看）</summary>
        <p className="discard-formula-main">{scoreFormula.totalFormula}</p>
        <ul className="discard-formula-list">
          {scoreFormula.componentFormulas.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <ul className="discard-term-list">
          {scoreFormula.termDefinitions.map((item) => (
            <li key={item.term}>
              <strong>{item.term}：</strong>
              {item.explain}
            </li>
          ))}
        </ul>
      </details>

      <ScenarioPanel
        scenario={scenario}
        onPickDiscard={setPickedDiscard}
        pickedDiscard={pickedDiscard}
        disableDiscard={Boolean(result)}
        selfHint={ruleStrategy.discardSelfHint}
      />

      <div className="answer-panel">
        {!result ? (
          <>
            <p>当前选择: {pickedDiscard !== null ? tileIdToLabel(pickedDiscard) : "未选择"}</p>
            <button className="btn-primary" onClick={submitChoice} type="button">
              提交弃牌
            </button>
            {pickedEvaluation ? (
              <details className="discard-detail-card" open>
                <summary>当前所选弃牌详细拆解</summary>
                <DiscardEvaluationDetails
                  title={`打 ${tileIdToLabel(pickedEvaluation.tileId)} 后的三项分析`}
                  evaluation={pickedEvaluation}
                />
              </details>
            ) : null}
          </>
        ) : (
          <div className="result-card">
            {resultChosen && best ? (
              <>
                <p>
                  你的选择：<strong>{tileIdToLabel(resultChosen.tileId)}</strong>（{resultChosen.totalScore.toFixed(1)}分）
                </p>
                <p>
                  推荐选择：<strong>{tileIdToLabel(best.tileId)}</strong>（{best.totalScore.toFixed(1)}分）
                </p>
                <p>
                  当前记分风格：{playStyleProfile.label}
                </p>
                <p>
                  你的三项分：效率 {resultChosen.efficiency.toFixed(1)}，需牌规避 {resultChosen.demandAvoidance.toFixed(1)}，
                  风险控制 {resultChosen.riskControl.toFixed(1)}
                </p>
                <p>
                  推荐三项分：效率 {best.efficiency.toFixed(1)}，需牌规避 {best.demandAvoidance.toFixed(1)}，风险控制{" "}
                  {best.riskControl.toFixed(1)}
                </p>
                {resultInsight ? (
                  <>
                    <p>
                      <strong>结论：</strong>
                      {resultInsight.title}
                    </p>
                    <p>{resultInsight.gapSummary}</p>
                    <p>
                      该打法排名：第 {resultRank}/{evaluations.length}
                    </p>
                    <p className="result-score-note">{resultInsight.scoreNote}</p>
                  </>
                ) : null}
                <p>
                  {resultCorrect ? "该打法下判断合理" : "该打法下建议优化"}：向听 {resultChosen.shantenAfter}，有效进张{" "}
                  {resultChosen.effectiveTiles}，
                  风险 {Math.round(resultChosen.risk * 100)}%
                </p>
                <p>耗时：{(result.elapsedMs / 1000).toFixed(1)}s</p>
                <p>
                  系统判断依据（{playStyleProfile.label}打法推荐打 <strong>{tileIdToLabel(best.tileId)}</strong>）：
                </p>
                <ol className="result-reason-list">
                  {resultComparisonReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>{reason}</li>
                  ))}
                </ol>
                {resultInsight ? (
                  <>
                    <p>建议动作：</p>
                    <ul className="result-action-list">
                      {resultInsight.actionTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p>不同打法参考（同一牌局）：</p>
                <ul className="discard-style-recommend-list">
                  {styleRecommendations.map((item) => (
                    <li key={item.style.id}>
                      {item.style.label}：打 <strong>{tileIdToLabel(item.best.tileId)}</strong>（{item.best.totalScore.toFixed(1)}分）
                    </li>
                  ))}
                </ul>
                {resultChosen.reasons.length > 0 ? <p>{resultChosen.reasons.join("；")}</p> : null}
                <div className="result-action-row">
                  <button className="btn-ghost" onClick={toggleCurrentFavorite} type="button">
                    {isFavorited ? "取消收藏本题" : "收藏本题"}
                  </button>
                  {isMistakeQuestion ? (
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        removeMistakeScenario(scenarioId);
                        refreshCollections();
                      }}
                      type="button"
                    >
                      从错题本移除
                    </button>
                  ) : null}
                </div>
                <details className="discard-detail-card" open>
                  <summary>你的选择详细拆解</summary>
                  <DiscardEvaluationDetails
                    title={`打 ${tileIdToLabel(resultChosen.tileId)} 后的三项分析`}
                    evaluation={resultChosen}
                  />
                </details>
                {best.tileId !== resultChosen.tileId ? (
                  <details className="discard-detail-card">
                    <summary>推荐弃牌详细拆解</summary>
                    <DiscardEvaluationDetails
                      title={`打 ${tileIdToLabel(best.tileId)} 后的三项分析`}
                      evaluation={best}
                    />
                  </details>
                ) : null}
              </>
            ) : (
              <p>当前结果不可用，请直接下一题。</p>
            )}
            <button className="btn-primary" onClick={nextQuestion} type="button">
              下一题
            </button>
          </div>
        )}
      </div>

      <QuestionCollection
        title="收藏题"
        emptyText="还没有收藏题，遇到想复盘的牌局可以先收藏。"
        items={favoriteQuestions}
        onOpen={openSavedQuestion}
        onRemove={(id) => {
          removeFavoriteScenario(id);
          refreshCollections();
        }}
      />
      <QuestionCollection
        title="错题本"
        emptyText="还没有错题。答错题目会自动收录在这里。"
        items={mistakeQuestions}
        onOpen={openSavedQuestion}
        onRemove={(id) => {
          removeMistakeScenario(id);
          refreshCollections();
        }}
        showWrongCount
      />
    </section>
  );
}
