import { Suit } from "@/types/mahjong";

const SUITS: Suit[] = ["wan", "tiao", "tong"];
const CHINESE_NUMBERS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const HONOR_TILE_META = [
  { label: "东", shortLabel: "E", asset: "dong" },
  { label: "南", shortLabel: "S", asset: "nan" },
  { label: "西", shortLabel: "W", asset: "xi" },
  { label: "北", shortLabel: "N", asset: "bei" },
  { label: "中", shortLabel: "C", asset: "zhong" },
  { label: "发", shortLabel: "F", asset: "fa" },
  { label: "白", shortLabel: "P", asset: "baiban" },
] as const;

export const NUMBER_TILE_KIND_COUNT = 27;
export const HONOR_TILE_KIND_COUNT = 7;
export const TILE_KIND_COUNT = NUMBER_TILE_KIND_COUNT + HONOR_TILE_KIND_COUNT;
export const DONG_TILE_ID = NUMBER_TILE_KIND_COUNT;
export const NAN_TILE_ID = NUMBER_TILE_KIND_COUNT + 1;
export const XI_TILE_ID = NUMBER_TILE_KIND_COUNT + 2;
export const BEI_TILE_ID = NUMBER_TILE_KIND_COUNT + 3;
export const ZHONG_TILE_ID = NUMBER_TILE_KIND_COUNT + 4;
export const FA_TILE_ID = NUMBER_TILE_KIND_COUNT + 5;
export const BAIBAN_TILE_ID = NUMBER_TILE_KIND_COUNT + 6;
export const NUMBER_TILE_IDS = Array.from({ length: NUMBER_TILE_KIND_COUNT }, (_, tileId) => tileId);
export const RIICHI_TILE_IDS = Array.from({ length: TILE_KIND_COUNT }, (_, tileId) => tileId);
export const TILE_IMAGE_BASE = "/tiles";
export const TILE_FRONT_PLACEHOLDER = `${TILE_IMAGE_BASE}/front-placeholder.svg`;
export const TILE_BACK_PLACEHOLDER = `${TILE_IMAGE_BASE}/back-placeholder.svg`;
export const TILE_BACK_IMAGE = `${TILE_IMAGE_BASE}/back.png`;

function honorIndex(tileId: number): number {
  return tileId - NUMBER_TILE_KIND_COUNT;
}

export function isNumberTile(tileId: number): boolean {
  return tileId >= 0 && tileId < NUMBER_TILE_KIND_COUNT;
}

export function isHonorTile(tileId: number): boolean {
  return tileId >= NUMBER_TILE_KIND_COUNT && tileId < TILE_KIND_COUNT;
}

export function tileIdToSuit(tileId: number): Suit | null {
  if (!isNumberTile(tileId)) {
    return null;
  }
  return SUITS[Math.floor(tileId / 9)] ?? null;
}

export function tileIdToRank(tileId: number): number {
  if (!isNumberTile(tileId)) {
    return 0;
  }
  return (tileId % 9) + 1;
}

export function tileIdToLabel(tileId: number): string {
  if (isHonorTile(tileId)) {
    return HONOR_TILE_META[honorIndex(tileId)]?.label ?? "未知牌";
  }

  const suit = tileIdToSuit(tileId);
  const rank = tileIdToRank(tileId);
  const suitLabel = suit === "wan" ? "万" : suit === "tiao" ? "条" : "筒";
  return `${CHINESE_NUMBERS[rank - 1]}${suitLabel}`;
}

export function tileIdToShortLabel(tileId: number): string {
  if (isHonorTile(tileId)) {
    return HONOR_TILE_META[honorIndex(tileId)]?.shortLabel ?? "?";
  }

  const suit = tileIdToSuit(tileId);
  const rank = tileIdToRank(tileId);
  const suitLabel = suit === "wan" ? "W" : suit === "tiao" ? "T" : "B";
  return `${rank}${suitLabel}`;
}

export function tileIdToAssetName(tileId: number): string {
  if (isHonorTile(tileId)) {
    return HONOR_TILE_META[honorIndex(tileId)]?.asset ?? "front-placeholder";
  }
  return `${tileIdToSuit(tileId)}-${tileIdToRank(tileId)}`;
}

export function tileIdToImagePath(tileId: number): string {
  return `${TILE_IMAGE_BASE}/${tileIdToAssetName(tileId)}.png`;
}

export function suitLabel(suit: Suit): string {
  if (suit === "wan") {
    return "万";
  }
  if (suit === "tiao") {
    return "条";
  }
  return "筒";
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function cloneCounts(counts: number[]): number[] {
  return counts.slice();
}

export function createFullCounts(): number[] {
  return Array.from({ length: TILE_KIND_COUNT }, () => 4);
}

export function createCountsByTileIds(tileIds: readonly number[]): number[] {
  const counts = Array.from({ length: TILE_KIND_COUNT }, () => 0);
  for (const tileId of tileIds) {
    if (tileId >= 0 && tileId < TILE_KIND_COUNT) {
      counts[tileId] = 4;
    }
  }
  return counts;
}

export function countTiles(hand: number[]): number[] {
  const counts = Array.from({ length: TILE_KIND_COUNT }, () => 0);
  for (const tile of hand) {
    if (tile >= 0 && tile < TILE_KIND_COUNT) {
      counts[tile] += 1;
    }
  }
  return counts;
}

export function removeTileOnce(hand: number[], tileId: number): number[] {
  const index = hand.indexOf(tileId);
  if (index === -1) {
    return hand.slice();
  }
  const next = hand.slice();
  next.splice(index, 1);
  return next;
}

export function uniqueTileIds(tiles: number[]): number[] {
  return Array.from(new Set(tiles));
}

export function sortTiles(tiles: number[]): number[] {
  return tiles.slice().sort((a, b) => a - b);
}

export function pickRandomTileId(
  counts: number[],
  predicate?: (tileId: number) => boolean,
): number {
  const candidates: number[] = [];
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] > 0 && (!predicate || predicate(id))) {
      candidates.push(id);
    }
  }

  if (candidates.length === 0) {
    return -1;
  }

  const picked = candidates[randomInt(0, candidates.length - 1)];
  counts[picked] -= 1;
  return picked;
}

export function drawTiles(
  counts: number[],
  amount: number,
  predicate?: (tileId: number) => boolean,
): number[] {
  const hand: number[] = [];
  for (let i = 0; i < amount; i += 1) {
    const tile = pickRandomTileId(counts, predicate);
    if (tile === -1) {
      break;
    }
    hand.push(tile);
  }
  return sortTiles(hand);
}
