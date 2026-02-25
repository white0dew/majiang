import {
  BAIBAN_TILE_ID,
  BEI_TILE_ID,
  DONG_TILE_ID,
  FA_TILE_ID,
  NAN_TILE_ID,
  NUMBER_TILE_IDS,
  RIICHI_TILE_IDS,
  TILE_KIND_COUNT,
  XI_TILE_ID,
  ZHONG_TILE_ID,
  countTiles,
  isNumberTile,
} from "@/engine/mahjong/tiles";

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

const GUANGDONG_HONGZHONG_RULE_TILE_IDS = [...NUMBER_TILE_IDS, ZHONG_TILE_ID] as const;
const WUHAN_HONGZHONG_FA_RULE_TILE_IDS = [...NUMBER_TILE_IDS, ZHONG_TILE_ID, FA_TILE_ID] as const;
const HAINAN_HAIKOU_RULE_TILE_IDS = [...RIICHI_TILE_IDS] as const;
const HAINAN_THIRTEEN_ORPHANS_IDS = [
  0,
  8,
  9,
  17,
  18,
  26,
  DONG_TILE_ID,
  NAN_TILE_ID,
  XI_TILE_ID,
  BEI_TILE_ID,
  ZHONG_TILE_ID,
  FA_TILE_ID,
  BAIBAN_TILE_ID,
] as const;

function isSameSuit(a: number, b: number): boolean {
  return Math.floor(a / 9) === Math.floor(b / 9);
}

function countsStateKey(counts: number[], laiziCount: number): string {
  return `${laiziCount}|${counts.join(",")}`;
}

function consumeMeldWithLaizi(counts: number[], laiziCount: number, memo: Map<string, boolean>): boolean {
  const stateKey = countsStateKey(counts, laiziCount);
  const cached = memo.get(stateKey);
  if (typeof cached === "boolean") {
    return cached;
  }

  let first = -1;
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] > 0) {
      first = id;
      break;
    }
  }

  if (first === -1) {
    const ok = laiziCount % 3 === 0;
    memo.set(stateKey, ok);
    return ok;
  }

  // 刻子：优先尝试多用实体牌，少消耗赖子。
  const tripletUse = [3, 2, 1] as const;
  for (const useCount of tripletUse) {
    if (counts[first] < useCount) {
      continue;
    }
    const needLaizi = 3 - useCount;
    if (needLaizi > laiziCount) {
      continue;
    }
    counts[first] -= useCount;
    if (consumeMeldWithLaizi(counts, laiziCount - needLaizi, memo)) {
      counts[first] += useCount;
      memo.set(stateKey, true);
      return true;
    }
    counts[first] += useCount;
  }

  if (isNumberTile(first)) {
    const tileRank = rank(first);
    const patterns: number[][] = [];

    if (tileRank <= 7) {
      patterns.push([first, first + 1, first + 2]);
    }
    if (tileRank >= 2 && tileRank <= 8 && isSameSuit(first - 1, first) && isSameSuit(first, first + 1)) {
      patterns.push([first - 1, first, first + 1]);
    }
    if (tileRank >= 3 && isSameSuit(first - 2, first) && isSameSuit(first - 1, first)) {
      patterns.push([first - 2, first - 1, first]);
    }

    for (const pattern of patterns) {
      if (!pattern.every((tileId) => tileId >= 0 && tileId < TILE_KIND_COUNT && isNumberTile(tileId))) {
        continue;
      }

      let usedSelf = false;
      let needLaizi = 0;
      const consumed: number[] = [];

      for (const tileId of pattern) {
        if (tileId === first && !usedSelf) {
          usedSelf = true;
          counts[tileId] -= 1;
          consumed.push(tileId);
          continue;
        }

        if (counts[tileId] > 0) {
          counts[tileId] -= 1;
          consumed.push(tileId);
        } else {
          needLaizi += 1;
        }
      }

      if (needLaizi <= laiziCount && consumeMeldWithLaizi(counts, laiziCount - needLaizi, memo)) {
        for (const tileId of consumed) {
          counts[tileId] += 1;
        }
        memo.set(stateKey, true);
        return true;
      }

      for (const tileId of consumed) {
        counts[tileId] += 1;
      }
    }
  }

  memo.set(stateKey, false);
  return false;
}

