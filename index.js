const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playSlow(game, player, moveDelay, checkActive) {
  for (const move of player.play(game)) {
    if (!checkActive()) {
      return;
    }
    switch (move.action) {
      case 'flag': game.toggleFlag(move.id); break;
      case 'clear': game.revealCell(move.id); break;
    }
    await sleep(moveDelay);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const grid = new MinesweeperGrid(50, 30);
  const player = new MinesweeperPlayer({ stopWhenUnsure: true });
  const display = new MinesweeperDisplay();
  document.body.appendChild(display.base);
  let game = null;
  let playing = null;

  function begin() {
    game = new MinesweeperGame(grid, 300, { freePasses: 5 });
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
  begin();
});
