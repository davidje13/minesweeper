const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playSlow(game, player, moveDelay) {
  for (const move of player.play(game)) {
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

  function begin() {
    game = new MinesweeperGame(grid, 300);
    display.display(game);
  }

  display.addEventListener('reset', begin);
  display.addEventListener('secret-autoplay', () => {
    playSlow(game, player, 50);
  });
  begin();
});
