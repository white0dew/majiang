"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { saveRecord } from "@/lib/storage/training-store";
import { DiscardEvaluation, DiscardPlayStyle, Scenario, TrainingMode, TrainingRuleId } from "@/types/mahjong";

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

type DiscardStyleOption = ReturnType<typeof listDiscardStyleProfiles>[number];
type DiscardStyleRecommendation = {
  style: DiscardStyleOption;
  best: DiscardEvaluation;
};

function createModeScenario(mode: TrainingMode, ruleId: TrainingRuleId): Scenario {
  let scenario = generateScenario(mode, ruleId);

  // Safety net: any mode must not contain self ding-que tiles in hand.
  for (let i = 0; i < 24 && hasSelfDingQueTiles(scenario); i += 1) {
    scenario = generateScenario(mode, ruleId);
  }

  return scenario;
}

export function TrainingModeClient({ mode, ruleId }: { mode: TrainingMode; ruleId: TrainingRuleId }) {
  if (mode === "quick") {
    return <QuickMode ruleId={ruleId} />;
  }

  return <DiscardMode ruleId={ruleId} />;
}

function useScenario(mode: TrainingMode, ruleId: TrainingRuleId): [Scenario | null, () => void] {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    setScenario(createModeScenario(mode, ruleId));
  }, [mode, ruleId]);

  return [
    scenario,
    () => {
      setScenario(createModeScenario(mode, ruleId));
    },
  ];
}

function elapsedSince(startedAt: number): number {
  if (startedAt <= 0) {
    return 0;
  }
  return Math.max(0, Date.now() - startedAt);
}

function QuickMode({ ruleId }: { ruleId: TrainingRuleId }) {
  const [scenario, resetScenario] = useScenario("quick", ruleId);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedNoWait, setSelectedNoWait] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const ruleStrategy = useMemo(() => getTrainingRuleStrategy(ruleId), [ruleId]);
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
  }

  function nextQuestion(): void {
    resetScenario();
    setSelected([]);
    setSelectedNoWait(false);
    setResult(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
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
            <button className="btn-primary" onClick={nextQuestion} type="button">
              下一题
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function DiscardMode({ ruleId }: { ruleId: TrainingRuleId }) {
  const [scenario, resetScenario] = useScenario("discard", ruleId);
  const [pickedDiscard, setPickedDiscard] = useState<number | null>(null);
  const [playStyle, setPlayStyle] = useState<DiscardPlayStyle>("balanced");
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const ruleStrategy = useMemo(() => getTrainingRuleStrategy(ruleId), [ruleId]);
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

  const best = evaluations[0];
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

  function submitChoice(): void {
    if (pickedDiscard === null || !best) {
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
  }

  function nextQuestion(): void {
    resetScenario();
    setPickedDiscard(null);
    setResult(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
  }

  return (
    <section className="mode-wrap">
      <header className="mode-header">
        <p className="rule-tag">{ruleStrategy.title}</p>
        <h1>{modeText.discard.title}</h1>
        <p>{modeText.discard.subtitle}</p>
      </header>

      <div className="countdown">当前用时: {(elapsedMs / 1000).toFixed(1)}s</div>

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
    </section>
  );
}
