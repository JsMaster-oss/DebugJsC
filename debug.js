/* A coller dans la console du navigateur, sur la page /categorie. */
(function () {
  const L = [];
  const dire = (k, v) => L.push(String(k).padEnd(30) + ' : ' + v);

  // --- 0. Les cellules sont-elles trouvees, et par quel selecteur ? --------
  dire('td.cellule-liste (global)', document.querySelectorAll('td.cellule-liste').length);
  dire('.table-tbody td.cellule-liste', document.querySelectorAll('.table-tbody td.cellule-liste').length);
  dire('.tbody td.cellule-liste', document.querySelectorAll('.tbody td.cellule-liste').length);
  dire('classe du <tbody>', (document.querySelector('tbody') || {}).className);

  const lireValeurs = (c) => (window.jQuery ? jQuery(c).data('valeurs') : null) || (c.__d && c.__d.valeurs) || [];
  const cells = Array.from(document.querySelectorAll('td.cellule-liste'));
  if (!cells.length) { console.log(L.join('\n')); return; }

  // Cellule qui a le plus de valeurs
  let td = cells[0], max = -1;
  cells.forEach(c => {
    const n = lireValeurs(c).length;
    if (n > max) { max = n; td = c; }
  });
  const valeurs = lireValeurs(td);
  dire('valeurs sur la + grosse cellule', valeurs.length);
  dire('texte actuellement affiche', JSON.stringify((td.querySelector('.texte-liste') || {}).textContent));

  // --- 1. La police est-elle correctement transmise au canvas ? -----------
  const st = getComputedStyle(td);
  const raccourci = st.font;
  const longues = [st.fontStyle, st.fontWeight, st.fontSize, st.fontFamily].join(' ');
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = raccourci;   const luRaccourci = ctx.font;
  const ctx2 = document.createElement('canvas').getContext('2d');
  ctx2.font = longues;    const luLongues = ctx2.font;
  dire('font (raccourci CSS)', JSON.stringify(raccourci));
  dire('  -> relu par le canvas', JSON.stringify(luRaccourci));
  dire('font (proprietes longues)', JSON.stringify(longues));
  dire('  -> relu par le canvas', JSON.stringify(luLongues));

  // --- 2. Canvas vs rendu reel --------------------------------------------
  const mesurerDom = (texte) => {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    s.textContent = texte;
    td.appendChild(s);
    const w = s.getBoundingClientRect().width;
    td.removeChild(s);
    return w;
  };
  const REF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 / ...';
  const refCanvas = (ctx2.measureText(REF).width);
  const refDom = mesurerDom(REF);
  const ratio = refDom / refCanvas;
  dire('reference : canvas', refCanvas.toFixed(1) + ' px');
  dire('reference : rendu reel', refDom.toFixed(1) + ' px');
  dire('RATIO correction', ratio.toFixed(4) + (Math.abs(ratio - 1) > 0.02 ? '   <-- ECART' : '   (ok)'));

  const complet = valeurs.join(' / ');
  dire('texte complet : canvas', ctx2.measureText(complet).width.toFixed(1) + ' px');
  dire('texte complet : corrige', (ctx2.measureText(complet).width * ratio).toFixed(1) + ' px');
  dire('texte complet : rendu reel', mesurerDom(complet).toFixed(1) + ' px');

  // --- 3. Qui contraint vraiment la largeur ? -----------------------------
  const table = td.closest('table');
  dire('table.offsetWidth', table.offsetWidth);
  dire('table width (CSS)', getComputedStyle(table).width + '  layout=' + getComputedStyle(table).tableLayout);
  L.push('');
  L.push('  chaine des ancetres (du + proche au + loin)');
  L.push('  ' + 'element'.padEnd(34) + 'clientW  contenu  overflowX');
  for (let el = table.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    const s = getComputedStyle(el);
    const contenu = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    const nom = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
    L.push('  ' + nom.slice(0, 34).padEnd(34) +
           String(el.clientWidth).padStart(7) + String(Math.round(contenu)).padStart(9) +
           '  ' + s.overflowX + (table.offsetWidth > el.clientWidth ? '   <-- LE TABLEAU DEBORDE ICI' : ''));
  }

  // --- 4. Budget tel que le calcule le code -------------------------------
  const conteneur = table.parentElement;
  const paddings = parseFloat(st.paddingLeft) + parseFloat(st.paddingRight);
  const wImp = table.style.width;
  table.style.width = 'auto';
  const natTable = table.offsetWidth, natCell = td.clientWidth;
  table.style.width = wImp;
  L.push('');
  dire('largeur naturelle table', natTable);
  dire('largeur naturelle colonne', natCell);
  dire('besoin autres colonnes', natTable - natCell);
  dire('conteneur.clientWidth', conteneur.clientWidth);
  dire('BUDGET calcule', Math.max(0, conteneur.clientWidth - (natTable - natCell) - paddings));

  console.log(L.join('\n'));
})();
