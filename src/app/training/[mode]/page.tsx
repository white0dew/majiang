import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrainingRuleStrategy, resolveTrainingRuleId } from "@/engine/mahjong/rule-strategies";
import { TrainingModeClient } from "@/features/training/training-mode-client";
import { TRAINING_MODES, TrainingMode } from "@/types/mahjong";

const modes = TRAINING_MODES;

export default async function TrainingModePage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ rule?: string }>;
}) {
  const { mode } = await params;
  const { rule: rawRuleId } = await searchParams;

  if (!modes.includes(mode as TrainingMode)) {
    notFound();
  }

  const ruleId = resolveTrainingRuleId(rawRuleId);
  const rule = getTrainingRuleStrategy(ruleId);

  return (
    <main className="page-wrap">
      <div className="inline-links">
        <Link href={`/training?rule=${ruleId}`}>返回训练大厅</Link>
        <Link href="/progress">查看训练记录</Link>
        <Link href={`/rules/${ruleId}`}>查看玩法规则</Link>
      </div>
      <p className="rule-tag">当前玩法：{rule.title}</p>
      <TrainingModeClient mode={mode as TrainingMode} ruleId={ruleId} />

      <section className="contact-card" aria-label="训练模式赞赏支持">
        <div className="contact-main">
          <p className="hero-kicker">支持项目</p>
          <h2>打赏支持</h2>
          <p>如果这个训练模式对你有帮助，欢迎请作者喝杯咖啡，支持持续更新。</p>
          <div className="contact-actions">
            <details className="wechat-popover">
              <summary className="btn-ghost wechat-trigger">打赏支持（微信支付）</summary>
              <figure className="wechat-panel">
                <Image
                  className="wechat-qr"
                  src="/whitepay.jpg"
                  alt="微信支付赞赏码，支持青玉白露"
                  width={220}
                  height={293}
                />
                <figcaption className="wechat-id">感谢支持项目维护与持续更新</figcaption>
              </figure>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
