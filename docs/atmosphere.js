/**
 * Cartographer — Lighting & Atmospheric Post-Processing
 *
 * Offscreen canvas post-processing overlay applied on the final map:
 * - Atmospheric haze: peripheral desaturation & lightening
 * - Canvas vignette: radial dark gradient on corners
 * - Simplified ambient occlusion: darkening near high relief
 * - Golden hour lighting: warm overlay on lit faces, bluish shadows
 *
 * All effects are composited via an offscreen canvas drawn on top
 * of the main render, inside the world-transform context.
 *
 * Zero dependencies.
 */

class Atmosphere {
  constructor() {
    // Settings
    this.enabled = true;
    this.vignetteIntensity = 0.35;   // 0 = off, 1 = full black corners
    this.hazeIntensity = 0.15;       // 0 = off, 1 = full white periphery
    this.aoIntensity = 0.20;         // ambient occlusion strength
    this.goldenHour = false;         // golden hour mode toggle

    // Offscreen canvas for vignette (screen-space, cached)
    this._vignetteCanvas = null;
    this._vignetteSize = { w: 0, h: 0 };

    // AO cache
    this._aoCanvas = null;
    this._aoHash = '';
  }

  /**
   * Render all atmospheric effects.
   * Called after all entities + hill shading, before UI restore.
   *
   * @param {CanvasRenderingContext2D} mainCtx - currently in world-transform
   * @param {object} engine - CanvasEngine reference
   */
  render(mainCtx, engine) {
    if (!this.enabled) return;

    // 1. Ambient occlusion (world-space, near terrain)
    if (this.aoIntensity > 0) {
      this._renderAO(mainCtx, engine);
    }

    // 2. Golden hour lighting (world-space, on terrain)
    if (this.goldenHour) {
      this._renderGoldenHour(mainCtx, engine);
    }

    // We need screen-space effects (haze, vignette) so we
    // temporarily restore the transform, draw, then re-apply.
    mainCtx.save();

    // Undo the world transform to draw in screen space
    mainCtx.resetTransform();
    const dpr = window.devicePixelRatio || 1;
    mainCtx.scale(dpr, dpr);

    const w = engine.width;
    const h = engine.height;

    // 3. Atmospheric haze
    if (this.hazeIntensity > 0) {
      this._renderHaze(mainCtx, w, h, engine);
    }

    // 4. Vignette
    if (this.vignetteIntensity > 0) {
      this._renderVignette(mainCtx, w, h);
    }

    mainCtx.restore();
  }

  // ─── Ambient Occlusion ───────────────────────────────────────