function canFormPairCountWithLaizi(counts: number[], laiziCount: number, targetPairs: number): boolean {
  let pairKinds = 0;
  let singleKinds = 0;

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    const amount = counts[id];
    pairKinds += Math.floor(amount / 2);
    if (amount % 2 === 1) {
      singleKinds += 1;
    }
  }

  if (singleKinds > laiziCount) {
    return false;
  }

  const completedPairs = pairKinds + singleKinds;
  const remainingLaizi = laiziCount - singleKinds;
  return completedPairs + Math.floor(remainingLaizi / 2) >= targetPairs;
}

function isSevenPairsWithLaizi(counts: number[], laiziCount: number): boolean {
  return canFormPairCountWithLaizi(counts, laiziCount, 7);
}

function isSevenPairsWithLaiziAndJiang258(counts: number[], laiziCount: number): boolean {
  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (!isJiangRank(id)) {
      continue;
    }
    if (counts[id] >= 2) {
      counts[id] -= 2;
      const ok = canFormPairCountWithLaizi(counts, laiziCount, 6);
      counts[id] += 2;
      if (ok) {
        return true;
      }
    }

    if (counts[id] >= 1 && laiziCount >= 1) {
      counts[id] -= 1;
      const ok = canFormPairCountWithLaizi(counts, laiziCount - 1, 6);
      counts[id] += 1;
      if (ok) {
        return true;
      }
    }
  }

  if (laiziCount >= 2) {
    return canFormPairCountWithLaizi(counts, laiziCount - 2, 6);
  }

  return false;
}

function consumeLaiziFromCounts(counts: number[], laiziTileIds: readonly number[]): number {
  let laiziCount = 0;
  for (const tileId of laiziTileIds) {
    laiziCount += counts[tileId] ?? 0;
    counts[tileId] = 0;
  }
  return laiziCount;
}

function canCompleteMeldsWithPairConstraint(
  counts: number[],
  laiziCount: number,
  options?: ShantenOptions,
): boolean {
  if (laiziCount >= 2) {
    if (consumeMeldWithLaizi(counts, laiziCount - 2, new Map())) {
      return true;
    }
  }

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (!canUseAsPair(id, options)) {
      continue;
    }

    if (counts[id] >= 2) {
      counts[id] -= 2;
      const ok = consumeMeldWithLaizi(counts, laiziCount, new Map());
      counts[id] += 2;
      if (ok) {
        return true;
      }
    } else if (counts[id] === 1 && laiziCount >= 1) {
      counts[id] -= 1;
      const ok = consumeMeldWithLaizi(counts, laiziCount - 1, new Map());
      counts[id] += 1;
      if (ok) {
        return true;
      }
    }
  }

  return false;
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

export function isWinningHandWithHongzhongLaizi(tiles: number[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }

  const counts = countTiles(tiles);
  const laiziCount = consumeLaiziFromCounts(counts, [ZHONG_TILE_ID]);

  if (tiles.length === 14 && isSevenPairsWithLaizi(counts, laiziCount)) {
    return true;
  }

  return canCompleteMeldsWithPairConstraint(counts, laiziCount);
}

export function isWinningHandWithWuhanLaiziJiang258(tiles: number[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }

  const counts = countTiles(tiles);
  const laiziCount = consumeLaiziFromCounts(counts, [ZHONG_TILE_ID, FA_TILE_ID]);

  if (tiles.length === 14 && isSevenPairsWithLaiziAndJiang258(counts, laiziCount)) {
    return true;
  }

  return canCompleteMeldsWithPairConstraint(counts, laiziCount, { restrictJiang258Pair: true });
}

function isAllPungsHand(counts: number[]): boolean {
  function allTriplets(working: number[]): boolean {
    let first = -1;
    for (let i = 0; i < TILE_KIND_COUNT; i += 1) {
      if (working[i] > 0) {
        first = i;
        break;
      }
    }

    if (first === -1) {
      return true;
    }

    if (working[first] < 3) {
      return false;
    }

    working[first] -= 3;
    const ok = allTriplets(working);
    working[first] += 3;
    return ok;
  }

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] < 2) {
      continue;
    }

    counts[id] -= 2;
    const ok = allTriplets(counts);
    counts[id] += 2;
    if (ok) {
      return true;
    }
  }

  return false;
}

