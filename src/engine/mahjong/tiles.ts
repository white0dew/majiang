import { Suit } from "@/types/mahjong";

const SUITS: Suit[] = ["wan", "tiao", "tong"];
const CHINESE_NUMBERS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export const TILE_KIND_COUNT = 27;
export const TILE_IMAGE_BASE = "/tiles";
export const TILE_FRONT_PLACEHOLDER = `${TILE_IMAGE_BASE}/front-placeholder.svg`;
export const TILE_BACK_PLACEHOLDER = `${TILE_IMAGE_BASE}/back-placeholder.svg`;
export const TILE_BACK_IMAGE = `${TILE_IMAGE_BASE}/back.png`;

export function tileIdToSuit(tileId: number): Suit {
  return SUITS[Math.floor(tileId / 9)] ?? "wan";
}

export function tileIdToRank(tileId: number): number {
  return (tileId % 9) + 1;
}

export function tileIdToLabel(tileId: number): string {
  const suit = tileIdToSuit(tileId);
  const rank = tileIdToRank(tileId);
  const suitLabel = suit === "wan" ? "万" : suit === "tiao" ? "条" : "筒";
  return `${CHINESE_NUMBERS[rank - 1]}${suitLabel}`;
}

export function tileIdToShortLabel(tileId: number): string {
  const suit = tileIdToSuit(tileId);
  const rank = tileIdToRank(tileId);
  const suitLabel = suit === "wan" ? "W" : suit === "tiao" ? "T" : "B";
  return `${rank}${suitLabel}`;
}

export function tileIdToAssetName(tileId: number): string {
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

export function countTiles(hand: number[]): number[] {
  const counts = Array.from({ length: TILE_KIND_COUNT }, () => 0);
  for (const tile of hand) {
    counts[tile] += 1;
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
