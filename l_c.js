// =============================================================================
// Liste cochable avec recherche
// -----------------------------------------------------------------------------
// Construit dans un conteneur : un champ de recherche, la zone des valeurs
// cochées (toujours visible, sans défilement à faire pour la consulter), puis
// la liste défilante des cases à cocher.
//
// Le filtrage ne fait que MASQUER des lignes : les <input type="checkbox">
// restent dans le DOM avec leur état. Une valeur cochée le reste donc quand la
// recherche change ou s'efface, et le code qui lit la sélection
// (`input[type="checkbox"]:not(#tout-cocher-…)`) n'a rien à changer.
//
// POUR L'UTILISER AILLEURS (catégories, programmes…) :
//   construireListeCochable(document.querySelector('#categories-creation'),
//                           valeurs,
//                           { placeholder: 'Rechercher une catégorie',
//                             idToutCocher: 'tout-cocher-creation' });
// =============================================================================


// Comparaison insensible à la casse ET aux accents : « Electronique » doit
// trouver « Électronique ».
function listeNormaliser(texte) {
    return String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function construireListeCochable(conteneur, valeurs, options) {
    options = options || {};
    conteneur.classList.add('liste-cochable');
    conteneur.innerHTML = '';

    // --- Ligne de recherche + compteur ---
    const barre = document.createElement('div');
    barre.className = 'liste-recherche';

    const champ = document.createElement('input');
    champ.type = 'search';
    champ.className = 'liste-champ-recherche';
    champ.placeholder = options.placeholder || 'Rechercher';

    const compteur = document.createElement('span');
    compteur.className = 'liste-compteur';

    barre.append(champ, compteur);

    // --- Tout cocher : porte sur les lignes VISIBLES uniquement ---
    const actions = document.createElement('div');
    actions.className = 'liste-actions';
    const labelTout = document.createElement('label');
    const toutCocher = document.createElement('input');
    toutCocher.type = 'checkbox';
    if (options.idToutCocher) {
        toutCocher.id = options.idToutCocher;
        labelTout.setAttribute('for', options.idToutCocher);
    }
    labelTout.textContent = 'Tout cocher';
    actions.append(labelTout, toutCocher);

    // --- Zone des valeurs cochées, toujours visible ---
    const selection = document.createElement('div');
    selection.className = 'liste-selection';

    // --- Liste défilante ---
    const liste = document.createElement('div');
    liste.className = 'liste-options';

    const aucun = document.createElement('div');
    aucun.className = 'liste-aucun';
    aucun.textContent = 'Aucun résultat';
    aucun.hidden = true;

    valeurs.forEach(valeur => {
        const ligne = document.createElement('div');
        ligne.className = 'liste-option';

        const label = document.createElement('label');
        label.textContent = String(valeur);
        label.setAttribute('for', String(valeur));

        const case_ = document.createElement('input');
        case_.type = 'checkbox';
        case_.name = String(valeur);

        // Le label coche la case, comme dans la version d'origine.
        label.onclick = (e) => { e.preventDefault(); case_.checked = !case_.checked; rafraichirListeCochable(conteneur); };
        case_.onchange = () => rafraichirListeCochable(conteneur);

        ligne.append(label, case_);
        liste.append(ligne);
    });

    conteneur.append(barre, actions, selection, liste, aucun);

    champ.addEventListener('input', () => filtrerListeCochable(conteneur, champ.value));
    toutCocher.addEventListener('click', () => selectAllBox(toutCocher));

    rafraichirListeCochable(conteneur);
}

// Masque les lignes qui ne correspondent pas. Ne touche jamais aux cases.
function filtrerListeCochable(conteneur, recherche) {
    const terme = listeNormaliser(recherche || '').trim();
    let visibles = 0;

    conteneur.querySelectorAll('.liste-option').forEach(ligne => {
        const nom = ligne.querySelector('input').name;
        const correspond = !terme || listeNormaliser(nom).includes(terme);
        ligne.classList.toggle('masquee', !correspond);
        if (correspond) visibles++;
    });

    conteneur.querySelector('.liste-aucun').hidden = visibles > 0;
    majToutCocher(conteneur);
}

// Reconstruit les puces et le compteur d'après l'état réel des cases.
function rafraichirListeCochable(conteneur) {
    const selection = conteneur.querySelector('.liste-selection');
    const cochees = valeursCochees(conteneur);
    selection.innerHTML = '';

    cochees.forEach(valeur => {
        const puce = document.createElement('button');
        puce.type = 'button';          // sinon il soumettrait le formulaire
        puce.className = 'puce';
        puce.title = 'Retirer ' + valeur;
        puce.append(document.createTextNode(valeur));
        const croix = document.createElement('span');
        croix.className = 'puce-croix';
        croix.textContent = '×';
        puce.append(croix);
        // Décocher depuis la puce, sans avoir à retrouver la ligne dans la liste.
        puce.onclick = () => {
            const case_ = conteneur.querySelector(`.liste-option input[name="${CSS.escape(valeur)}"]`);
            if (case_) case_.checked = false;
            rafraichirListeCochable(conteneur);
        };
        selection.append(puce);
    });

    const total = conteneur.querySelectorAll('.liste-option input').length;
    conteneur.querySelector('.liste-compteur').textContent = `${cochees.length} / ${total}`;
    majToutCocher(conteneur);
}

// « Tout cocher » reflète l'état des lignes visibles.
function majToutCocher(conteneur) {
    const tout = conteneur.querySelector('.liste-actions input[type="checkbox"]');
    if (!tout) return;
    const visibles = casesVisibles(conteneur);
    const cochees = visibles.filter(c => c.checked).length;
    tout.checked = visibles.length > 0 && cochees === visibles.length;
    tout.indeterminate = cochees > 0 && cochees < visibles.length;
}

function casesVisibles(conteneur) {
    return Array.from(conteneur.querySelectorAll('.liste-option:not(.masquee) input[type="checkbox"]'));
}

function valeursCochees(conteneur) {
    return Array.from(conteneur.querySelectorAll('.liste-option input[type="checkbox"]'))
        .filter(c => c.checked)
        .map(c => c.name);
}

// Coche les valeurs données et décoche les autres. Utilisé à l'ouverture de la
// modale de modification.
function cocherValeurs(conteneur, valeurs) {
    const voulues = new Set((valeurs || []).map(String));
    conteneur.querySelectorAll('.liste-option input[type="checkbox"]').forEach(c => {
        c.checked = voulues.has(c.name);
    });
    rafraichirListeCochable(conteneur);
}

// Vide la recherche, décoche tout.
function reinitialiserListeCochable(conteneur) {
    const champ = conteneur.querySelector('.liste-champ-recherche');
    if (champ) champ.value = '';
    filtrerListeCochable(conteneur, '');
    cocherValeurs(conteneur, []);
}

// Conservé sous ce nom : appelé depuis les onclick du balisage existant.
// Porte désormais sur les lignes VISIBLES, pour que cocher tout après une
// recherche ne sélectionne que le résultat de cette recherche.
function selectAllBox(element) {
    const conteneur = element.closest('.liste-cochable');
    if (!conteneur) return;
    const visibles = casesVisibles(conteneur);
    const toutCoche = visibles.every(c => c.checked);
    visibles.forEach(c => { c.checked = !toutCoche; });
    rafraichirListeCochable(conteneur);
}
