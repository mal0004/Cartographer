/**
 * Cartographer — Fantasy Symbols
 * Style: 17th-century engraving, stroke-only, viewBox 24×24
 */

const FANTASY_SYMBOLS = [
  { id: 'dragon', name: 'Dragon', category: 'Fantastique',
    svg: '<path d="M4,18 Q3,14 6,10 Q8,7 11,6 L12,4 L13,6 Q16,7 18,10 L20,8 L19,11 Q21,14 20,17 L18,16 Q16,18 13,19 Q10,19 7,17 L5,19 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="10" cy="10" r="1" fill="currentColor"/><path d="M14,14 L15,15 L13,15 Z" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M6,10 L4,7 M7,8 L6,5" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'mystic', name: 'Œil mystique', category: 'Fantastique',
    svg: '<path d="M2,12 Q7,5 12,5 Q17,5 22,12 Q17,19 12,19 Q7,19 2,12 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" stroke-width="0.7"/><line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" stroke-width="0.7"/><line x1="4" y1="4" x2="6.5" y2="7" stroke="currentColor" stroke-width="0.7"/><line x1="20" y1="4" x2="17.5" y2="7" stroke="currentColor" stroke-width="0.7"/><line x1="4" y1="20" x2="6.5" y2="17" stroke="currentColor" stroke-width="0.7"/><line x1="20" y1="20" x2="17.5" y2="17" stroke="currentColor" stroke-width="0.7"/>' },
  { id: 'magic', name: 'Cristal magique', category: 'Fantastique',
    svg: '<path d="M12,2 L8,8 L8,16 L12,22 L16,16 L16,8 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="0.8"/><line x1="8" y1="16" x2="16" y2="16" stroke="currentColor" stroke-width="0.8"/><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2,2"/><path d="M5,6 L7,7 M19,6 L17,7 M5,18 L7,17 M19,18 L17,17" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'skull', name: 'Crâne maudit', category: 'Fantastique',
    svg: '<path d="M7,14 Q4,12 4,8 Q4,3 12,3 Q20,3 20,8 Q20,12 17,14 L17,17 L7,17 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="9" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="15" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M10,13 L12,14 L14,13" fill="none" stroke="currentColor" stroke-width="0.9"/><line x1="9" y1="17" x2="9" y2="19" stroke="currentColor" stroke-width="0.8"/><line x1="12" y1="17" x2="12" y2="19" stroke="currentColor" stroke-width="0.8"/><line x1="15" y1="17" x2="15" y2="19" stroke="currentColor" stroke-width="0.8"/><path d="M5,20 L12,22 L19,20" fill="none" stroke="currentColor" stroke-width="1"/><path d="M12,22 L5,20 L19,20" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'treasure', name: 'Trésor', category: 'Fantastique',
    svg: '<rect x="4" y="10" width="16" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4,14 L20,14" stroke="currentColor" stroke-width="1"/><path d="M4,10 Q4,7 8,7 L16,7 Q20,7 20,10" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="12" width="4" height="4" rx="0.5" fill="none" stroke="currentColor" stroke-width="0.9"/><circle cx="12" cy="14" r="1" fill="currentColor"/><circle cx="7" cy="5" r="1.2" fill="none" stroke="currentColor" stroke-width="0.7"/><circle cx="17" cy="4" r="1" fill="none" stroke="currentColor" stroke-width="0.7"/><circle cx="12" cy="3" r="1.3" fill="none" stroke="currentColor" stroke-width="0.7"/>' },
];

function drawFantasySymbol(ctx, x, y, size, color, id) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  if (id === 'skull') {
    ctx.beginPath();
    ctx.moveTo(7, 14); ctx.quadraticCurveTo(4, 12, 4, 8);
    ctx.quadraticCurveTo(4, 3, 12, 3); ctx.quadraticCurveTo(20, 3, 20, 8);
    ctx.quadraticCurveTo(20, 12, 17, 14); ctx.lineTo(17, 17);
    ctx.lineTo(7, 17); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(9, 9, 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(15, 9, 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 13); ctx.lineTo(12, 14); ctx.lineTo(14, 13); ctx.stroke();
  } else if (id === 'dragon') {
    ctx.beginPath();
    ctx.moveTo(4, 18); ctx.quadraticCurveTo(3, 14, 6, 10);
    ctx.quadraticCurveTo(8, 7, 11, 6); ctx.lineTo(12, 4); ctx.lineTo(13, 6);
    ctx.quadraticCurveTo(16, 7, 18, 10); ctx.lineTo(20, 8); ctx.lineTo(19, 11);
    ctx.quadraticCurveTo(21, 14, 20, 17); ctx.lineTo(18, 16);
    ctx.quadraticCurveTo(16, 18, 13, 19); ctx.quadraticCurveTo(10, 19, 7, 17);
    ctx.lineTo(5, 19); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, 10, 1, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'magic') {
    ctx.beginPath();
    ctx.moveTo(12, 2); ctx.lineTo(8, 8); ctx.lineTo(8, 16);
    ctx.lineTo(12, 22); ctx.lineTo(16, 16); ctx.lineTo(16, 8); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(16, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(16, 16); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(12, 12, 5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export { FANTASY_SYMBOLS, drawFantasySymbol };