  /**
   * Simplified AO: darken areas adjacent to high-elevation terrain.
   * Rendered as soft dark halos around terrain entity bounding boxes.
   */
  _renderAO(ctx, engine) {
    const entities = engine.entities.filter(e =>
      (e.type === 'territory' && e.data.terrainType &&
       (e.data.terrainType === 'mountain' || e.data.terrainType === 'hills')) ||
      (e.type === 'region' && (e.data.terrain === 'mountain'))
    );

    if (entities.length === 0) return;

    ctx.save();

    for (const entity of entities) {
      const d = entity.data;
      if (!d.points || d.points.length < 3) continue;

      // Compute centroid and approximate radius
      const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
      const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;

      let maxR = 0;
      for (const p of d.points) {
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        if (dist > maxR) maxR = dist;
      }

      // Soft dark radial gradient just outside the territory
      const innerR = maxR * 0.85;
      const outerR = maxR * 1.25;

      const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      const alpha = this.aoIntensity * 0.3;
      grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      grad.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── Golden Hour ─────────────────────────────────────────────

  /**
   * Golden hour: warm overlay on lit faces, bluish shadows.
   * Uses the hill shading data direction (NW light at 315°).
   */
  _renderGoldenHour(ctx, engine) {
    const terrainEntities = engine.entities.filter(e =>
      (e.type === 'territory' && e.data.terrainType) ||
      (e.type === 'region' && e.data.terrain)
    );

    if (terrainEntities.length === 0) return;

    ctx.save();

    for (const entity of terrainEntities) {
      const d = entity.data;
      if (!d.points || d.points.length < 3) continue;

      const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
      const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;

      let maxR = 0;
      for (const p of d.points) {
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        if (dist > maxR) maxR = dist;
      }

      // Warm overlay on NW-facing side (lit by golden sun)
      // Light comes from NW (315°), so lit area is towards NW
      const lightAngle = (315 * Math.PI) / 180;
      const lightOffX = Math.cos(lightAngle) * maxR * 0.3;
      const lightOffY = Math.sin(lightAngle) * maxR * 0.3;

      // Golden overlay
      const warmGrad = ctx.createRadialGradient(
        cx + lightOffX, cy + lightOffY, 0,
        cx + lightOffX, cy + lightOffY, maxR * 1.2
      );
      warmGrad.addColorStop(0, 'rgba(255, 165, 0, 0.08)');
      warmGrad.addColorStop(0.6, 'rgba(255, 165, 0, 0.03)');
      warmGrad.addColorStop(1, 'rgba(255, 165, 0, 0)');

      ctx.fillStyle = warmGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Bluish shadow on opposite side (SE)
      const shadowOffX = -lightOffX;
      const shadowOffY = -lightOffY;

      const coolGrad = ctx.createRadialGradient(
        cx + shadowOffX, cy + shadowOffY, 0,
        cx + shadowOffX, cy + shadowOffY, maxR * 1.0
      );
      coolGrad.addColorStop(0, 'rgba(68, 102, 170, 0.12)');
      coolGrad.addColorStop(0.5, 'rgba(68, 102, 170, 0.04)');
      coolGrad.addColorStop(1, 'rgba(68, 102, 170, 0)');

      ctx.fillStyle = coolGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── Atmospheric Haze ────────────────────────────────────────

  /**
   * Peripheral desaturation and lightening.
   * Elements far from center appear slightly washed out.
   */
  _renderHaze(ctx, w, h, engine) {
    // Center of the current viewport in screen space
    const centerX = w / 2;
    const centerY = h / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    // Radial gradient: transparent at center, white at edges
    const grad = ctx.createRadialGradient(centerX, centerY, maxDist * 0.4, centerX, centerY, maxDist);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.7, `rgba(245, 240, 232, ${this.hazeIntensity * 0.3})`);
    grad.addColorStop(1, `rgba(245, 240, 232, ${this.hazeIntensity})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // ─── Vignette ────────────────────────────────────────────────

  /**
   * Dark radial gradient on the 4 corners.
   */
  _renderVignette(ctx, w, h) {
    // Check if we need to regenerate the cached vignette
    if (this._vignetteCanvas &&
        this._vignetteSize.w === w &&
        this._vignetteSize.h === h) {
      ctx.drawImage(this._vignetteCanvas, 0, 0);
      return;
    }

    // Generate vignette offscreen
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const octx = offCanvas.getContext('2d');

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);

    const grad = octx.createRadialGradient(centerX, centerY, radius * 0.35, centerX, centerY, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.85, `rgba(0, 0, 0, ${this.vignetteIntensity * 0.5})`);
    grad.addColorStop(1, `rgba(0, 0, 0, ${this.vignetteIntensity})`);

    octx.fillStyle = grad;
    octx.fillRect(0, 0, w, h);

    this._vignetteCanvas = offCanvas;
    this._vignetteSize = { w, h };

    ctx.drawImage(offCanvas, 0, 0);
  }

  /**
   * Invalidate cached vignette (e.g. on resize).
   */
  invalidate() {
    this._vignetteCanvas = null;
    this._aoHash = '';
  }

  /**
   * Update settings.
   */
  setSettings(settings) {
    if (settings.vignetteIntensity !== undefined) {
      this.vignetteIntensity = settings.vignetteIntensity;
      this._vignetteCanvas = null; // regenerate
    }
    if (settings.hazeIntensity !== undefined) this.hazeIntensity = settings.hazeIntensity;
    if (settings.aoIntensity !== undefined) this.aoIntensity = settings.aoIntensity;
    if (settings.goldenHour !== undefined) this.goldenHour = settings.goldenHour;
    if (settings.enabled !== undefined) this.enabled = settings.enabled;
  }
}

window.Atmosphere = Atmosphere;
