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
    </main>
  );
}
