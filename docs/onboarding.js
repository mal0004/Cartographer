/**
 * Cartographer — Interactive Onboarding
 *
 * 6-step tutorial overlay on real interface with spotlight cutout.
 * Shows at first world launch, skip-able, re-launchable from Help.
 */

class Onboarding {
  constructor() {
    this.currentStep = 0;
    this.active = false;
    this.steps = [
      {
        target: '#main-canvas',
        title: 'Bienvenue sur Cartographer !',
        text: 'Voici votre canvas — pincez pour zoomer, glissez pour naviguer.',
        position: 'center',
      },
      {
        target: '[data-tool="territory"]',
        title: 'Dessinez un territoire',
        text: 'Cliquez sur cet outil, puis cliquez pour placer des points sur la carte. Clic droit pour fermer le polygone.',
        position: 'right',
      },
      {
        target: '[data-tool="city"]',
        title: 'Placez une ville',
        text: 'Sélectionnez l\'outil Ville et cliquez sur la carte pour poser votre première cité.',
        position: 'right',
      },
      {
        target: '#sidebar',
        title: 'Donnez-lui un nom',
        text: 'Cliquez sur une entité pour ouvrir sa fiche. Vous pouvez modifier son nom, ses propriétés et sa description.',
        position: 'left',
      },
      {
        target: '#timeline-toggle',
        title: 'La Timeline',
        text: 'Ajoutez des événements historiques à votre monde. Cliquez sur un événement pour naviguer vers l\'entité liée.',
        position: 'top',
      },
      {
        target: '#btn-export-svg',
        title: 'Exportez votre carte',
        text: 'Exportez en SVG pour l\'impression ou en JSON pour sauvegarder et partager votre monde.',
        position: 'bottom',
      },
    ];
  }

  shouldShow(worldId) {
    const key = `cartographer_onboarding_${worldId}`;
    return !localStorage.getItem(key);
  }

  markDone(worldId) {
    localStorage.setItem(`cartographer_onboarding_${worldId}`, '1');
  }

  start(worldId) {
    this.worldId = worldId;
    this.currentStep = 0;
    this.active = true;
    this._buildOverlay();
    this._showStep();
  }

  _buildOverlay() {
    // Remove existing
    const existing = document.getElementById('onboarding-overlay');
    if (existing) existing.remove();

    this.overlay = document.createElement('div');
    this.overlay.id = 'onboarding-overlay';
    this.overlay.className = 'onboarding-overlay';
    this.overlay.innerHTML = `
      <div class="onboarding-backdrop" id="onboarding-backdrop"></div>
      <div class="onboarding-spotlight" id="onboarding-spotlight"></div>
      <div class="onboarding-tooltip" id="onboarding-tooltip">
        <div class="onboarding-step-count" id="onboarding-step-count"></div>
        <h3 id="onboarding-title"></h3>
        <p id="onboarding-text"></p>
        <div class="onboarding-actions">
          <button class="btn btn-secondary btn-sm" id="onboarding-skip">Passer</button>
          <button class="btn btn-primary btn-sm" id="onboarding-next">Suivant</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    document.getElementById('onboarding-skip').addEventListener('click', () => this._finish());
    document.getElementById('onboarding-next').addEventListener('click', () => this._next());
  }

  _showStep() {
    if (this.currentStep >= this.steps.length) {
      this._finish();
      return;
    }

    const step = this.steps[this.currentStep];
    const target = document.querySelector(step.target);
    const tooltip = document.getElementById('onboarding-tooltip');
    const spotlight = document.getElementById('onboarding-spotlight');

    // Step counter
    document.getElementById('onboarding-step-count').textContent =
      `${this.currentStep + 1} / ${this.steps.length}`;
    document.getElementById('onboarding-title').textContent = step.title;
    document.getElementById('onboarding-text').textContent = step.text;

    // Update button text
    const nextBtn = document.getElementById('onboarding-next');
    nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Terminer' : 'Suivant';

    if (target) {
      const rect = target.getBoundingClientRect();
      const pad = 8;

      // Spotlight cutout
      spotlight.style.display = 'block';
      spotlight.style.left = (rect.left - pad) + 'px';
      spotlight.style.top = (rect.top - pad) + 'px';
      spotlight.style.width = (rect.width + pad * 2) + 'px';
      spotlight.style.height = (rect.height + pad * 2) + 'px';

      // Position tooltip
      tooltip.style.display = 'block';
      const tw = 320;
      let tx, ty;

      switch (step.position) {
        case 'right':
          tx = rect.right + 20;
          ty = rect.top;
          break;
        case 'left':
          tx = rect.left - tw - 20;
          ty = rect.top;
          break;
        case 'top':
          tx = rect.left + rect.width / 2 - tw / 2;
          ty = rect.top - 160;
          break;
        case 'bottom':
          tx = rect.left + rect.width / 2 - tw / 2;
          ty = rect.bottom + 20;
          break;
        default: // center
          tx = window.innerWidth / 2 - tw / 2;
          ty = window.innerHeight / 2 - 80;
          spotlight.style.display = 'none';
      }

      // Keep in viewport
      tx = Math.max(10, Math.min(window.innerWidth - tw - 10, tx));
      ty = Math.max(10, Math.min(window.innerHeight - 200, ty));

      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    }
  }

  _next() {
    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this._finish();
    } else {
      this._showStep();
    }
  }

  _finish() {
    this.active = false;
    if (this.worldId) this.markDone(this.worldId);
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

export { Onboarding };
