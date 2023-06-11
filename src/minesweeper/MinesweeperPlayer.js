function aggregateInfo(game, ids) {
  let flagged = 0;
  const unknownIDs = [];
  for (const id of ids) {
    const ccell = game.cell(id);
    if (ccell.flagged) {
      ++flagged;
    } else if (!ccell.cleared) {
      unknownIDs.push(id);
    }
  }
  return { flagged, unknownIDs };
}

function intersect(a, b) {
  return a.filter((v) => b.includes(v));
}

function exclude(a, b) {
  return a.filter((v) => !b.includes(v));
}

function createConnectedRegion(game, id) {
  const cell = game.cell(id);
  if (!cell.cleared || cell.count === 0) {
    return null;
  }
  const agg = aggregateInfo(game, game.grid.connectedIDs(id));
  if (!agg.unknownIDs.length) {
    return null;
  }
  const remaining = cell.count - agg.flagged;
  return { sources: [id], cellIDs: agg.unknownIDs, min: remaining, max: remaining };
}

function isSubregionUseful(subRegion, region) {
  const cellCount = region.cellIDs.length;
  const subCellCount = subRegion.cellIDs.length;
  return (
    subRegion.min > Math.max(0, region.min - (cellCount - subCellCount)) ||
    subRegion.max < Math.min(subCellCount, region.max)
  );
}

function combineRegions(a, b) {
  if (a === b || a.sources.some((s) => b.sources.includes(s))) {
    return [];
  }
  const common = intersect(a.cellIDs, b.cellIDs);
  if (!common.length) {
    return [];
  }

  const commonMax = Math.min(common.length, a.max, b.max);
  const commonMin = Math.max(0, a.min - (a.cellIDs.length - common.length), b.min - (b.cellIDs.length - common.length));

  const r = [];
  const sources = [...a.sources, ...b.sources];

  if (common.length < a.cellIDs.length) {
    const anotb = exclude(a.cellIDs, common);
    const anotbRegion = {
      sources,
      cellIDs: anotb,
      min: Math.max(0, a.min - commonMax),
      max: Math.min(anotb.length, a.max - commonMin),
    };
    if (isSubregionUseful(anotbRegion, a)) {
      r.push(anotbRegion);
    }
  }

  if (common.length < b.cellIDs.length) {
    const bnota = exclude(b.cellIDs, common);
    const bnotaRegion = {
      sources,
      cellIDs: bnota,
      min: Math.max(0, b.min - commonMax),
      max: Math.min(bnota.length, b.max - commonMin),
    };
    if (isSubregionUseful(bnotaRegion, b)) {
      r.push(bnotaRegion);
    }
  }

  return r;
}

function *applyRegion(game, region, state) {
  if (region.max === 0) {
    for (const id of region.cellIDs) {
      if (!game.cell(id).cleared) {
        yield({ action: 'clear', id });
      }
    }
    state.changed = true;
  } else if (region.min === region.cellIDs.length) {
    for (const id of region.cellIDs) {
      if (!game.cell(id).flagged) {
        yield({ action: 'flag', id });
      }
    }
    state.changed = true;
  }
}

function isEqualSorted(a, b) {
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function deduplicateRegions(regions) {
  regions.sort((a, b) => (a.max - b.max) || (a.min - b.min) || (a.cellIDs.length - b.cellIDs.length));
  let prev = regions[0];
  const r = [prev];
  for (let i = 1; i < regions.length; ++i) {
    const cur = regions[i];
    if (cur.max === prev.max && cur.min === prev.min && cur.cellIDs.length === prev.cellIDs.length) {
      prev.cellIDs.sort((a, b) => (a - b));
      cur.cellIDs.sort((a, b) => (a - b));
      if (isEqualSorted(cur.cellIDs, prev.cellIDs)) {
        for (const source of cur.sources) {
          if (!prev.sources.includes(source)) {
            prev.sources.push(source);
          }
        }
        continue;
      }
    }
    r.push(cur);
    prev = cur;
  }
  return regions;
}

function combineP(a, b) {
  if (a >= 1 || b >= 1) {
    return 1;
  }
  if (a <= 0 || b <= 0) {
    return 0;
  }
  const min = Math.min(a, b);
  return min / (1 + min * 2 - a - b);
}

function *findNextMoves(game, state) {
  const regions = game.grid.idList
    .map((id) => createConnectedRegion(game, id))
    .filter((r) => r);

  let curRegions = regions;
  let depth = 0;
  const limit = Math.floor(1000 / regions.length);
  while (curRegions.length) {
    for (const region of curRegions) {
      yield *applyRegion(game, region, state);
    }
    if (state.changed) {
      return;
    }
    if (curRegions.length > limit) {
      curRegions.sort((a, b) => (a.cellIDs.length - b.cellIDs.length));
      // large and small numbers of remaining cell IDs seem to be most useful, so take from start and end of list:
      curRegions = [
        ...curRegions.slice(0, limit >>> 1),
        ...curRegions.slice(curRegions.length - (limit >>> 1)),
      ];
    }
    curRegions = curRegions
      .flatMap((unionedRegion) => regions.flatMap((region) => combineRegions(unionedRegion, region)));
    curRegions = deduplicateRegions(curRegions);
    yield({ action: 'think', difficulty: depth });
  }
}

function *pickRandom(game) {
  const aggregates = new Map();
  const getInfo = (id) => {
    let v = aggregates.get(id);
    if (!v) {
      const cell = game.cell(id);
      if (cell.cleared) {
        v = { cleared: true, count: cell.count, ...aggregateInfo(game, game.grid.connectedIDs(id)) };
      } else {
        v = { cleared: false };
      }
      aggregates.set(id, v);
    }
    return v;
  };
  const probabilities = new Map();
  for (const id of game.grid.idList) {
    const cell = game.cell(id);
    if (cell.cleared || cell.flagged) {
      continue;
    }
    const probability = game.grid.connectedIDs(id)
      .map(getInfo)
      .filter((i) => i.cleared)
      .map((i) => (i.count - i.flagged) / i.unknownIDs.length)
      .reduce(combineP);
    probabilities.set(id, probability);
  }

  let bestIDs = [];
  let bestP = 1;
  for (const [id, p] of probabilities.entries()) {
    if (p <= bestP) {
      if (p < bestP) {
        bestIDs.length = 0;
        bestP = p;
      }
      bestIDs.push(id);
    }
  }
  if (!bestIDs.length) {
    throw new Error('no available cells');
  }
  const bestID = bestIDs[Math.floor(Math.random() * bestIDs.length)];
  yield({ action: 'clear', id: bestID });
}

class MinesweeperPlayer {
  constructor({ stopWhenUnsure = false } = {}) {
    this.stopWhenUnsure = stopWhenUnsure;
  }

  *play(game) {
    while (!game.success && !game.failure) {
      const state = { changed: false };
      yield *findNextMoves(game, state);
      if (state.changed) {
        continue;
      }
      if (game.cleared >= game.freePasses && this.stopWhenUnsure) {
        return;
      }
      yield *pickRandom(game);
    }
  }
}