function isThirteenOrphans(counts: number[]): boolean {
  let pairFound = false;
  let requiredCount = 0;

  for (const tileId of HAINAN_THIRTEEN_ORPHANS_IDS) {
    const amount = counts[tileId];
    if (amount <= 0) {
      return false;
    }
    requiredCount += amount;
    if (amount >= 2) {
      pairFound = true;
    }
  }

  if (!pairFound) {
    return false;
  }

  // 十三幺只能由 13 种幺九字牌组成，额外牌型不成立。
  return requiredCount === 14;
}

function thirteenOrphansShanten(counts: number[]): number {
  let uniqueRequired = 0;
  let hasPair = false;

  for (const tileId of HAINAN_THIRTEEN_ORPHANS_IDS) {
    const amount = counts[tileId];
    if (amount > 0) {
      uniqueRequired += 1;
    }
    if (amount >= 2) {
      hasPair = true;
    }
  }

  return 13 - uniqueRequired - (hasPair ? 1 : 0);
}

function hasHainanHaikouFan(counts: number[]): boolean {
  if (isSevenPairs(counts)) {
    return true;
  }

  if (isAllPungsHand(counts.slice())) {
    return true;
  }

  let has258Pair = false;
  const suitUsed = [false, false, false];

  for (let id = 0; id < TILE_KIND_COUNT; id += 1) {
    if (counts[id] <= 0) {
      continue;
    }

    if (counts[id] >= 2 && isJiangRank(id)) {
      has258Pair = true;
    }

    if (isNumberTile(id)) {
      suitUsed[Math.floor(id / 9)] = true;
    }
  }

  if (has258Pair) {
    return true;
  }

  const suitCount = suitUsed.filter(Boolean).length;
  return suitCount === 1;
}

