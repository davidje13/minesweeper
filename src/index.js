const THEMES = [
  { theme: 'classic', name: 'Classic' },
  { theme: 'modern', name: 'Modern' },
];
const DIFFICULTIES = [
  { cols: 9, rows: 9, bombs: 10, name: 'Beginner' },
  { cols: 16, rows: 16, bombs: 40, name: 'Intermediate' },
  { cols: 30, rows: 16, bombs: 99, name: 'Advanced' },
  { cols: 50, rows: 30, bombs: 300, name: 'Extra Advanced' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playSlow(game, player, moveDelay, checkActive) {
  for (const move of player.play(game)) {
    if (!checkActive()) {
      return;
    }
    switch (move.action) {
      case 'flag': game.toggleFlag(move.id); break;
      case 'clear': game.revealCell(move.id); break;
      case 'think': break;
    }
    await sleep(moveDelay);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  let grid = null;
  let curBombs = 0;
  let curTheme = null;
  const player = new MinesweeperPlayer({ stopWhenUnsure: true });
  const display = new MinesweeperDisplay();
  const settings = new Settings(document.getElementById('settings'), THEMES, DIFFICULTIES);

  function updateConfig({ theme, cols, rows, bombs }) {
    if (curTheme !== theme) {
      curTheme = theme;
      document.getElementById('theme').setAttribute('href', `themes/${theme}.css`);
    }
    if (!grid || grid.cols !== cols || grid.rows !== rows || curBombs !== bombs) {
      grid = new MinesweeperGrid(cols, rows);
      curBombs = bombs;
      begin();
    }
  }

  document.getElementById('game').appendChild(display.base);
  document.getElementById('openSettings').addEventListener('click', () => {
    settings.showModal({
      theme: curTheme,
      cols: grid.cols,
      rows: grid.rows,
      bombs: curBombs,
    });
  });
  settings.addEventListener('cancel', () => settings.close());
  settings.addEventListener('submit', (e) => {
    settings.close();
    updateConfig(e.detail);
  });
  let game = null;
  let playing = null;

  function begin() {
    game = new MinesweeperGame(grid, curBombs, { freePasses: 5 });
    display.display(game);
    playing = null;
  }

  display.addEventListener('reset', begin);
  display.addEventListener('secret-autoplay', () => {
    if (playing !== game) {
      playing = game;
      playSlow(game, player, 50, () => (playing === game)).then(() => {
        if (playing === game) {
          playing = null;
        }
      });
    }
  });

  updateConfig({
    ...THEMES[1],
    ...DIFFICULTIES[2],
  });
});
