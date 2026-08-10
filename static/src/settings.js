function make(tag, attrs = {}, children = []) {
  const o = document.createElement(tag);
  for (const [attr, value] of Object.entries(attrs)) {
    o.setAttribute(attr, value);
  }
  for (const child of children) {
    if (typeof child === 'string') {
      o.appendChild(document.createTextNode(child));
    } else if (o) {
      o.appendChild(child);
    }
  }
  return o;
}

function makeRadio(name, value, labelChildren) {
  return make('label', {}, [
    make('input', { type: 'radio', name, value }),
    make('span', {}, labelChildren),
  ]);
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

class Settings extends EventTarget {
  constructor(base, themes, difficulties) {
    super();
    this.base = base;
    this.form = base.getElementsByTagName('form')[0];

    const themeOptions = this.form.getElementsByClassName('themes')[0];
    for (const { theme, name } of themes) {
      themeOptions.appendChild(makeRadio('theme', theme, [name]));
    }

    const presetOptions = this.form.getElementsByClassName('presets')[0];
    for (const { cols, rows, bombs, name } of difficulties) {
      presetOptions.appendChild(makeRadio('difficulty', `${cols},${rows},${bombs}`, [
        name,
        make('br'),
        `${bombs} mines`,
        make('br'),
        `${cols} \u00D7 ${rows} tile grid`,
      ]));
    }

    this.form.getElementsByClassName('cancel')[0].addEventListener('click', () => {
      this.dispatchEvent(new Event('cancel'));
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('submit', { detail: this.getCurrentState() }));
    });
    this.form.addEventListener('keydown', (e) => e.stopPropagation());
  }

  populate({ theme, cols, rows, bombs }) {
    selectRadio(this.form, 'theme', theme);
    if (!selectRadio(this.form, 'difficulty', `${cols},${rows},${bombs}`)) {
      selectRadio(this.form, 'difficulty', '');
    }
    this.form.elements['cols'].value = cols;
    this.form.elements['rows'].value = rows;
    this.form.elements['bombs'].value = bombs;
  }

  getCurrentState() {
    const theme = getRadio(this.form, 'theme');
    const difficulty = getRadio(this.form, 'difficulty');
    if (difficulty) {
      const [cols, rows, bombs] = difficulty.split(',');
      return {
        theme,
        cols: Math.round(Number(cols)),
        rows: Math.round(Number(rows)),
        bombs: Math.round(Number(bombs)),
      };
    }
    return {
      theme,
      cols: Math.round(Number(this.form.elements['cols'].value)),
      rows: Math.round(Number(this.form.elements['rows'].value)),
      bombs: Math.round(Number(this.form.elements['bombs'].value)),
    };
  }

  showModal(data) {
    this.populate(data);
    this.base.showModal();
  }

  close() {
    this.base.close();
  }
}
