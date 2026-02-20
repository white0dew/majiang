import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainingModeClient } from "@/features/training/training-mode-client";
import { TRAINING_MODES, TrainingMode } from "@/types/mahjong";

const modes = TRAINING_MODES;

export default async function TrainingModePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  if (!modes.includes(mode as TrainingMode)) {
    notFound();
  }

  return (
    <main className="page-wrap">
      <div className="inline-links">
        <Link href="/training">返回训练大厅</Link>
        <Link href="/progress">查看训练记录</Link>
      </div>
      <TrainingModeClient mode={mode as TrainingMode} />
    </main>
  );
}
