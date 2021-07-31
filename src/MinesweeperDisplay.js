class MinesweeperDisplay extends EventTarget {
  constructor() {
    super();
    this.reset = this.reset.bind(this);
    this.secretAutoplay = this.secretAutoplay.bind(this);
    this.cellClick = this.cellClick.bind(this);
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
    this.minefield.addEventListener('mousedown', this.cellMouseDown);
    this.minefield.addEventListener('contextmenu', this.cellContext);
    this.base.appendChild(this.minefield);

    this.game = null;
    this.cells = [];
    this.clickBegin = null;
    this.over = false;
  }

  close() {
    display(null);
    this.resetButton.removeEventListener('click', this.reset);
    this.remaining.removeEventListener('dblclick', this.secretAutoplay);
    this.minefield.removeEventListener('click', this.cellClick);
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
      return;
    }

    this.rebuildGrid(game.rows, game.cols);

    this.over = false;
    this.updateGameState();
    this.updateAllCells(false);

    game.addEventListener('change', this.updateGameState);
    game.addEventListener('cellchange', this.cellChangeHandler);
  }

  rebuildGrid(rows, cols) {
    this.minefield.innerText = '';
    this.cells = [];
    for (let y = 0; y < rows; ++y) {
      const row = [];
      for (let x = 0; x < cols; ++x) {
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.style.gridArea = `${y + 1} / ${x + 1} / ${y + 2} / ${x + 2}`;
        cell.dataset.x = x;
        cell.dataset.y = y;
        this.minefield.appendChild(cell);
        row.push(cell);
      }
      this.cells.push(row);
    }
    this.base.classList.remove('picking');
    window.removeEventListener('mouseup', this.cellMouseUp);
    this.clickBegin = null;
  }

  updateAllCells(onlyNonCleared) {
    for (let y = 0; y < this.game.rows; ++y) {
      for (let x = 0; x < this.game.cols; ++x) {
        const cell = this.game.cell(x, y);
        if (!onlyNonCleared || !cell.cleared) {
          this.updateCell(cell);
        }
      }
    }
  }

  updateCell(data) {
    const cell = this.cells[data.y][data.x];
    cell.classList.toggle('flagged', data.flagged);
    cell.classList.toggle('cleared', data.cleared);
    cell.disabled = this.over || data.cleared;
    if (this.over || data.cleared) {
      cell.classList.toggle('bomb', data.bomb);
      cell.dataset.count = data.count;
    } else {
      cell.classList.remove('bomb');
      cell.dataset.count = -1;
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
      this.updateAllCells(true);
    }
  }

  cellChangeHandler(e) {
    this.updateCell(e.detail);
  }

  reset() {
    this.dispatchEvent(new Event('reset'));
  }

  secretAutoplay() {
    this.dispatchEvent(new Event('secret-autoplay'));
  }

  cellClick(e) {
    if (e.altKey || e.metaKey) {
      this.cellContext(e);
      return;
    }
    if (e.target.parentElement === this.minefield && e.target.classList.contains('cell')) {
      this.game.revealCell(Number(e.target.dataset.x), Number(e.target.dataset.y));
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
    if (e.target === this.clickBegin) {
      return; // click will be caught by click handler
    }
    this.clickBegin = null;
    this.cellClick(e);
  }

  cellContext(e) {
    e.preventDefault();

    if (e.target.parentElement === this.minefield && e.target.classList.contains('cell')) {
      this.game.toggleFlag(Number(e.target.dataset.x), Number(e.target.dataset.y));
    }
  }
}
