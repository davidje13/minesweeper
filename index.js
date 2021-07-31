const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playSlow(game, player, moveDelay) {
  for (const move of player.play(game)) {
    switch (move.action) {
      case 'flag': game.toggleFlag(move.x, move.y); break;
      case 'clear': game.revealCell(move.x, move.y); break;
    }
    await sleep(moveDelay);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const display = new MinesweeperDisplay();
  document.body.appendChild(display.base);
  let game = null;

  function begin() {
    game = new MinesweeperGame(50, 30, 100);
    display.display(game);
  }

  display.addEventListener('reset', begin);
  display.addEventListener('secret-autoplay', () => {
    playSlow(game, new MinesweeperPlayer(), 100);
  });
  begin();
});
