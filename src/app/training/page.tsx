import Link from "next/link";
import { listTrainingRuleStrategies, resolveTrainingRuleId } from "@/engine/mahjong/rule-strategies";

const modes = [
  {
    mode: "quick",
    title: "快答模式",
    desc: "识别当前牌面是否可胡牌并记录耗时，专练听胡反应。",
    action: "进入快答模式",
  },
  {
    mode: "discard",
    title: "弃牌模式",
    desc: "单巡最优弃牌，看看当前牌局应该打什么牌！",
    action: "进入弃牌模式",
  },
] as const;

export default async function TrainingHallPage({
  searchParams,
}: {
  searchParams: Promise<{ rule?: string }>;
}) {
  const { rule: rawRuleId } = await searchParams;
  const selectedRuleId = resolveTrainingRuleId(rawRuleId);
  const rules = listTrainingRuleStrategies();
  const selectedRule = rules.find((item) => item.id === selectedRuleId) ?? rules[0];

  return (
    <main className="page-wrap">
      <section className="section-header">
        <h1>训练大厅</h1>
        <p>先选玩法规则，再选训练模式。系统会按对应规则生成牌局并给出决策反馈。</p>
      </section>

      <section className="rule-select-card">
        <h2>当前玩法</h2>
        <div className="rule-select-row">
          {rules.map((rule) => (
            <Link
              className={`btn-ghost rule-select-btn ${selectedRuleId === rule.id ? "rule-select-btn--active" : ""}`}
              href={`/training?rule=${rule.id}`}
              key={rule.id}
            >
              {rule.shortLabel}
            </Link>
          ))}
        </div>
        <p>{selectedRule.description}</p>
      </section>

      <section className="mode-grid">
        {modes.map((item) => (
          <article className="mode-card" key={item.mode}>
            <h2>{item.title}</h2>
            <p>{item.desc}</p>
            <Link className="btn-primary" href={`/training/${item.mode}?rule=${selectedRuleId}`}>
              {item.action}
            </Link>
          </article>
        ))}
      </section>

      <section className="rule-hall-entry">
        <h2>麻将规则</h2>
        <p>先看新手规则教程：什么是定缺、什么是听牌、什么时候能胡、常见可胡牌型。</p>
        <Link className="btn-ghost rule-hall-entry-link" href="/rules">
          进入麻将规则
        </Link>
      </section>
    </main>
  );
}
