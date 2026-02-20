import Link from "next/link";
import { notFound } from "next/navigation";
import { getMahjongRuleGuide, mahjongRuleGuides } from "@/lib/rules/mahjong-rules";

export function generateStaticParams() {
  return mahjongRuleGuides.map((rule) => ({ ruleId: rule.id }));
}

export default async function RuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  const rule = getMahjongRuleGuide(ruleId);

  if (!rule) {
    notFound();
  }

  const termMap = new Map(rule.terms.map((item) => [item.term, item]));
  const coreTerms = rule.coreTermNames
    .map((name) => termMap.get(name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const shownTerms = coreTerms.length > 0 ? coreTerms : rule.terms.slice(0, 4);
  const shownTermSet = new Set(shownTerms.map((item) => item.term));
  const advancedTerms = rule.terms.filter((item) => !shownTermSet.has(item.term));

  const patternMap = new Map(rule.winningPatterns.map((item) => [item.name, item]));
  const corePatterns = rule.corePatternNames
    .map((name) => patternMap.get(name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const shownPatterns = corePatterns.length > 0 ? corePatterns : rule.winningPatterns.slice(0, 3);
  const shownPatternSet = new Set(shownPatterns.map((item) => item.name));
  const advancedPatterns = rule.winningPatterns.filter((item) => !shownPatternSet.has(item.name));

  const quickStartMustRead = rule.quickStartSteps.slice(0, 3);
  const quickStartAdvanced = rule.quickStartSteps.slice(3);

  return (
    <main className="page-wrap">
      <div className="inline-links">
        <Link href="/rules">返回麻将规则</Link>
        <Link href="/training">去训练大厅</Link>
      </div>

      <section className="section-header">
        <p className="rule-tag">{rule.region}</p>
        <h1>{rule.title}</h1>
        <p>{rule.beginnerIntro}</p>
      </section>

      <section className="rule-reminder-card">
        <h2>先记住这一句</h2>
        <p>{rule.coreReminder}</p>
        <div className="rule-chip-row">
          {rule.tags.map((tag) => (
            <span className="rule-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="rule-detail-card">
        <h2>新手先过 3 步</h2>
        <p className="rule-formula">{rule.beginnerFormula}</p>
        <ol className="rule-check-list">
          {quickStartMustRead.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="rule-term-grid">
        {shownTerms.map((item) => (
          <article className="rule-term-card" key={item.term}>
            <h2>什么是{item.term}</h2>
            <p>{item.explain}</p>
            {item.example ? <p className="rule-note">例子：{item.example}</p> : null}
            {item.warning ? <p className="rule-warning">提醒：{item.warning}</p> : null}
          </article>
        ))}
      </section>

      <section className="rule-detail-card">
        <h2>什么时候可以胡牌</h2>
        <p>照这个清单逐条过，任何一条不满足都先别急着喊胡。</p>
        <ul className="rule-check-list">
          {rule.huChecklist.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="rule-pattern-grid">
        {shownPatterns.map((pattern) => (
          <article className="rule-pattern-card" key={pattern.name}>
            <h2>{pattern.name}</h2>
            <p>
              <strong>成型条件：</strong>
              {pattern.requirement}
            </p>
            <p>
              <strong>新手解读：</strong>
              {pattern.detail}
            </p>
            {pattern.sample ? <p className="rule-note">示例：{pattern.sample}</p> : null}
          </article>
        ))}
      </section>

      <details className="rule-fold-card">
        <summary>展开进阶内容（术语、牌型、实战）</summary>
        <div className="rule-fold-content">
          {quickStartAdvanced.length > 0 ? (
            <section className="rule-detail-card">
              <h2>完整上桌顺序（后 2 步）</h2>
              <ol className="rule-check-list">
                {quickStartAdvanced.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {advancedTerms.length > 0 ? (
            <section className="rule-term-grid">
              {advancedTerms.map((item) => (
                <article className="rule-term-card" key={item.term}>
                  <h2>什么是{item.term}</h2>
                  <p>{item.explain}</p>
                  {item.example ? <p className="rule-note">例子：{item.example}</p> : null}
                  {item.warning ? <p className="rule-warning">提醒：{item.warning}</p> : null}
                </article>
              ))}
            </section>
          ) : null}

          {advancedPatterns.length > 0 ? (
            <section className="rule-pattern-grid">
              {advancedPatterns.map((pattern) => (
                <article className="rule-pattern-card" key={pattern.name}>
                  <h2>{pattern.name}</h2>
                  <p>
                    <strong>成型条件：</strong>
                    {pattern.requirement}
                  </p>
                  <p>
                    <strong>新手解读：</strong>
                    {pattern.detail}
                  </p>
                  {pattern.sample ? <p className="rule-note">示例：{pattern.sample}</p> : null}
                </article>
              ))}
            </section>
          ) : null}

          <section className="rule-detail-grid">
            {rule.sections.map((section, index) => (
              <article className="rule-detail-card" key={section.title}>
                <h2>
                  {index + 1}. {section.title}
                </h2>
                <ul>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </div>
      </details>
    </main>
  );
}
