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
  const r = [];
  for (const v of a) {
    if (b.includes(v)) {
      r.push(v);
    }
  }
  return r;
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

function *simpleMoves(game, id, state) {
  const cell = game.cell(id);
  if (!cell.cleared || cell.count === 0) {
    return;
  }
  const connectedIDs = game.grid.connectedIDs(id);
  const { flagged, unknownIDs } = aggregateInfo(game, connectedIDs);
  if (unknownIDs.length === 0) {
    return;
  }

  const doClear = (cell.count - flagged === 0);
  const doFlag = (cell.count - flagged === unknownIDs.length);
  if (doClear || doFlag) {
    for (const cid of unknownIDs) {
      if (doClear) {
        yield({ action: 'clear', id: cid });
      } else {
        yield({ action: 'flag', id: cid });
      }
      state.changed = true;
    }
  }
}

function *multiMoves(game, id, state) {
  const cell1 = game.cell(id);
  if (!cell1.cleared || cell1.count === 0) {
    return;
  }
  const connectedIDs1 = game.grid.connectedIDs(id);
  const agg1 = aggregateInfo(game, connectedIDs1);
  if (agg1.unknownIDs.length === 0) {
    return;
  }
  const remaining1 = cell1.count - agg1.flagged;
  for (const linkID of agg1.unknownIDs) {
    for (const id2 of game.grid.connectedIDs(linkID)) {
      if (id2 === id) {
        continue;
      }
      const cell2 = game.cell(id2);
      if (!cell2.cleared) {
        continue;
      }
      const connectedIDs2 = game.grid.connectedIDs(id2);
      const agg2 = aggregateInfo(game, connectedIDs2);
      const commonUnknown = intersect(agg1.unknownIDs, agg2.unknownIDs);
      const remaining2 = cell2.count - agg2.flagged;
      const nonOverlap1 = agg1.unknownIDs.length - commonUnknown.length;
      const nonOverlap2 = agg2.unknownIDs.length - commonUnknown.length;
      const maxOverlap = Math.min(remaining1, remaining2, commonUnknown.length);
      const minOverlap = Math.max(remaining1 - nonOverlap1, remaining2 - nonOverlap2, 0);
      if (remaining1 - minOverlap === 0 && nonOverlap1 > 0) {
        for (const cid of agg1.unknownIDs) {
          if (!commonUnknown.includes(cid)) {
            yield({ action: 'clear', id: cid });
            state.changed = true;
          }
        }
      } else if (remaining1 - maxOverlap === nonOverlap1 && nonOverlap1 > 0) {
        for (const cid of agg1.unknownIDs) {
          if (!commonUnknown.includes(cid)) {
            yield({ action: 'flag', id: cid });
            state.changed = true;
          }
        }
      }
      if (remaining2 - minOverlap === 0 && nonOverlap2 > 0) {
        for (const cid of agg2.unknownIDs) {
          if (!commonUnknown.includes(cid)) {
            yield({ action: 'clear', id: cid });
            state.changed = true;
          }
        }
      } else if (remaining2 - maxOverlap === nonOverlap2 && nonOverlap2 > 0) {
        for (const cid of agg2.unknownIDs) {
          if (!commonUnknown.includes(cid)) {
            yield({ action: 'flag', id: cid });
            state.changed = true;
          }
        }
      }
      if (state.changed) {
        return;
      }
    }
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
      for (const id of game.grid.idList) {
        yield *simpleMoves(game, id, state);
      }
      for (const id of game.grid.specialIdList) {
        yield *simpleMoves(game, id, state);
      }
      if (state.changed) {
        continue;
      }
      for (const id of game.grid.idList) {
        yield *multiMoves(game, id, state);
        if (state.changed) {
          break;
        }
      }
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
