/* A coller dans la console du navigateur, sur la page /categorie. */
(function () {
  const L = [];
  const dire = (k, v) => L.push(String(k).padEnd(34) + ' : ' + v);
  const oui = (b) => b ? 'OUI' : '*** NON ***';

  // --- 1. Quelles fonctions sont chargees ? -------------------------------
  L.push('--- versions chargees ---');
  dire('creerTableauDynamicAdmin', typeof creerTableauDynamicAdmin);
  dire('ajusterColonneListe', typeof ajusterColonneListe);
  dire('planifierAjustementListe', typeof planifierAjustementListe);
  dire('calibrerMesure  (commit f819bcd)', typeof calibrerMesure);
  dire('positionnerTooltip (commit 56452e8)', typeof positionnerTooltip);

  // --- 2. Le code de construction est-il le bon ? -------------------------
  L.push('');
  L.push('--- contenu de creerTableauDynamicAdmin ---');
  const src = (typeof creerTableauDynamicAdmin === 'function')
    ? creerTableauDynamicAdmin.toString() : '';
  dire("contient 'cellule-liste'", oui(src.includes('cellule-liste')));
  dire("contient 'texte-liste'", oui(src.includes('texte-liste')));
  dire("contient 'planifierAjustementListe'", oui(src.includes('planifierAjustementListe')));
  dire("contient .data('valeurs')", oui(src.includes("data('valeurs')") || src.includes('data("valeurs")')));
  dire("ANCIEN code : slice(0, 4)", (src.includes('slice(0, 4)') || src.includes('slice(0,4)')) ? '*** OUI, code obsolete ***' : 'non');
  dire("ANCIEN code : valeur.join", src.includes('valeur.join') ? '*** OUI, code obsolete ***' : 'non');

  // --- 3. Etat d'une cellule ----------------------------------------------
  const lire = (c) => (window.jQuery ? jQuery(c).data('valeurs') : null) || (c.__d && c.__d.valeurs) || [];
  const cells = Array.from(document.querySelectorAll('td.cellule-liste'));
  if (!cells.length) { console.log(L.join('\n')); return; }
  let td = cells[0], max = -1;
  cells.forEach(c => { const n = lire(c).length; if (n > max) { max = n; td = c; } });

  const spanTexte = td.querySelector('.texte-liste');
  const mesurerDom = (t) => {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    s.textContent = t; td.appendChild(s);
    const w = s.getBoundingClientRect().width; td.removeChild(s); return w;
  };

  L.push('');
  L.push('--- cellule la plus chargee ---');
  dire('nb de valeurs', max);
  dire('span .texte-liste present', oui(!!spanTexte));
  dire('enfants de la cellule', Array.from(td.children).map(e => e.tagName.toLowerCase() + '.' + e.className).join(' | ') || '(aucun)');
  const avant = (spanTexte || td).textContent;
  dire('largeur du texte AVANT', Math.round(mesurerDom(avant)) + ' px');

  // --- 4. On force la troncature ------------------------------------------
  L.push('');
  L.push('--- appel manuel de ajusterColonneListe() ---');
  const table = td.closest('table');
  const avantTable = table.offsetWidth;
  try {
    ajusterColonneListe();
    const apres = (td.querySelector('.texte-liste') || td).textContent;
    dire('largeur du texte APRES', Math.round(mesurerDom(apres)) + ' px');
    dire('table.offsetWidth avant -> apres', avantTable + ' -> ' + table.offsetWidth);
    dire('conteneur.clientWidth', table.parentElement.clientWidth);
    dire('le texte a change', oui(apres !== avant));
    dire('texte apres (100 premiers car.)', JSON.stringify(apres.slice(0, 100)));
  } catch (e) {
    dire('EXCEPTION', e && e.message);
    console.error(e);
  }

  console.log(L.join('\n'));
})();
