import Link from "next/link";

const modes = [
  {
    mode: "quick",
    title: "快答模式",
    desc: "识别可胡牌并记录耗时，专练听胡反应。",
    action: "进入快答",
  },
  {
    mode: "discard",
    title: "弃牌模式",
    desc: "单巡最优弃牌，平衡效率与风险。",
    action: "进入弃牌",
  },
] as const;

export default function TrainingHallPage() {
  return (
    <main className="page-wrap">
      <section className="section-header">
        <h1>训练大厅</h1>
        <p>请选择一个模式开始练习，系统会自动生成随机牌局并给出决策反馈。</p>
      </section>

      <section className="mode-grid">
        {modes.map((item) => (
          <article className="mode-card" key={item.mode}>
            <h2>{item.title}</h2>
            <p>{item.desc}</p>
            <Link className="btn-primary" href={`/training/${item.mode}`}>
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
