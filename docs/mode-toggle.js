/**
 * Cartographer — Simple / Advanced Mode Toggle
 *
 * Controls which tools and panels are visible.
 * Persisted in localStorage (not per world).
 */

class ModeToggle {
  constructor() {
    this.advanced = localStorage.getItem('cartographer-advanced') === '1';
    this._build();
    this.apply();
  }

  _build() {
    // Add settings button to topbar
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight) return;

    const btn = document.createElement('button');
    btn.id = 'btn-settings';
    btn.className = 'btn-icon';
    btn.title = 'Paramètres';
    btn.innerHTML = '&#9881;';
    topbarRight.appendChild(btn);

    // Settings dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'settings-dropdown';
    dropdown.className = 'settings-dropdown';
    dropdown.hidden = true;
    dropdown.innerHTML = `
      <label class="settings-toggle-label">
        <input type="checkbox" id="advanced-mode-toggle" ${this.advanced ? 'checked' : ''}>
        <span>Mode avancé</span>
      </label>
    `;
    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(dropdown);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#settings-dropdown') && !e.target.closest('#btn-settings')) {
        dropdown.hidden = true;
      }
    });

    dropdown.querySelector('#advanced-mode-toggle').addEventListener('change', (e) => {
      this.advanced = e.target.checked;
      localStorage.setItem('cartographer-advanced', this.advanced ? '1' : '0');
      this.apply();
    });
  }

  apply() {
    const body = document.body;
    body.classList.toggle('mode-simple', !this.advanced);
    body.classList.toggle('mode-advanced', this.advanced);
  }

  isAdvanced() {
    return this.advanced;
  }
}

export { ModeToggle };
