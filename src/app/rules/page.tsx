import Link from "next/link";
import { mahjongRuleGuides } from "@/lib/rules/mahjong-rules";

export default function RulesPage() {
  return (
    <main className="page-wrap">
      <section className="section-header">
        <h1>麻将规则</h1>
        <p>选择玩法类型，按新手教程顺序查看：术语解释、胡牌条件、可胡牌型与实战建议。</p>
      </section>

      <section className="rule-entry-grid">
        {mahjongRuleGuides.map((rule) => (
          <article className="rule-entry-card" key={rule.id}>
            <p className="rule-tag">{rule.region}</p>
            <h2>{rule.title}</h2>
            <p>{rule.shortDesc}</p>
            <Link className="btn-primary" href={`/rules/${rule.id}`}>
              查看详细规则
            </Link>
          </article>
        ))}
      </section>

      <section className="rule-entry-note">
        <h2>新手建议</h2>
        <p>先看规则再训练。每个玩法的计分、行牌和风险判断都不同，混着记最容易打乱节奏。</p>
      </section>
    </main>
  );
}
