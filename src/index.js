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

function selectRadio(form, name, value) {
  let any = false;
  form.querySelectorAll(`input[name="${name}"]`).forEach((e) => {
    const match = (e.value === value);
    e.checked = match;
    any = any || match;
  });
  return any;
}

function getRadio(form, name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value;
}

window.addEventListener('DOMContentLoaded', () => {
  const themeCss = document.getElementById('theme');
  let theme = 'classic';
  themeCss.setAttribute('href', `themes/${theme}.css`);

  let grid = new MinesweeperGrid(50, 30);
  let bombs = 300;
  const player = new MinesweeperPlayer({ stopWhenUnsure: true });
  const display = new MinesweeperDisplay();
  const settingsForm = document.getElementById('settings').getElementsByTagName('form')[0];
  document.getElementById('game').appendChild(display.base);
  document.getElementById('openSettings').addEventListener('click', () => {
    selectRadio(settingsForm, 'theme', theme);
    if (!selectRadio(settingsForm, 'difficulty', `${grid.cols},${grid.rows},${bombs}`)) {
      selectRadio(settingsForm, 'difficulty', '');
    }
    settingsForm.elements['width'].value = grid.cols;
    settingsForm.elements['height'].value = grid.rows;
    settingsForm.elements['bombs'].value = bombs;
    document.getElementById('settings').showModal();
  });
  document.getElementById('settings-cancel').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('settings').close();
  });
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('settings').close();
    const newTheme = getRadio(settingsForm, 'theme');
    if (newTheme && newTheme !== theme) {
      theme = newTheme;
      themeCss.setAttribute('href', `themes/${theme}.css`);
    }
    const newDifficulty = getRadio(settingsForm, 'difficulty');
    let newOpts;
    if (newDifficulty) {
      const [w, h, b] = newDifficulty.split(',');
      newOpts = {
        w: Math.round(Number(w)),
        h: Math.round(Number(h)),
        b: Math.round(Number(b)),
      };
    } else {
      newOpts = {
        w: Math.round(Number(settingsForm.elements['width'].value)),
        h: Math.round(Number(settingsForm.elements['height'].value)),
        b: Math.round(Number(settingsForm.elements['bombs'].value)),
      };
    }
    if (grid.cols !== newOpts.w || grid.rows !== newOpts.h || bombs !== newOpts.b) {
      grid = new MinesweeperGrid(newOpts.w, newOpts.h);
      bombs = newOpts.b;
      begin();
    }
  });
  let game = null;
  let playing = null;

  function begin() {
    game = new MinesweeperGame(grid, bombs, { freePasses: 5 });
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
