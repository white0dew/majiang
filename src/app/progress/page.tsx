"use client";

import { useMemo, useState } from "react";
import { listTrainingRuleStrategies } from "@/engine/mahjong/rule-strategies";
import { clearRecords, loadRecords, summarizeRecords } from "@/lib/storage/training-store";
import { TrainingRuleId } from "@/types/mahjong";

const modeName = {
  quick: "快答",
  discard: "弃牌",
} as const;
const ruleName = Object.fromEntries(
  listTrainingRuleStrategies().map((rule) => [rule.id, rule.shortLabel]),
) as Record<TrainingRuleId, string>;

export default function ProgressPage() {
  const [records, setRecords] = useState(() => loadRecords());

  const stats = useMemo(() => summarizeRecords(records), [records]);

  return (
    <main className="page-wrap">
      <section className="section-header">
        <h1>我的成长</h1>
        <p>本页数据保存在本机浏览器 localStorage，不依赖后端服务。</p>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <h2>总训练题数</h2>
          <p>{stats.total}</p>
        </article>
        <article className="stat-card">
          <h2>平均得分</h2>
          <p>{stats.avgScore}</p>
        </article>
        <article className="stat-card">
          <h2>整体准确率</h2>
          <p>{stats.accuracy}%</p>
        </article>
      </section>

      <section className="rule-card">
        <h2>模式分布</h2>
        <ul>
          {(Object.keys(modeName) as Array<keyof typeof modeName>).map((mode) => (
            <li key={mode}>
              {modeName[mode]}：{stats.byMode[mode].count} 题，平均 {stats.byMode[mode].avgScore} 分，准确率 {stats.byMode[mode].accuracy}%
            </li>
          ))}
        </ul>
      </section>

      <section className="rule-card">
        <h2>玩法分布</h2>
        <ul>
          {(Object.keys(ruleName) as TrainingRuleId[]).map((ruleId) => (
            <li key={ruleId}>
              {ruleName[ruleId]}：{stats.byRule[ruleId].count} 题，平均 {stats.byRule[ruleId].avgScore} 分，准确率{" "}
              {stats.byRule[ruleId].accuracy}%
            </li>
          ))}
        </ul>
      </section>

      <section className="rule-card">
        <div className="table-head">
          <h2>最近记录</h2>
          <button
            className="btn-ghost"
            onClick={() => {
              clearRecords();
              setRecords([]);
            }}
            type="button"
          >
            清空记录
          </button>
        </div>

        {records.length === 0 ? (
          <p>暂无训练记录，先去训练大厅做几题。</p>
        ) : (
          <div className="history-list">
            {records.slice(0, 20).map((record) => (
              <article className="history-item" key={record.id}>
                <p>
                  [{ruleName[record.ruleId]} · {modeName[record.mode]}] {record.score} 分 /{" "}
                  {record.correct ? "合理" : "待优化"}
                </p>
                <p>{record.summary}</p>
                <p>{new Date(record.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
