class MinesweeperPlayer {
  constructor() {}

  *play(game) {
    while (!game.success && !game.failure) {
      const probabilities = [];
      const baseProbability = (game.bombs - game.flagged) / (game.rows * game.cols - game.cleared);
      for (let y = 0; y < game.rows; ++y) {
        for (let x = 0; x < game.cols; ++x) {
          const cell = game.cell(x, y);
          if (cell.flagged) {
            probabilities.push(Number.POSITIVE_INFINITY);
          } else if (cell.cleared) {
            probabilities.push(Number.NEGATIVE_INFINITY);
          } else {
            probabilities.push(baseProbability);
          }
        }
      }
      let acted = false;
      for (let y = 0; y < game.rows; ++y) {
        for (let x = 0; x < game.cols; ++x) {
          const cell = game.cell(x, y);
          if (cell.flagged || !cell.cleared || cell.count === 0) {
            continue;
          }
          const connectedCells = game.connectedCells(cell);
          let nearbyFlagged = 0;
          let nearbyCleared = 0;
          for (const connectedCell of connectedCells) {
            if (connectedCell.cleared) {
              ++nearbyCleared;
            } else if (connectedCell.flagged) {
              ++nearbyFlagged;
            }
          }
          if (nearbyCleared + nearbyFlagged === connectedCells.length) {
            continue;
          }
          if (cell.count === connectedCells.length - nearbyCleared) {
            for (const connectedCell of connectedCells) {
              if (!connectedCell.cleared && !connectedCell.flagged) {
                acted = true;
                yield({ action: 'flag', x: connectedCell.x, y: connectedCell.y });
                if (game.success || game.failure) {
                  return;
                }
              }
            }
          } else if (cell.count === nearbyFlagged) {
            for (const connectedCell of connectedCells) {
              if (!connectedCell.cleared && !connectedCell.flagged) {
                acted = true;
                yield({ action: 'clear', x: connectedCell.x, y: connectedCell.y });
                if (game.success || game.failure) {
                  return;
                }
              }
            }
          } else {
            const connectedProbability = (cell.count - nearbyFlagged) / (connectedCells.length - nearbyFlagged - nearbyCleared);
            for (const connectedCell of connectedCells) {
              if (!connectedCell.cleared && !connectedCell.flagged) {
                const p = connectedCell.y * game.cols + connectedCell.x;
                probabilities[p] = connectedProbability;
              }
            }
          }
        }
      }
      if (!acted) {
        let best = { x: 0, y: 0 };
        let bestP = 1;
        for (let y = 0; y < game.rows; ++y) {
          for (let x = 0; x < game.cols; ++x) {
            const p = probabilities[y * game.cols + x];
            if (Number.isFinite(p) && p < bestP) {
              best = { x, y };
              bestP = p;
            }
          }
        }
        yield({ action: 'clear', x: best.x, y: best.y });
      }
    }
  }
}
