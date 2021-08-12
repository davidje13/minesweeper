function random(max) {
  return Math.floor(Math.random() * max);
}

function pickRandomIndices(total, count, rng) {
  const indices = [];
  let space = total;
  for (let i = 0; i < count; ++i) {
    const v = rng(space);
    let n = 0;
    while (n < indices.length && v + n >= indices[n]) {
      ++n;
    }
    indices.splice(n, 0, v + n);
    --space;
  }
  return indices;
}

class MinesweeperGame extends EventTarget {
  constructor(grid, bombs, { rng = random, freePasses = 1 } = {}) {
    super();

    if (bombs !== Math.round(bombs) || bombs <= 0) {
      throw new Error('Invalid game setup');
    }

    this.grid = grid;
    this.freePasses = freePasses;
    this.rng = rng;

    this.flagged = 0;
    this.cleared = 0;
    this.bombs = 0;
    this.success = (bombs >= grid.count); // nothing to do if fully packed with bombs
    this.failure = false;

    this.cellData = new Map();
    for (const id of grid.idList()) {
      this.cellData.set(id, { cleared: false, flagged: false, bomb: false, count: 0 });
    }
    const isNotCleared = (id) => !this.cellData.get(id).cleared;
    this._isNotNearCleared = (id) => this.grid.connectedIDs(id).every(isNotCleared);
    this._addRandomBombs(Math.min(bombs, grid.count));
  }

  cell(id) {
    const cellData = this.cellData.get(id);
    if (cellData.cleared || this.success || this.failure) {
      return { cleared: cellData.cleared, flagged: cellData.flagged, bomb: cellData.bomb, count: cellData.count };
    } else {
      return { cleared: cellData.cleared, flagged: cellData.flagged };
    }
  }

  _addRandomBombs(count) {
    const ids = this.pickRandomIDs((id) => !this.cellData.get(id).bomb, count);
    if (ids.length !== count) {
      throw new Error('failed to pick random locations');
    }
    for (const id of ids) {
      this._setBomb(id, true);
    }
  }

  _moveBomb(id) {
    const ids = this.pickRandomIDs((id) => {
      const cellData = this.cellData.get(id);
      return (!cellData.bomb && !cellData.cleared && this._isNotNearCleared(id));
    }, 1);
    if (ids.length !== 1) {
      return false;
    }
    this._setBomb(ids[0], true);
    this._setBomb(id, false);
    return true;
  }

  pickRandomIDs(predicate, count) {
    let space = 0;
    for (const id of this.grid.idList()) {
      if (predicate(id)) {
        ++space;
      }
    }
    if (space < count) {
      return [];
    }
    const indices = pickRandomIndices(space, count, this.rng);
    let p = 0;
    let n = 0;
    const resultIDs = [];
    for (const id of this.grid.idList()) {
      if (predicate(id)) {
        if (p === indices[n]) {
          resultIDs.push(id);
          ++n;
          if (n === indices.length) {
            break;
          }
        }
        ++p;
      }
    }
    return resultIDs;
  }

  _setBomb(id, isBomb) {
    this.cellData.get(id).bomb = isBomb;
    const deltaCount = isBomb ? 1 : -1;
    this.bombs += deltaCount;
    for (const connectedID of this.grid.connectedIDs(id)) {
      this.cellData.get(connectedID).count += deltaCount;
    }
  }

  revealCell(id, flood = true) {
    if (this.success || this.failure) {
      return;
    }

    const cellData = this.cellData.get(id);
    if (cellData.cleared || cellData.flagged) {
      return;
    }
    if (cellData.bomb) {
      if (this.cleared < this.freePasses && this._isNotNearCleared(id)) {
        this._moveBomb(id);
      }
    }
    if (cellData.bomb) {
      cellData.cleared = true;
      this.failure = true;
      this.dispatchEvent(new CustomEvent('cellchange', { detail: id }));
      this.dispatchEvent(new Event('change'));
      return;
    }

    cellData.cleared = true;
    const idQueue = [id];
    while (idQueue.length > 0) {
      const curID = idQueue.pop();

      ++this.cleared;
      this.dispatchEvent(new CustomEvent('cellchange', { detail: curID }));

      if (flood && this.cellData.get(curID).count === 0) {
        for (const connectedID of this.grid.connectedIDs(curID)) {
          const connectedCellData = this.cellData.get(connectedID);
          if (!connectedCellData.cleared && !connectedCellData.flagged) {
            connectedCellData.cleared = true;
            idQueue.push(connectedID);
          }
        }
      }
    }

    if (this.cleared >= this.grid.count - this.bombs) {
      this.success = true;
    }
    this.dispatchEvent(new Event('change'));
  }

  toggleFlag(id) {
    if (this.success || this.failure) {
      return;
    }

    const cellData = this.cellData.get(id);
    if (cellData.cleared) {
      return;
    }
    cellData.flagged = !cellData.flagged;
    this.flagged += (cellData.flagged ? 1 : -1);
    this.dispatchEvent(new CustomEvent('cellchange', { detail: id }));
    this.dispatchEvent(new Event('change'));
  }
}
