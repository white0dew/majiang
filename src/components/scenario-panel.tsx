import type { CSSProperties } from "react";
import { TileChip } from "@/components/tile-chip";
import { getTrainingRuleStrategy } from "@/engine/mahjong/rule-strategies";
import { suitLabel } from "@/engine/mahjong/tiles";
import { OpponentState, Scenario } from "@/types/mahjong";

type ScenarioPanelProps = {
  scenario: Scenario;
  onPickDiscard?: (tileId: number) => void;
  pickedDiscard?: number | null;
  disableDiscard?: boolean;
  selfHint?: string;
};

const SEAT_META: Record<OpponentState["seat"], { label: string; seatCode: number }> = {
  left: { label: "左家", seatCode: 1 },
  across: { label: "上家", seatCode: 2 },
  right: { label: "右家", seatCode: 3 },
};

function estimateConcealedCount(opponent: OpponentState): number {
  return Math.max(7, 13 - opponent.melds.length * 2);
}

function scatterStyle(seat: OpponentState["seat"], index: number): CSSProperties {
  const code = SEAT_META[seat].seatCode;
  const seed = index * 31 + code * 47;

  const col = index % 6;
  const row = Math.floor(index / 6);

  const jitterX = ((seed % 9) - 4) * 2;
  const jitterY = (((seed / 9) % 9) - 4) * 1.8;
  const rotate = ((seed % 15) - 7) * 1.6;

  if (seat === "across") {
    return {
      left: `${col * 44 + 14 + jitterX}px`,
      top: `${row * 56 + 14 + jitterY}px`,
      transform: `rotate(${rotate}deg)`,
    };
  }

  if (seat === "left") {
    return {
      left: `${row * 48 + 18 + jitterX}px`,
      top: `${col * 38 + 14 + jitterY}px`,
      transform: `rotate(${rotate}deg)`,
    };
  }

  return {
    left: `${row * 48 + 18 + jitterX}px`,
    top: `${col * 38 + 14 + jitterY}px`,
    transform: `rotate(${rotate}deg)`,
  };
}

export function ScenarioPanel({
  scenario,
  onPickDiscard,
  pickedDiscard,
  disableDiscard,
  selfHint,
}: ScenarioPanelProps) {
  const ruleStrategy = getTrainingRuleStrategy(scenario.ruleId);

  function formatDingQue(value: OpponentState["dingQue"]): string {
    return value ? `定缺 ${suitLabel(value)}` : "无定缺";
  }

  return (
    <section className="mahjong-board">
      <div className="board-meta">
        <span>第 {scenario.round} 巡</span>
        <span>
          {ruleStrategy.usesDingQue && scenario.selfDingQue
            ? `你的定缺: ${suitLabel(scenario.selfDingQue)}`
            : "玩法: 无定缺"}
        </span>
      </div>

      <div className="table-stage-frame">
        <div className="table-stage-scale">
          <div className="table-stage">
            {scenario.opponents.map((opponent) => (
              <div className={`table-seat table-seat--${opponent.seat}`} key={`seat-${opponent.seat}`}>
                <div className={`seat-title ${opponent.seat !== "across" ? "seat-title--side" : ""}`}>
                  <strong>{SEAT_META[opponent.seat].label}</strong>
                  <span>{formatDingQue(opponent.dingQue)}</span>
                  <span>副露 {opponent.melds.length} 组</span>
                </div>

                <div className={`seat-main seat-main--${opponent.seat}`}>
                  <div className={`seat-concealed seat-concealed--${opponent.seat}`}>
                    {Array.from({ length: estimateConcealedCount(opponent) }).map((_, index) => (
                      <TileChip
                        compact
                        className={opponent.seat !== "across" ? "tile-chip--edge" : undefined}
                        faceDown
                        key={`${opponent.seat}-hidden-${index}`}
                        vertical={opponent.seat !== "across"}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {scenario.opponents.map((opponent) => (
              <div className={`discard-zone discard-zone--${opponent.seat}`} key={`river-${opponent.seat}`}>
                {opponent.discards.slice(-12).map((tile, index) => (
                  <div
                    className="discard-scatter"
                    key={`${opponent.seat}-${tile}-${index}`}
                    style={scatterStyle(opponent.seat, index)}
                  >
                    <TileChip compact tileId={tile} vertical={opponent.seat !== "across"} />
                  </div>
                ))}
              </div>
            ))}

            {scenario.opponents.map((opponent) => (
              <div className={`meld-zone meld-zone--${opponent.seat}`} key={`meld-zone-${opponent.seat}`}>
                {opponent.melds.length > 0 ? (
                  opponent.melds.map((meld, meldIndex) => (
                    <div className={`meld-zone-group meld-zone-group--${opponent.seat}`} key={`${opponent.seat}-open-${meldIndex}`}>
                      {meld.map((tile, tileIndex) => (
                        <TileChip
                          compact
                          key={`${opponent.seat}-open-${meldIndex}-${tileIndex}`}
                          tileId={tile}
                        />
                      ))}
                    </div>
                  ))
                ) : (
                  <span className="meld-zone-empty">无副露</span>
                )}
              </div>
            ))}

            <div className="table-center-badge">
              <span>{ruleStrategy.shortLabel}训练局</span>
            </div>

            <div className="table-seat table-seat--self">
              <div className="seat-title seat-title--self">
                <strong>下家（你）</strong>
                <span>{selfHint ?? "请选择本巡要打出的牌"}</span>
              </div>

              <div className="self-hand">
                {scenario.selfHand.map((tile, index) => (
                  <TileChip
                    key={`${tile}-${index}`}
                    tileId={tile}
                    onClick={
                      onPickDiscard && !disableDiscard
                        ? (tileId) => {
                            onPickDiscard(tileId);
                          }
                        : undefined
                    }
                    selected={pickedDiscard === tile}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
