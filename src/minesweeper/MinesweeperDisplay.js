class MinesweeperDisplay extends EventTarget {
  constructor() {
    super();
    this.reset = this.reset.bind(this);
    this.secretAutoplay = this.secretAutoplay.bind(this);
    this.cellClick = this.cellClick.bind(this);
    this.cellKeyDown = this.cellKeyDown.bind(this);
    this.cellMouseDown = this.cellMouseDown.bind(this);
    this.cellMouseUp = this.cellMouseUp.bind(this);
    this.cellContext = this.cellContext.bind(this);
    this.updateGameState = this.updateGameState.bind(this);
    this.cellChangeHandler = this.cellChangeHandler.bind(this);

    this.base = document.createElement('section');
    this.base.className = 'minesweeper';

    const hud = document.createElement('section');
    hud.className = 'hud';
    this.base.appendChild(hud);

    this.remaining = document.createElement('div');
    this.remaining.className = 'remaining';
    this.remaining.addEventListener('dblclick', this.secretAutoplay);
    hud.appendChild(this.remaining);

    this.score = document.createElement('div');
    this.score.className = 'score';
    hud.appendChild(this.score);

    this.resetButton = document.createElement('button');
    this.resetButton.className = 'reset';
    this.resetButton.addEventListener('click', this.reset);
    hud.appendChild(this.resetButton);

    this.minefield = document.createElement('section');
    this.minefield.className = 'minefield';
    this.minefield.addEventListener('click', this.cellClick);
    window.addEventListener('keydown', this.cellKeyDown);
    this.minefield.addEventListener('mousedown', this.cellMouseDown);
    this.minefield.addEventListener('contextmenu', this.cellContext);
    this.base.appendChild(this.minefield);

    this.game = null;
    this.cells = new Map();
    this.clickBegin = null;
    this.lastActive = null;
    this.over = false;
  }

  close() {
    display(null);
    this.resetButton.removeEventListener('click', this.reset);
    this.remaining.removeEventListener('dblclick', this.secretAutoplay);
    this.minefield.removeEventListener('click', this.cellClick);
    window.removeEventListener('keydown', this.cellKeyDown);
    this.minefield.removeEventListener('mousedown', this.cellMouseDown);
    this.minefield.removeEventListener('contextmenu', this.cellContext);
    window.removeEventListener('mouseup', this.cellMouseUp);
    this.clickBegin = null;
    this.base.parentElement.removeChild(this.base);
  }

  display(game) {
    if (this.game) {
      this.game.removeEventListener('change', this.updateGameState);
      this.game.removeEventListener('cellchange', this.cellChangeHandler);
    }
    this.game = game;
    if (!game) {
      this.rebuildGrid(null);
      return;
    }

    this.rebuildGrid(game.grid);

    this.over = false;
    this.updateGameState();
    this.updateAllCells();

    game.addEventListener('change', this.updateGameState);
    game.addEventListener('cellchange', this.cellChangeHandler);
  }

  rebuildGrid(grid) {
    this.minefield.innerText = '';
    this.cells.clear();
    this.base.classList.remove('picking');
    window.removeEventListener('mouseup', this.cellMouseUp);
    this.clickBegin = null;
    if (!grid) {
      return;
    }
    const rows = grid.idGrid();
    rows.forEach((row, y) => row.forEach((id, x) => {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.style.gridArea = `${y + 1} / ${x + 1} / ${y + 2} / ${x + 2}`;
      cell.dataset.id = id;
      this.minefield.appendChild(cell);
      this.cells.set(id, {
        element: cell,
        l: row[x-1],
        r: row[x+1],
        u: rows[y-1]?.[x],
        d: rows[y+1]?.[x],
      });
    }));
  }

  updateAllCells() {
    for (const id of this.game.grid.idList) {
      this.updateCell(id);
    }
  }

  updateCell(id) {
    const cellData = this.game.cell(id);

    const cell = this.cells.get(id);
    if (cell) {
      cell.element.classList.toggle('flagged', cellData.flagged);
      cell.element.classList.toggle('cleared', cellData.cleared);
      cell.element.classList.toggle('bomb', Boolean(cellData.bomb));
      cell.element.disabled = this.over;
      cell.element.dataset.count = cellData.count ?? '';
    }
  }

  updateGameState() {
    const over = this.game.success || this.game.failure;

    const remaining = Math.max(this.game.bombs - this.game.flagged, 0);
    const score = this.game.cleared;
    this.remaining.innerText = remaining.toFixed(0).padStart(3, '0');
    this.score.innerText = score.toFixed(0).padStart(3, '0');

    this.base.classList.toggle('over', over);
    this.base.classList.toggle('success', this.game.success);
    this.base.classList.toggle('failure', this.game.failure);

    if (over !== this.over) {
      this.over = over;
      this.updateAllCells();
    }
  }

  cellChangeHandler(e) {
    this.updateCell(e.detail);
  }

  reset() {
    this.dispatchEvent(new Event('reset'));
  }

  secretAutoplay(e) {
    e.preventDefault();
    this.dispatchEvent(new Event('secret-autoplay'));
  }

  getEventCell(e) {
    if (e.target.parentElement === this.minefield && e.target.classList.contains('cell')) {
      const id = Number(e.target.dataset.id);
      this.lastActive = id;
      return id;
    }
    if (e.target === document.body && this.lastActive !== null) {
      return this.lastActive;
    }
    return null;
  }

  cellClick(e) {
    e.preventDefault();
    const cell = this.getEventCell(e);
    if (cell === null) {
      return;
    }
    const cellData = this.game.cell(cell);
    if (cellData.cleared) {
      this.handleCompleteCell(cell, cellData);
    } else {
      this.handleSelectCell(e, cell);
    }
  }

  handleSelectCell(e, cell) {
    if (e.altKey || e.metaKey) {
      this.game.toggleFlag(cell);
    } else {
      this.game.revealCell(cell);
    }
  }

  handleCompleteCell(cell, cellData) {
    const connectedIDs = this.game.grid.connectedIDs(cell);
    const allConnected = (fn) => {
      for (const connectedID of connectedIDs) {
        const connectedCellData = this.game.cell(connectedID);
        fn(connectedID, connectedCellData);
      }
    };
    let flagged = 0;
    let cleared = 0;
    allConnected((_, connectedCellData) => {
      flagged += connectedCellData.flagged ? 1 : 0;
      cleared += connectedCellData.cleared ? 1 : 0;
    });
    if (flagged === cellData.count) {
      allConnected((connectedID, connectedCellData) => {
        if (!connectedCellData.cleared && !connectedCellData.flagged) {
          this.game.revealCell(connectedID);
        }
      });
    } else if (cleared === connectedIDs.length - cellData.count) {
      allConnected((connectedID, connectedCellData) => {
        if (!connectedCellData.cleared && !connectedCellData.flagged) {
          this.game.toggleFlag(connectedID);
        }
      });
    }
  }

  cellKeyDown(e) {
    const cell = this.getEventCell(e);
    if (cell === null) {
      return;
    }
    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        if (!e.repeat) {
          this.game.toggleFlag(cell);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.moveFocus(cell, 'l');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.moveFocus(cell, 'r');
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveFocus(cell, 'u');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.moveFocus(cell, 'd');
        break;
      case 'Tab':
        if (this.over && e.target === document.body) {
          e.preventDefault();
          this.resetButton.focus();
        }
        break;
    }
  }

  moveFocus(id, dir) {
    if (this.over) {
      this.resetButton.focus();
      return;
    }
    const next = this.cells.get(id)[dir];
    if (next !== undefined) {
      this.cells.get(next)?.element.focus();
    }
  }

  cellMouseDown(e) {
    if (e.button !== 0) {
      return;
    }
    this.base.classList.add('picking');
    this.clickBegin = e.target;
    window.addEventListener('mouseup', this.cellMouseUp);
  }

  cellMouseUp(e) {
    if (e.button !== 0) {
      return;
    }
    this.base.classList.remove('picking');
    window.removeEventListener('mouseup', this.cellMouseUp);
    if (e.target !== this.clickBegin) {
      e.preventDefault();
      const cell = this.getEventCell(e);
      if (cell !== null) {
        this.handleSelectCell(e, cell);
      }
    }
    this.clickBegin = null;
  }

  cellContext(e) {
    e.preventDefault();
    const cell = this.getEventCell(e);
    if (cell !== null) {
      this.game.toggleFlag(cell);
    }
  }
}
