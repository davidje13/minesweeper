class MinesweeperPlayer {
  constructor() {}

  *play(game) {
    while (!game.success && !game.failure) {
      const probabilities = new Map();
      const baseProbability = (game.bombs - game.flagged) / (game.grid.count - game.cleared);
      for (const id of game.grid.idList()) {
        const cell = game.cell(id);
        if (cell.flagged) {
          probabilities.set(id, Number.POSITIVE_INFINITY);
        } else if (cell.cleared) {
          probabilities.set(id, Number.NEGATIVE_INFINITY);
        } else {
          probabilities.set(id, baseProbability);
        }
      }
      let acted = false;
      for (const id of game.grid.idList()) {
        const cell = game.cell(id);
        if (cell.flagged || !cell.cleared || cell.count === 0) {
          continue;
        }
        const connected = game.grid.connectedIDs(id).map((cid) => ({ id: cid, cell: game.cell(cid) }));
        let nearbyFlagged = 0;
        let nearbyCleared = 0;
        for (const c of connected) {
          if (c.cell.cleared) {
            ++nearbyCleared;
          } else if (c.cell.flagged) {
            ++nearbyFlagged;
          }
        }
        if (nearbyCleared + nearbyFlagged === connected.length) {
          continue;
        }
        const connectedProbability = (cell.count - nearbyFlagged) / (connected.length - nearbyFlagged - nearbyCleared);
        for (const c of connected) {
          if (!c.cell.cleared && !c.cell.flagged) {
            if (connectedProbability === 1) {
              acted = true;
              yield({ action: 'flag', id: c.id });
            } else if (connectedProbability === 0) {
              acted = true;
              yield({ action: 'clear', id: c.id });
            } else {
              probabilities.set(c.id, connectedProbability);
            }
          }
        }
      }
      if (!acted) {
        let bestID = null;
        let bestP = 1;
        for (const [id, p] of probabilities.entries()) {
          if (Number.isFinite(p) && p < bestP) {
            bestID = id;
            bestP = p;
          }
        }
        if (bestID === null) {
          throw new Error('no available cells');
        }
        yield({ action: 'clear', id: bestID });
      }
    }
  }
}
