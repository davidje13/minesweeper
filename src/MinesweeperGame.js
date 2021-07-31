function random(max) {
  return Math.floor(Math.random() * max);
}

class MinesweeperGame extends EventTarget {
  constructor(cols, rows, bombs, { rng = random, freeFirstPass = true } = {}) {
    super();
    if (
      rows !== Math.round(rows) || rows <= 0 ||
      cols !== Math.round(cols) || cols <= 0 ||
      bombs !== Math.round(bombs) || bombs <= 0
    ) {
      throw new Error('Invalid game setup');
    }

    const packed = bombs >= rows * cols;

    this.rows = rows;
    this.cols = cols;
    this.bombs = Math.min(bombs, rows * cols);
    this.freeFirstPass = freeFirstPass && !packed;
    this.rng = rng;

    this.connectivity = [
      { x: -1, y: -1 },
      { x:  0, y: -1 },
      { x:  1, y: -1 },
      { x: -1, y:  0 },
      { x:  1, y:  0 },
      { x: -1, y:  1 },
      { x:  0, y:  1 },
      { x:  1, y:  1 },
    ];

    this.flagged = 0;
    this.cleared = 0;
    this.actualBombCount = 0;
    this.success = packed; // nothing to do if fully packed with bombs
    this.failure = false;

    this.cells = [];
    for (let y = 0; y < rows; ++y) {
      for (let x = 0; x < cols; ++x) {
        this.cells.push({ flagged: false, cleared: false, bomb: false, count: 0, x, y });
      }
    }
    this.addRandomBombs(this.bombs);
  }

  cell(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      return null;
    }
    return this.cells[y * this.cols + x];
  }

  connectedCells({ x, y }) {
    const connected = [];
    for (const delta of this.connectivity) {
      const cell = this.cell(x + delta.x, y + delta.y);
      if (cell) {
        connected.push(cell);
      }
    }
    return connected;
  }

  addRandomBombs(count) {
    const positions = [];
    let space = this.rows * this.cols - this.actualBombCount;
    for (let i = 0; i < count; ++i) {
      const v = this.rng(space);
      let n = 0;
      while (n < positions.length && v + n >= positions[n]) {
        ++n;
      }
      positions.splice(n, 0, v + n);
      --space;
    }
    let p = 0;
    let n = 0;
    const changed = [];
    for (let i = 0; n < positions.length && i < this.rows * this.cols; ++i) {
      if (!this.cells[i].bomb) {
        if (p === positions[n]) {
          this.setBomb(this.cells[i], true);
          changed.push(this.cells[i]);
          ++n;
        }
        ++p;
      }
    }
    if (n !== positions.length) {
      throw new Error('failed to place all bombs');
    }
    return changed;
  }

  setBomb(cell, isBomb) {
    cell.bomb = isBomb;
    const deltaCount = isBomb ? 1 : -1;
    this.actualBombCount += deltaCount;
    for (const connectedCell of this.connectedCells(cell)) {
      connectedCell.count += deltaCount;
    }
  }

  revealCell(x, y, flood = true) {
    const cell = this.cell(x, y);
    if (cell.cleared || cell.flagged) {
      return;
    }
    if (cell.bomb) {
      if (this.freeFirstPass && this.cleared === 0) {
        const changed = this.addRandomBombs(1);
        this.setBomb(cell, false);
        this.dispatchEvent(new CustomEvent('cellchange', { detail: changed[0] }));
      } else {
        cell.cleared = true;
        this.failure = true;
        this.dispatchEvent(new CustomEvent('cellchange', { detail: cell }));
        this.dispatchEvent(new Event('change'));
        return;
      }
    }

    cell.cleared = true;
    const queue = [cell];
    while (queue.length > 0) {
      const curCell = queue.pop();

      ++this.cleared;
      this.dispatchEvent(new CustomEvent('cellchange', { detail: curCell }));

      if (flood && curCell.count === 0) {
        for (const connectedCell of this.connectedCells(curCell)) {
          if (!connectedCell.cleared && !connectedCell.flagged) {
            connectedCell.cleared = true;
            queue.push(connectedCell);
          }
        }
      }
    }

    if (this.cleared >= this.rows * this.cols - this.bombs) {
      this.success = true;
    }
    this.dispatchEvent(new Event('change'));
  }

  toggleFlag(x, y) {
    const cell = this.cell(x, y);
    if (cell.cleared) {
      return;
    }
    if (cell.flagged) {
      cell.flagged = false;
      --this.flagged;
    } else {
      cell.flagged = true;
      ++this.flagged;
    }
    this.dispatchEvent(new CustomEvent('cellchange', { detail: cell }));
    this.dispatchEvent(new Event('change'));
  }
}