export function isWinningHandWithHainanHaikou(tiles: number[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }

  const counts = countTiles(tiles);
  if (isThirteenOrphans(counts)) {
    return true;
  }

  if (!isWinningHand(tiles)) {
    return false;
  }

  // 海口大众口径：普通胡法需满足至少 1 番（此处用训练可计算番型近似）。
  return hasHainanHaikouFan(counts);
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

function estimateShantenFromCountsByRule(counts: number[], tileCount: number, options?: ShantenOptions): number {
  const normal = standardShanten(counts.slice(), options);
  const sevenPairs =
    tileCount >= 13
      ? options?.restrictJiang258Pair
        ? sevenPairsShantenWithJiang258(counts.slice())
        : sevenPairsShanten(counts.slice())
      : 8;
  return Math.max(-1, Math.min(normal, sevenPairs));
}

export function estimateShanten(tiles: number[]): number {
  const counts = countTiles(tiles);
  return estimateShantenFromCountsByRule(counts, tiles.length);
}

export function estimateShantenWithJiang258(tiles: number[]): number {
  const counts = countTiles(tiles);
  return estimateShantenFromCountsByRule(counts, tiles.length, { restrictJiang258Pair: true });
}

type LaiziShantenConfig = {
  laiziTileIds: readonly number[];
  fillIds: readonly number[];
  options?: ShantenOptions;
};

function estimateShantenWithLaiziByRule(tiles: number[], config: LaiziShantenConfig): number {
  const counts = countTiles(tiles);
  const laiziCount = consumeLaiziFromCounts(counts, config.laiziTileIds);

  if (laiziCount === 0) {
    return estimateShantenFromCountsByRule(counts, tiles.length, config.options);
  }

  const lowerBound = tiles.length % 3 === 2 ? -1 : 0;
  let best = 8;

  function dfs(start: number, remaining: number): void {
    if (best <= lowerBound) {
      return;
    }

    if (remaining === 0) {
      const shanten = estimateShantenFromCountsByRule(counts, tiles.length, config.options);
      if (shanten < best) {
        best = shanten;
      }
      return;
    }

    for (let i = start; i < config.fillIds.length; i += 1) {
      const tileId = config.fillIds[i];
      counts[tileId] += 1;
      dfs(i, remaining - 1);
      counts[tileId] -= 1;

      if (best <= lowerBound) {
        return;
      }
    }
  }

  dfs(0, laiziCount);
  return best;
}

export function estimateShantenWithHongzhongLaizi(tiles: number[]): number {
  return estimateShantenWithLaiziByRule(tiles, {
    laiziTileIds: [ZHONG_TILE_ID],
    fillIds: GUANGDONG_HONGZHONG_RULE_TILE_IDS,
  });
}

export function estimateShantenWithWuhanLaiziJiang258(tiles: number[]): number {
  return estimateShantenWithLaiziByRule(tiles, {
    laiziTileIds: [ZHONG_TILE_ID, FA_TILE_ID],
    fillIds: WUHAN_HONGZHONG_FA_RULE_TILE_IDS,
    options: { restrictJiang258Pair: true },
  });
}

function hasHainanReadyWait(tiles: number[]): boolean {
  for (const tileId of HAINAN_HAIKOU_RULE_TILE_IDS) {
    if (isWinningHandWithHainanHaikou(tiles.concat(tileId))) {
      return true;
    }
  }
  return false;
}

export function estimateShantenWithHainanHaikou(tiles: number[]): number {
  const counts = countTiles(tiles);
  const normal = estimateShantenFromCountsByRule(counts, tiles.length);
  const thirteenOrphans = thirteenOrphansShanten(counts);
  let best = Math.max(-1, Math.min(normal, thirteenOrphans));

  if (tiles.length % 3 === 1 && best === 0 && !hasHainanReadyWait(tiles)) {
    best = 1;
  }
  if (tiles.length % 3 === 2 && best === -1 && !isWinningHandWithHainanHaikou(tiles)) {
    best = 0;
  }

  return best;
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

export function getWinningTileCandidatesWithHongzhongLaizi(
  hand: number[],
  remainingCounts?: number[],
  candidateTileIds: readonly number[] = GUANGDONG_HONGZHONG_RULE_TILE_IDS,
): number[] {
  const result: number[] = [];
  for (const id of candidateTileIds) {
    if (remainingCounts && remainingCounts[id] <= 0) {
      continue;
    }
    if (isWinningHandWithHongzhongLaizi(hand.concat(id))) {
      result.push(id);
    }
  }
  return result;
}

export function getWinningTileCandidatesWithWuhanLaiziJiang258(
  hand: number[],
  remainingCounts?: number[],
  candidateTileIds: readonly number[] = WUHAN_HONGZHONG_FA_RULE_TILE_IDS,
): number[] {
  const result: number[] = [];
  for (const id of candidateTileIds) {
    if (remainingCounts && remainingCounts[id] <= 0) {
      continue;
    }
    if (isWinningHandWithWuhanLaiziJiang258(hand.concat(id))) {
      result.push(id);
    }
  }
  return result;
}

export function getWinningTileCandidatesWithHainanHaikou(
  hand: number[],
  remainingCounts?: number[],
  candidateTileIds: readonly number[] = HAINAN_HAIKOU_RULE_TILE_IDS,
): number[] {
  const result: number[] = [];
  for (const id of candidateTileIds) {
    if (remainingCounts && remainingCounts[id] <= 0) {
      continue;
    }
    if (isWinningHandWithHainanHaikou(hand.concat(id))) {
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

export function getEffectiveTileInfoWithHongzhongLaizi(
  hand: number[],
  remainingCounts?: number[],
): { typeCount: number; copyCount: number; improvingTiles: number[] } {
  return getEffectiveTileInfoByEstimator(hand, estimateShantenWithHongzhongLaizi, remainingCounts);
}

export function getEffectiveTileInfoWithWuhanLaiziJiang258(
  hand: number[],
  remainingCounts?: number[],
): { typeCount: number; copyCount: number; improvingTiles: number[] } {
  return getEffectiveTileInfoByEstimator(hand, estimateShantenWithWuhanLaiziJiang258, remainingCounts);
}

export function getEffectiveTileInfoWithHainanHaikou(
  hand: number[],
  remainingCounts?: number[],
): { typeCount: number; copyCount: number; improvingTiles: number[] } {
  return getEffectiveTileInfoByEstimator(hand, estimateShantenWithHainanHaikou, remainingCounts);
}
