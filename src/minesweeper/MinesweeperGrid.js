const CONNECTIVITY = [
  { x: -1, y: -1 },
  { x:  0, y: -1 },
  { x:  1, y: -1 },
  { x: -1, y:  0 },
  { x:  1, y:  0 },
  { x: -1, y:  1 },
  { x:  0, y:  1 },
  { x:  1, y:  1 },
];

class MinesweeperGrid {
  constructor(cols, rows) {
    if (rows !== Math.round(rows) || rows <= 0 || cols !== Math.round(cols) || cols <= 0) {
      throw new Error('Invalid grid setup');
    }

    this.cols = cols;
    this.rows = rows;
    this.count = rows * cols;
    this.idList = [];
    for (let id = 0; id < this.count; ++id) {
      this.idList.push(id);
    }
    this.specialIdList = [-1]; // cell -1 has connectivity to all cells (= total bomb count)
  }

  idGrid() {
    const result = [];
    for (let y = 0; y < this.rows; ++y) {
      const row = [];
      for (let x = 0; x < this.cols; ++x) {
        row.push(y * this.cols + x);
      }
      result.push(row);
    }
    return result;
  }

  connectedIDs(id) {
    if (id < 0 || id >= this.count) {
      if (id === -1) {
        return this.idList;
      }
      throw new Error('invalid cell ID');
    }
    const sx = id % this.cols;
    const sy = Math.floor(id / this.cols);
    const connected = [-1];
    for (const delta of CONNECTIVITY) {
      const nx = sx + delta.x;
      const ny = sy + delta.y;
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        connected.push(ny * this.cols + nx);
      }
    }
    return connected;
  }
}
