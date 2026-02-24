import { TILE_KIND_COUNT, countTiles, isNumberTile } from "@/engine/mahjong/tiles";

function suitIndex(tileId: number): number {
  return Math.floor(tileId / 9);
}

function rank(tileId: number): number {
  return (tileId % 9) + 1;
}

function isJiangRank(tileId: number): boolean {
  if (!isNumberTile(tileId)) {
    return false;
  }
  const tileRank = rank(tileId);
  return tileRank === 2 || tileRank === 5 || tileRank === 8;
}

type ShantenOptions = {
  restrictJiang258Pair?: boolean;
};

function canUseAsPair(tileId: number, options?: ShantenOptions): boolean {
  if (!options?.restrictJiang258Pair) {
    return true;
  }
  return isJiangRank(tileId);
}

function canSequence(counts: number[], tileId: number): boolean {
  if (!isNumberTile(tileId) || !isNumberTile(tileId + 2)) {
    return false;
  }
  const r = rank(tileId);
  if (r > 7) {
    return false;
  }
  return (
    suitIndex(tileId) === suitIndex(tileId + 1) &&
    suitIndex(tileId) === suitIndex(tileId + 2) &&
    counts[tileId + 1] > 0 &&
    counts[tileId + 2] > 0
  );
}

function canAdjacent(counts: number[], tileId: number): boolean {
  if (!isNumberTile(tileId) || !isNumberTile(tileId + 1)) {
    return false;
  }
  const r = rank(tileId);
  if (r > 8) {
    return false;
  }
  return suitIndex(tileId) === suitIndex(tileId + 1) && counts[tileId + 1] > 0;
}

function canGap(counts: number[], tileId: number): boolean {
  if (!isNumberTile(tileId) || !isNumberTile(tileId + 2)) {
    return false;
  }
  const r = rank(tileId);
  if (r > 7) {
    return false;
  }
  return suitIndex(tileId) === suitIndex(tileId + 2) && counts[tileId + 2] > 0;
}

function allMelds(counts: number[]): boolean {
  let first = -1;
  for (let i = 0; i < TILE_KIND_COUNT; i += 1) {
    if (counts[i] > 0) {
      first = i;
      break;
    }
  }

  if (first === -1) {
    return true;
  }

  if (counts[first] >= 3) {
    counts[first] -= 3;
    if (allMelds(counts)) {
      counts[first] += 3;
      return true;
    }
    counts[first] += 3;
  }

  if (canSequence(counts, first)) {
    counts[first] -= 1;
    counts[first + 1] -= 1;
    counts[first + 2] -= 1;
    if (allMelds(counts)) {
      counts[first] += 1;
      counts[first + 1] += 1;
      counts[first + 2] += 1;
      return true;
    }
    counts[first] += 1;
    counts[first + 1] += 1;
    counts[first + 2] += 1;
  }

  return false;
}

function isSevenPairs(counts: number[]): boolean {
  let pairs = 0;
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    pairs += Math.floor(counts[id] / 2);
  }
  return pairs === 7;
}

export function isWinningHand(tiles: number[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }

  const counts = countTiles(tiles);

  if (tiles.length === 14 && isSevenPairs(counts)) {
    return true;
  }

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] >= 2) {
      counts[id] -= 2;
      const ok = allMelds(counts);
      counts[id] += 2;
      if (ok) {
        return true;
      }
    }
  }

  return false;
}

export function isWinningHandWithJiang258(tiles: number[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }

  const counts = countTiles(tiles);

  if (tiles.length === 14 && isSevenPairs(counts)) {
    for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
      if (counts[id] >= 2 && isJiangRank(id)) {
        return true;
      }
    }
    return false;
  }

  // 长沙 258 将：将牌只能用 2/5/8 组成。
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] >= 2 && isJiangRank(id)) {
      counts[id] -= 2;
      const ok = allMelds(counts);
      counts[id] += 2;
      if (ok) {
        return true;
      }
    }
  }

  return false;
}

