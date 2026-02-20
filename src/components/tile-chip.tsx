"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TILE_BACK_IMAGE,
  TILE_BACK_PLACEHOLDER,
  TILE_FRONT_PLACEHOLDER,
  tileIdToImagePath,
  tileIdToLabel,
} from "@/engine/mahjong/tiles";

type TileChipProps = {
  tileId?: number;
  selected?: boolean;
  onClick?: (tileId: number) => void;
  compact?: boolean;
  muted?: boolean;
  faceDown?: boolean;
  vertical?: boolean;
  className?: string;
};

export function TileChip({
  tileId,
  selected,
  onClick,
  compact,
  muted,
  faceDown,
  vertical,
  className,
}: TileChipProps) {
  const resolvedTileId = typeof tileId === "number" ? tileId : 0;
  const label = tileIdToLabel(resolvedTileId);

  const initialSrc = useMemo(() => {
    if (faceDown) {
      return TILE_BACK_IMAGE;
    }
    if (typeof tileId === "number") {
      return tileIdToImagePath(tileId);
    }
    return TILE_FRONT_PLACEHOLDER;
  }, [faceDown, tileId]);

  const [imgSrc, setImgSrc] = useState(initialSrc);

  useEffect(() => {
    setImgSrc(initialSrc);
  }, [initialSrc]);

  const baseClass = `tile-chip ${compact ? "tile-chip--compact" : ""} ${
    selected ? "tile-chip--selected" : ""
  } ${muted ? "tile-chip--muted" : ""} ${vertical ? "tile-chip--vertical" : ""} ${
    faceDown ? "tile-chip--back" : ""
  } ${className ?? ""}`;

  const fallback = faceDown ? TILE_BACK_PLACEHOLDER : TILE_FRONT_PLACEHOLDER;

  function handleBrokenImage(): void {
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
  }

  if (onClick) {
    return (
      <button
        className={baseClass}
        onClick={() => {
          if (typeof tileId === "number") {
            onClick(tileId);
          }
        }}
        type="button"
      >
        {/* Dynamic tile assets come from user-provided files in /public/tiles. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={faceDown ? "牌背" : label} className="tile-chip__img" onError={handleBrokenImage} src={imgSrc} />
      </button>
    );
  }

  return (
    <div className={baseClass}>
      {/* Dynamic tile assets come from user-provided files in /public/tiles. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={faceDown ? "牌背" : label} className="tile-chip__img" onError={handleBrokenImage} src={imgSrc} />
    </div>
  );
}
