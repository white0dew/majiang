import Link from "next/link";

const highlights = [
  {
    title: "大局观训练",
    text: "每题都结合牌河、副露和定缺，不再只盯手牌。",
  },
  {
    title: "快速听胡识别",
    text: "通过限时快答提高实战反应，减少错过和牌机会。",
  },
  {
    title: "弃牌风险反馈",
    text: "系统展示向听、进张与放铳风险，帮助形成稳定决策习惯。",
  },
];

export default function Home() {
  return (
    <main className="page-wrap">
      <section className="hero-card">
        <p className="hero-kicker">多玩法麻将决策训练</p>
        <h1>麻局教练</h1>
        <p>
          支持四川血战与贵州捉鸡等规则，专注提升大局观与决策速度。不是对战平台，而是针对实战弱点的训练工具。
        </p>
        <div className="hero-actions">
          <Link className="btn-primary" href="/training">
            开始训练
          </Link>
          <Link className="btn-ghost" href="/rules">
            麻将规则
          </Link>
        </div>
      </section>

      <section className="highlight-grid">
        {highlights.map((item) => (
          <article className="highlight-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