function standardShanten(counts: number[], options?: ShantenOptions): number {
  let best = 8;

  function dfs(start: number, melds: number, pairs: number, taatsu: number): void {
    let idx = start;
    while (idx < TILE_KIND_COUNT && counts[idx] === 0) {
      idx += 1;
    }

    if (idx >= TILE_KIND_COUNT) {
      const cappedTaatsu = Math.min(taatsu, 4 - melds);
      const candidate = 8 - melds * 2 - cappedTaatsu - pairs;
      if (candidate < best) {
        best = candidate;
      }
      return;
    }

    if (counts[idx] >= 3) {
      counts[idx] -= 3;
      dfs(idx, melds + 1, pairs, taatsu);
      counts[idx] += 3;
    }

    if (canSequence(counts, idx)) {
      counts[idx] -= 1;
      counts[idx + 1] -= 1;
      counts[idx + 2] -= 1;
      dfs(idx, melds + 1, pairs, taatsu);
      counts[idx] += 1;
      counts[idx + 1] += 1;
      counts[idx + 2] += 1;
    }

    if (counts[idx] >= 2) {
      if (pairs < 1 && canUseAsPair(idx, options)) {
        counts[idx] -= 2;
        dfs(idx, melds, pairs + 1, taatsu);
        counts[idx] += 2;
      }

      counts[idx] -= 2;
      dfs(idx, melds, pairs, taatsu + 1);
      counts[idx] += 2;
    }

    if (canAdjacent(counts, idx)) {
      counts[idx] -= 1;
      counts[idx + 1] -= 1;
      dfs(idx, melds, pairs, taatsu + 1);
      counts[idx] += 1;
      counts[idx + 1] += 1;
    }

    if (canGap(counts, idx)) {
      counts[idx] -= 1;
      counts[idx + 2] -= 1;
      dfs(idx, melds, pairs, taatsu + 1);
      counts[idx] += 1;
      counts[idx + 2] += 1;
    }

    counts[idx] -= 1;
    dfs(idx, melds, pairs, taatsu);
    counts[idx] += 1;
  }

  dfs(0, 0, 0, 0);
  return best;
}

function sevenPairsShanten(counts: number[]): number {
  let pairKinds = 0;
  let uniqueKinds = 0;

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] > 0) {
      uniqueKinds += 1;
    }
    if (counts[id] >= 2) {
      pairKinds += 1;
    }
  }

  return 6 - pairKinds + Math.max(0, 7 - uniqueKinds);
}

function sevenPairsShantenWithJiang258(counts: number[]): number {
  let hasJiangPair = false;
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] >= 2 && isJiangRank(id)) {
      hasJiangPair = true;
      break;
    }
  }

  const base = sevenPairsShanten(counts);
  return hasJiangPair ? base : base + 1;
}

export function estimateShanten(tiles: number[]): number {
  const counts = countTiles(tiles);
  const normal = standardShanten(counts.slice());
  const sevenPairs = tiles.length >= 13 ? sevenPairsShanten(counts.slice()) : 8;
  return Math.max(-1, Math.min(normal, sevenPairs));
}

export function estimateShantenWithJiang258(tiles: number[]): number {
  const counts = countTiles(tiles);
  const normal = standardShanten(counts.slice(), { restrictJiang258Pair: true });
  const sevenPairs = tiles.length >= 13 ? sevenPairsShantenWithJiang258(counts.slice()) : 8;
  return Math.max(-1, Math.min(normal, sevenPairs));
}

export function getWinningTileCandidates(
  hand: number[],
  remainingCounts?: number[],
): number[] {
  const result: number[] = [];
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (remainingCounts && remainingCounts[id] <= 0) {
      continue;
    }
    if (isWinningHand(hand.concat(id))) {
      result.push(id);
    }
  }
  return result;
}

function getEffectiveTileInfoByEstimator(
  hand: number[],
  estimateFn: (tiles: number[]) => number,
  remainingCounts?: number[],
): { typeCount: number; copyCount: number; improvingTiles: number[] } {
  const base = estimateFn(hand);
  const improvingTiles: number[] = [];
  let copyCount = 0;

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    const available = remainingCounts ? remainingCounts[id] : 4;
    if (available <= 0) {
      continue;
    }

    const shanten = estimateFn(hand.concat(id));
    if (shanten < base) {
      improvingTiles.push(id);
      copyCount += available;
    }
  }

  return {
    typeCount: improvingTiles.length,
    copyCount,
    improvingTiles,
  };
}

export function getEffectiveTileInfo(
  hand: number[],
  remainingCounts?: number[],
): { typeCount: number; copyCount: number; improvingTiles: number[] } {
  return getEffectiveTileInfoByEstimator(hand, estimateShanten, remainingCounts);
}

export function getEffectiveTileInfoWithJiang258(
  hand: number[],
  remainingCounts?: number[],
): { typeCount: number; copyCount: number; improvingTiles: number[] } {
  return getEffectiveTileInfoByEstimator(hand, estimateShantenWithJiang258, remainingCounts);
}
