import type { Census } from '../engine/world';

export const TICKS_PER_DAY = 100;

// The three animal colors are validated for color blindness; grass is the environment, so it's neutral.
const SERIES = [
  { key: 'rabbit', label: 'Rabbits', color: '#3987e5', format: (v: number) => v.toLocaleString() },
  { key: 'fox', label: 'Foxes', color: '#d95926', format: (v: number) => v.toLocaleString() },
  { key: 'deer', label: 'Deer', color: '#199e70', format: (v: number) => v.toLocaleString() },
  { key: 'grass', label: 'Grass', color: '#a3a89c', format: (v: number) => `${Math.round(v * 100)}%` },
] as const;

const INK = '#e8e6df';
const MUTED = '#8d9386';
const GRID = '#3a4135';
const SURFACE = '#262b23';
const WINTER = 'rgba(160, 190, 230, 0.08)';
const PAD_X = 12;
const GUTTER = 40; // y-axis labels
const TITLE_H = 22;
const PLOT_H = 48;
const PANEL_GAP = 12;
const AXIS_H = 20;
const HEIGHT = SERIES.length * (TITLE_H + PLOT_H + PANEL_GAP) + AXIS_H;

export function createChart(canvas: HTMLCanvasElement, tooltip: HTMLElement) {
  const ctx = canvas.getContext('2d')!;
  canvas.style.height = `${HEIGHT}px`;
  let hoverX: number | null = null;

  canvas.onpointermove = (e) => (hoverX = e.offsetX);
  canvas.onpointerleave = () => (hoverX = null);

  return function draw(samples: Census[]) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = SURFACE;
    ctx.fillRect(0, 0, width, HEIGHT);

    const plotLeft = PAD_X + GUTTER;
    const plotW = width - plotLeft - PAD_X;
    const n = samples.length;
    const xAt = (i: number) => plotLeft + (n < 2 ? 0 : (i / (n - 1)) * plotW);
    const hover = hoverX === null || n === 0 ? null : Math.max(0, Math.min(n - 1, Math.round(((hoverX - plotLeft) / plotW) * (n - 1))));
    const shown = hover ?? n - 1;

    ctx.fillStyle = WINTER;
    for (let i = 0; i < n - 1; i++) {
      if (samples[i].winter) ctx.fillRect(xAt(i), 0, xAt(i + 1) - xAt(i) + 0.5, HEIGHT - AXIS_H);
    }

    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    SERIES.forEach((s, row) => {
      const top = row * (TITLE_H + PLOT_H + PANEL_GAP);
      const plotTop = top + TITLE_H;
      const base = plotTop + PLOT_H;
      const values = samples.map((c) => c[s.key]);
      const max = s.key === 'grass' ? 1 : niceMax(Math.max(1, ...values));
      const yAt = (v: number) => base - (v / max) * PLOT_H;

      ctx.fillStyle = s.color;
      ctx.fillRect(PAD_X, top + TITLE_H / 2 - 1, 12, 2);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText(s.label, PAD_X + 18, top + TITLE_H / 2);
      if (n > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(s.format(values[shown]), width - PAD_X, top + TITLE_H / 2);
      }

      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, base + 0.5);
      ctx.lineTo(width - PAD_X, base + 0.5);
      ctx.setLineDash([2, 3]);
      ctx.moveTo(plotLeft, plotTop + 0.5);
      ctx.lineTo(width - PAD_X, plotTop + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(s.format(max), plotLeft - 6, plotTop);
      ctx.fillText('0', plotLeft - 6, base);

      if (n < 2) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      values.forEach((v, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(v)) : ctx.lineTo(xAt(i), yAt(v))));
      ctx.stroke();

      if (hover !== null) {
        ctx.fillStyle = s.color;
        ctx.strokeStyle = SURFACE;
        ctx.beginPath();
        ctx.arc(xAt(hover), yAt(values[hover]), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.fillText('Day 0', plotLeft, HEIGHT - AXIS_H / 2);
    if (n > 0) {
      ctx.textAlign = 'right';
      ctx.fillText(`Day ${day(samples[n - 1])}`, width - PAD_X, HEIGHT - AXIS_H / 2);
    }
    if (samples.some((c) => c.winter)) {
      ctx.textAlign = 'center';
      ctx.fillText('shaded: winter', plotLeft + plotW / 2, HEIGHT - AXIS_H / 2);
    }

    if (hover === null) {
      tooltip.hidden = true;
      return;
    }
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(xAt(hover)) + 0.5, 0);
    ctx.lineTo(Math.round(xAt(hover)) + 0.5, HEIGHT - AXIS_H);
    ctx.stroke();

    tooltip.hidden = false;
    tooltip.textContent = `Day ${day(samples[hover])}`;
    const x = xAt(hover);
    tooltip.style.left = `${x}px`;
    tooltip.style.transform = x > width / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)';
  };
}

function day(c: Census): number {
  return Math.floor(c.tick / TICKS_PER_DAY);
}

function niceMax(v: number): number {
  const step = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}
