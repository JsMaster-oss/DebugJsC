// --- Fonction qui permet de créer le tableau dynamique des pages liste d'admin --- //
function creerTableauDynamicAdmin(table, data, affichageSupprimer, affichageData, url) {
    const $row = $('<tr>');

    // Boucle d'initialisation des cellules
    $.each(data, function (cle, valeur) {
        let $cellData;
        if (cle != 'id') {
            if ($.isArray(valeur)) {
                // MODIF : plus de coupe arbitraire à 4 valeurs. La cellule est
                // rendue avec une seule valeur (= largeur plancher de la
                // colonne), la liste complète est mémorisée sur l'élément, et
                // ajusterColonneListe() décide ensuite combien de valeurs
                // tiennent réellement dans la place disponible.
                const spanTooltip = $('<span>').addClass("tooltiptextcustom");
                valeur.forEach(val => {
                    spanTooltip.append(String(val))
                    spanTooltip.append("<br>")
                });

                // 'tooltipcustom' est posée DES LA CONSTRUCTION et jamais
                // retirée : c'est elle qui déclenche la règle CSS
                // « .tooltipcustom .tooltiptextcustom { visibility: hidden;
                // position: absolute } ». Sans elle, le span du tooltip reste
                // dans le flux et empile ses valeurs (une par <br>), ce qui
                // casse la hauteur des lignes et fausse la mesure de largeur.
                $cellData = $('<td>').addClass('tooltipcustom cellule-liste').data('valeurs', valeur);
                // Le tooltip reste le PREMIER span de la cellule : le handler
                // 'mouseover' plus bas fait un querySelector('span').
                $cellData.append(spanTooltip);
                $cellData.append($('<span>').addClass('texte-liste').text(valeur.length ? String(valeur[0]) : ''));
                planifierAjustementListe();
            } else if (cle == "state") {
                $cellData = $('<td>');
                let $checkbox;
                let $label;
                $label = $('<label>').attr('for', 'switch-statut-' + data['id']).addClass('toggle-switch-label');
                $checkbox = $('<input>').attr('id', 'switch-statut-' + data['id']).attr('type', 'checkbox').addClass('toggle-switch-input');
                valeur == "Activé" ? $checkbox.prop("checked", true) : $checkbox.prop("checked", false);
                $cellData.append($checkbox, $label);
            } else {
                $cellData = $('<td>').text(valeur);
            }
            $row.append($cellData);
        }
    });

    const $cellAction = $('<td>');
    const $actionDiv = $('<div>').attr('id', 'action');
    const listInitForm = {'data': data, 'url': url['recuperer']};
    const listInitFormJSON = JSON.stringify(listInitForm);
    const listInitFormJSONSuppr = JSON.parse(listInitFormJSON);

    // Initialisation du bouton de modification d'une tache
    const $modifierButton = $('<button>').addClass('action-button edit-line edit-btn').attr('type', 'button').attr('data', listInitFormJSON).attr('aria-label', 'Modifier').attr('title', 'Modifier');
    const $modifierIcon = $('<i>').addClass('fa fa-pencil-square-o');
    $modifierButton.append($modifierIcon);
    $actionDiv.append($modifierButton);

    // Initialisation du bouton de suppression d'une tache
    const $supprimerButton = $('<button>').addClass('action-button delete-line delete-btn').attr('type', 'button').attr('data', listInitFormJSON).attr('aria-label', 'Supprimer').attr('title', 'Supprimer');

    $supprimerButton.attr('data-modal-display', `${listInitFormJSONSuppr['data']['category']}`);

    const $supprimerIcon = $('<i>').addClass('fa fa-trash');

    $supprimerButton.append($supprimerIcon);
    $actionDiv.append($supprimerButton);

    $cellAction.append($actionDiv);
    $row.append($cellAction);
    table.append($row);
}

// ---------------------------------------------------------------------------
// Colonne « liste » (Sous-Catégories Technologiques) : troncature dynamique
// ---------------------------------------------------------------------------
// Avant : la cellule affichait au plus 4 valeurs, quelle que soit leur
// longueur — ce qui débordait horizontalement sur des libellés longs et
// gâchait de la place sur des libellés courts.
// Maintenant : on mesure la largeur réellement disponible pour la colonne, on
// affiche autant de valeurs qu'elle peut en contenir, puis " ...". La liste
// complète reste consultable au survol via .tooltiptextcustom.

const LISTE_SEPARATEUR = ' / ';
const LISTE_SUFFIXE = ' ...';

// Temps laissé pour rejoindre le tooltip à la souris après avoir quitté la
// cellule. À 0 le délai est désactivé : le tooltip se ferme dès la sortie,
// comme avec le :hover CSS seul. Passer à 250 pour le réactiver.
const DELAI_GRACE_TOOLTIP = 0;
let tooltipMasquage = null;   // identifiant du setTimeout de masquage en cours
let tooltipAffiche = null;    // tooltip actuellement ouvert, pour ne pas le repositionner

// Canvas réutilisé pour mesurer du texte sans rien insérer dans le DOM.
let listeContexteMesure = null;
function listeMesurerTexte(texte, police) {
    if (!listeContexteMesure) {
        listeContexteMesure = document.createElement('canvas').getContext('2d');
    }
    listeContexteMesure.font = police;
    return listeContexteMesure.measureText(texte).width;
}

// displayTable() appelle creerTableauDynamicAdmin une fois par ligne : on ne
// veut qu'un seul passage d'ajustement pour tout le lot.
let listeAjustementPlanifie = false;
function planifierAjustementListe() {
    if (listeAjustementPlanifie) return;
    listeAjustementPlanifie = true;
    // requestAnimationFrame : toutes les lignes sont posées, la géométrie est
    // mesurable, et on reste avant le premier affichage (pas de clignotement).
    requestAnimationFrame(function () {
        listeAjustementPlanifie = false;
        ajusterColonneListe();
    });
}

// Affiche le tooltip d'une cellule, ancré à la position du pointeur.
function afficherTooltipCellule(cellule, x, y) {
    const tooltip = cellule.querySelector('.tooltiptextcustom');
    if (!tooltip) return;
    clearTimeout(tooltipMasquage);
    // On ne repositionne qu'à l'entrée, pas à chaque mouvement : un tooltip
    // qui suit le curseur fuit devant lui dès qu'on cherche à l'atteindre.
    if (tooltipAffiche !== tooltip) {
        positionnerTooltip(cellule, tooltip, x, y);
        tooltipAffiche = tooltip;
    }
    tooltip.style.visibility = 'visible';
    tooltip.style.opacity = '1';
}

// Programme le masquage après le délai de grâce. On ne force jamais le
// masquage : on retire les styles en ligne pour rendre la main au CSS
// (.tooltipcustom:hover), de sorte que les autres pages d'administration
// continuent de fonctionner au :hover seul.
function programmerMasquageTooltip(cellule) {
    const tooltip = cellule.querySelector('.tooltiptextcustom');
    if (!tooltip) return;
    clearTimeout(tooltipMasquage);

    const masquer = function () {
        tooltip.style.visibility = '';
        tooltip.style.opacity = '';
        if (tooltipAffiche === tooltip) tooltipAffiche = null;
    };

    // Délai désactivé : on masque tout de suite, sans passer par un timer.
    if (DELAI_GRACE_TOOLTIP <= 0) {
        masquer();
        return;
    }
    tooltipMasquage = setTimeout(masquer, DELAI_GRACE_TOOLTIP);
}

// Positionne le tooltip en coordonnées viewport.
//
// Pourquoi remplacer la bascule .toTop :
//  - la cellule vit dans .tableau-deroulant, qui défile ; un descendant en
//    position:absolute y est rogné dès qu'il sort de la zone visible ;
//  - `bottom: 100%` suppose un bloc conteneur positionné sur la cellule ;
//  - `translateY(-20rem)` suppose un tooltip haut d'exactement 20rem, alors
//    que sa hauteur dépend du nombre de valeurs.
// En position:fixed avec des coordonnées calculées, aucune de ces hypothèses
// n'est nécessaire : plus de rognage, et le basculement au-dessus/au-dessous
// se décide sur la hauteur réelle du tooltip.
function positionnerTooltip(cellule, tooltip, pointeurX, pointeurY) {
    // Marge vis-a-vis des bords de la fenetre uniquement. Entre la cellule et
    // le tooltip il ne doit y avoir AUCUN espace : le tooltip est un
    // descendant DOM de la cellule, donc le :hover de celle-ci reste vrai tant
    // que le pointeur est sur l'un ou sur l'autre — mais un trou, meme de
    // quelques pixels, suffit a le perdre en cours de route et a faire
    // disparaitre le tooltip avant qu'on l'atteigne.
    const MARGE = 4;

    // Remise à zéro avant mesure (la classe .toTop n'est plus utilisée).
    tooltip.classList.remove('toTop');
    tooltip.style.position = 'fixed';
    tooltip.style.transform = 'none';
    tooltip.style.bottom = 'auto';
    tooltip.style.right = 'auto';
    tooltip.style.top = '0px';
    tooltip.style.left = '0px';
    // En position:fixed, le z-index se compare à toute la page et non plus au
    // seul tableau : on passe au-dessus du reste de l'interface.
    tooltip.style.zIndex = '1000';

    const cell = cellule.getBoundingClientRect();
    const tip = tooltip.getBoundingClientRect();

    // Ancré sur le pointeur quand on connaît sa position : le tooltip
    // apparaît là où est la souris, et non sur le bord gauche d'une colonne
    // qui fait plus de mille pixels de large. À défaut, repli sur la cellule,
    // avec un chevauchement d'un pixel (accoler ne suffit pas : les
    // rectangles ont des coordonnées fractionnaires et l'arrondi final
    // recrée un jeu d'un pixel).
    const DECALAGE = 12;                 // petit écart pour ne pas masquer le texte visé
    const CHEVAUCHEMENT = 1;
    const aPointeur = (typeof pointeurX === 'number' && typeof pointeurY === 'number');

    let top = aPointeur ? pointeurY + DECALAGE : cell.bottom - CHEVAUCHEMENT;
    if (top + tip.height > window.innerHeight - MARGE) {
        // Pas la place en dessous : on bascule au-dessus.
        top = aPointeur ? pointeurY - tip.height - DECALAGE : cell.top - tip.height + CHEVAUCHEMENT;
    }
    top = Math.max(MARGE, Math.min(top, window.innerHeight - tip.height - MARGE));

    const vise = aPointeur ? pointeurX - 24 : cell.left;
    const left = Math.max(MARGE, Math.min(vise, window.innerWidth - tip.width - MARGE));

    tooltip.style.top = Math.round(top) + 'px';
    tooltip.style.left = Math.round(left) + 'px';
}

function ajusterColonneListe() {
    // Sélecteur volontairement minimal : la classe du <tbody> n'intervient
    // pas. Une dépendance à .table-tbody a déjà fait sortir la fonction
    // immédiatement (0 cellule trouvée, aucune troncature, aucune erreur) ;
    // 'td.cellule-liste' est posée par creerTableauDynamicAdmin et suffit.
    const $cellules = $('td.cellule-liste');
    if ($cellules.length === 0) {
        // On n'arrive ici que si creerTableauDynamicAdmin a construit au moins
        // une cellule de liste (c'est lui qui déclenche ce passage) : zéro
        // cellule trouvée signale donc un problème, pas un cas normal.
        console.warn('[colonne liste] aucune cellule td.cellule-liste trouvée : la troncature ne sera pas appliquée.');
        return;
    }

    const premiere = $cellules[0];
    const table = premiere.closest('table');
    const conteneur = table.parentElement;   // .tableau-deroulant

    // 1. Budget de la colonne, calculé une seule fois : toutes les cellules
    //    d'une colonne partagent la même largeur.
    //
    //    La mesure est prise à largeur NATURELLE du tableau. Si le tableau
    //    porte une largeur imposée (width: 100%), le navigateur répartit
    //    l'espace libre entre les colonnes : la largeur rendue ne reflète plus
    //    le minimum dont chaque colonne a besoin, et une colonne « liste » dont
    //    la plupart des cellules sont vides se retrouve avec une part
    //    ridicule. On neutralise donc cette largeur le temps de la mesure.
    const style = window.getComputedStyle(premiere);
    const paddings = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

    const largeurImposee = table.style.width;
    table.style.width = 'auto';
    const largeurNaturelleTable = table.offsetWidth;    // force le recalcul
    const largeurNaturelleCellule = premiere.clientWidth;
    table.style.width = largeurImposee;

    //    budget = place du conteneur - ce dont les AUTRES colonnes ont besoin.
    const besoinAutresColonnes = largeurNaturelleTable - largeurNaturelleCellule;

    // 2. Police de mesure, reconstruite depuis les propriétés longues plutôt
    //    que depuis le raccourci `font` : le canvas refuse certaines valeurs
    //    du raccourci et retombe alors silencieusement sur « 10px sans-serif »,
    //    ce qui sous-estime largement les largeurs — toutes les valeurs
    //    semblent tenir et le tableau déborde.
    const police = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');

    //    Et on vérifie la mesure contre le rendu réel : si une police web
    //    n'est pas encore chargée, ou si le canvas a quand même utilisé autre
    //    chose, le rapport corrige l'écart.
    const correction = calibrerMesure(premiere, police);
    const mesurer = (texte) => listeMesurerTexte(texte, police) * correction;

    // 3. Remplissage des cellules pour un budget donné.
    const appliquer = (budget) => $cellules.each(function () {
        const valeurs = $(this).data('valeurs') || [];
        const $texte = $(this).children('.texte-liste');

        // Garde-fou : si la cellule n'a pas été construite par la version à
        // jour de creerTableauDynamicAdmin, on le dit au lieu d'échouer en
        // silence (le symptôme serait une cellule figée sur sa 1re valeur).
        if (!$texte.length) {
            console.warn('[colonne liste] span .texte-liste introuvable sur une cellule : categorie.js n est pas a jour ?');
            return;
        }

        let rendu = '';
        let affichees = 0;
        for (let i = 0; i < valeurs.length; i++) {
            const essai = (i === 0) ? String(valeurs[i]) : rendu + LISTE_SEPARATEUR + valeurs[i];
            // S'il reste des valeurs derrière, il faut aussi la place du " ...".
            const suffixe = (i < valeurs.length - 1) ? LISTE_SUFFIXE : '';
            // i > 0 : on affiche toujours au moins une valeur, même si elle est
            // à elle seule plus large que la colonne (cas pathologique).
            if (i > 0 && mesurer(essai + suffixe) > budget) break;
            rendu = essai;
            affichees++;
        }

        let tronque = affichees < valeurs.length;
        let texte = rendu + (tronque ? LISTE_SUFFIXE : '');

        // Cas limite : la première valeur est à elle seule plus large que la
        // colonne. On rogne alors le libellé lui-même (recherche dichotomique
        // du nombre de caractères qui tiennent) pour ne pas élargir le tableau.
        if (rendu && mesurer(texte) > budget) {
            let bas = 1, haut = rendu.length;
            while (bas < haut) {
                const milieu = Math.ceil((bas + haut) / 2);
                if (mesurer(rendu.slice(0, milieu) + LISTE_SUFFIXE) <= budget) {
                    bas = milieu;
                } else {
                    haut = milieu - 1;
                }
            }
            texte = rendu.slice(0, bas) + LISTE_SUFFIXE;
            tronque = true;
        }

        $texte.text(texte);
        // Le tooltip ne sert que si des valeurs sont réellement masquées. On
        // agit sur le span lui-même (display) et non sur la classe du <td>,
        // qui doit rester en place pour que le CSS continue de le sortir du
        // flux (cf. commentaire dans creerTableauDynamicAdmin).
        $(this).children('.tooltiptextcustom').css('display', tronque ? '' : 'none');
    });

    // 4. Filet de sécurité : on mesure le résultat réel et, s'il déborde
    //    encore, on resserre le budget d'autant et on recommence. Le texte ne
    //    peut que raccourcir, donc la boucle converge. C'est ce qui garantit
    //    l'absence d'overflow-x même si une mesure reste imparfaite (bordures,
    //    letter-spacing, arrondis sub-pixel).
    let budget = Math.max(0, conteneur.clientWidth - besoinAutresColonnes - paddings);
    for (let essai = 0; essai < 4; essai++) {
        appliquer(budget);
        const debordement = table.offsetWidth - conteneur.clientWidth;
        if (debordement <= 0) break;
        budget = Math.max(0, budget - debordement);
    }
}

// Compare une mesure canvas à la largeur réellement rendue par le navigateur
// et renvoie le rapport à appliquer aux mesures suivantes. La sonde hérite de
// la police de la cellule et reste hors flux, donc n'affecte pas la mise en
// page.
function calibrerMesure(cellule, police) {
    const REFERENCE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 / ...';
    const sonde = document.createElement('span');
    sonde.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    sonde.textContent = REFERENCE;
    cellule.appendChild(sonde);
    const largeurRendue = sonde.getBoundingClientRect().width;
    cellule.removeChild(sonde);

    const largeurCanvas = listeMesurerTexte(REFERENCE, police);
    if (!largeurRendue || !largeurCanvas) return 1;
    return largeurRendue / largeurCanvas;
}

// Modification du statut d'une ligne
function modifierStatut(urlModif, id, statutIsActif) {
    let data_json = JSON.stringify({ 'statut': statutIsActif, 'action': 'modifier_statut' });

    $.ajax({
        type: 'POST',
        contentType: 'application/json',
        url: urlModif + id,
        data: data_json,
        success: (response) => {
            if (response["state"] == false) {
                let errorModal = document.getElementById("error-modal");
                errorModal.showModal();
            }
        },
        error: (error) => {
            console.error(error);
        }
    });
}

$(document).ready(function() {
    // Eventlistener pour display la modal de suppression
    $('.table-tbody').on('click', '.delete-line', function () {
        let modal = document.getElementById('deletion-modal');
        let form = modal.querySelector('form');
        let initData = JSON.parse(this.getAttribute('data'));
        data = initData["data"];
        form.setAttribute('id_categorie', data["id"]);

        let span = modal.querySelector('#categoryName');
        span.innerHTML = data["category"];

        modal.showModal();
    });

    // Eventlistener pour display la modal de modification
    $('.table-tbody').on('click', '.edit-line', function (event) {
        let modal = document.getElementById('modify-modal');
        let initData = JSON.parse(this.getAttribute('data'));
        data = initData["data"];
        let form = modal.querySelector('form');
        form.setAttribute('id_categorie', data["id"]);

        let category = form.querySelector('#category');
        category.value = data["category"];

        let check = form.querySelector('#state');
        let toggleSwitch = event.target.parentNode.parentNode.parentNode.parentNode.querySelector('.toggle-switch-input').checked;
        check.checked = toggleSwitch == true ? false : true;

        // CORRECTION : Utiliser les nouveaux IDs uniques
        let subcategory_group = $('#modify-modal #subcategory-group-modify');  // ✅ ID unique
        subcategory_group.attr('hidden', false);

        if (data["subcategories"] != "") {
            let checkboxGroup = $('#modify-modal #subcategory-group-modify input[type="checkbox"]:not(#tout-cocher-modify)');  // ✅

            for (const box of checkboxGroup) {
                data["subcategories"].forEach(subcategory => {
                    if (box.name == subcategory) {
                        box.checked = true;
                    }
                });
            }
        }

        modal.showModal();
    });

    // Logique de fermeture de la modal
    $('#error-modal button.btn-annuler').on('click', function () {
        let modal = document.getElementById('error-modal');
        location.reload();
        modal.close();
    });

    // Logique de submit du formulaire d'ajout
    $('#creation-modal form').on('submit', function (event) {
        event.preventDefault();
        let modal = document.getElementById('creation-modal');
        let category = modal.querySelector('#category').value;
        let subcategories_list = [];

        let checkboxGroup = $('#creation-modal #subcategory-group-creation input[type="checkbox"]:not(#tout-cocher-creation)');  // ✅

        for (const box of checkboxGroup) {
            if (box.checked) {
                subcategories_list.push(box.name);
            }
        }

        let data = {"category": category, "subcategories_list": subcategories_list};

        $.ajax({
            url: '/ajouter_categorie',
            method: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: (response) => {
                if (response.success) {
                    location.reload();
                    modal.close();
                } else {
                    // Affichage de l'erreur dans la modale
                    let errorModal = document.getElementById("error-modal");
                    let errorMessage = document.getElementById("erreurSupprimer");

                    const errorLines = response.details.map(line =>
                        `<div class="error-line">${line}</div>`
                    ).join('');

                    errorMessage.innerHTML = `
                        <div class="error-header">
                            <strong>${response.error}</strong>
                        </div>
                        <div class="error-body">
                            ${errorLines}
                        </div>
                    `;

                    errorModal.showModal();
                }
            },
            error: () => {
                console.log("Une erreur s\'est produite lors de l'envoi de la création de la catégorie technologique");
            }
        });
    });

    $('#deletion-modal form').on('submit', function (event) {
        event.preventDefault();
        let modal = document.getElementById('deletion-modal');
        let form = modal.querySelector('form');
        let id = form.getAttribute('id_categorie');
        let data = {"state": "Supprimé"};

        $.ajax({
            url: '/supprimer_categorie/' + String(id),
            method: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify(data),
            complete: function(xhr) {
                modal.close();

                try {
                    const response = JSON.parse(xhr.responseText);

                    if (response && response.error) {
                        console.log(response)
                        let errorModal = document.getElementById("error-modal");
                        let errorMessage = document.getElementById("erreurSupprimer");

                        // Formatage adapté au nouveau message
                        const errorLines = response.details.map(line =>
                            `<div class="error-line">${line}</div>`
                        ).join('');

                        errorMessage.innerHTML = `
                            <div class="error-header">
                                <strong>${response.error}</strong>
                            </div>
                            <div class="error-body">
                                ${errorLines}
                            </div>
                        `;

                        errorModal.showModal();
                    }

                    if (response.success) {
                        location.reload();
                        modal.close();
                    }

                } catch (e) {
                    console.log("JSON parse error:", e);
                    alert("Erreur de traitement de la réponse.");
                }
            }
        });
    });

    // Affichage du tooltip. On utilise `this` (la cellule, cible de la
    // délégation) et non event.target : depuis que le texte visible est dans
    // un <span class="texte-liste">, event.target vaut ce span dès qu'on
    // survole le texte.
    //
    // Le CSS seul (.tooltipcustom:hover) ferme le tooltip dès que le pointeur
    // quitte la cellule, ce qui le rend impossible à atteindre pour le faire
    // défiler. On double donc le :hover d'un pilotage JS : styles en ligne
    // pour maintenir l'affichage, puis retrait de ces styles après un délai
    // de grâce. On ne force jamais le masquage, on rend la main au CSS — les
    // autres pages d'administration continuent de marcher au :hover seul.
    $('.table-tbody').on('mouseenter', '.tooltipcustom', function (event) {
        afficherTooltipCellule(this, event.clientX, event.clientY);
    });

    $('.table-tbody').on('mouseleave', '.tooltipcustom', function () {
        programmerMasquageTooltip(this);
    });

    // CORRECTIF : ce handler faisait doublon avec celui d'administration.js, qui
    // ferme déjà #modify-modal au clic sur .btn-annuler. On n'écoute plus le
    // bouton mais l'évenement 'close' natif de <dialog> : le formulaire est
    // réinitialisé quelle que soit la façon dont la modale se ferme (bouton
    // Annuler, touche Échap), ce qui corrige au passage les champs restés
    // remplis après une fermeture au clavier.
    $('#modify-modal').on('close', function () {
        resetModifyModal();
    });

    $('#modify-modal form').on('submit', function (event) {
        event.preventDefault();
        let modal = document.getElementById('modify-modal');
        let form = modal.querySelector('form');
        let id = form.getAttribute('id_categorie');
        let category = modal.querySelector('#category').value;
        let subcategories_list = [];

        let checkboxGroup = $('#modify-modal #subcategory-group-modify input[type="checkbox"]:not(#tout-cocher-modify)');
        for (const box of checkboxGroup) {
            if (box.checked) {
                subcategories_list.push(box.name);
            }
        }

        let state = modal.querySelector('#state').checked;

        let data = {
            "category": category,
            "state": !state,
            "subcategories_list": subcategories_list
        };

        $.ajax({
            url: '/modifier_categorie/' + String(id),
            method: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: (response) => {
                location.reload();
                modal.close();
            },
            error: (xhr) => {
                console.log("Une erreur s'est produite lors de l'envoi de la modification de la catégorie technologique");

                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response && response.error) {
                        console.log(response)
                        let errorModal = document.getElementById("error-modal");
                        let errorMessage = document.getElementById("erreurSupprimer");

                        // Formatage adapté au nouveau message
                        const errorLines = response.details.map(line =>
                            `<div class="error-line">${line}</div>`
                        ).join('');

                        errorMessage.innerHTML = `
                            <div class="error-header">
                                <strong>${response.error}</strong>
                            </div>
                            <div class="error-body">
                                ${errorLines}
                            </div>
                        `;

                        errorModal.showModal();
                    }
                } catch (e) {
                    console.log("Impossible de parser la réponse");
                }
            }
        });
    });

    createSubcategoryList();
});

function createSubcategoryList() {
    // Vider les sous-catégories existantes avant de les recréer
    let creationDivs = document.querySelectorAll('#subcategories-creation');
    let modifyDivs = document.querySelectorAll('#subcategories-modify');

    creationDivs.forEach(div => div.innerHTML = '<div><label for="tout-cocher-creation">Tout Cocher</label><input type="checkbox" id="tout-cocher-creation" onclick="selectAllBox(this)"></div><hr>');
    modifyDivs.forEach(div => div.innerHTML = '<div><label for="tout-cocher-modify">Tout Cocher</label><input type="checkbox" id="tout-cocher-modify" onclick="selectAllBox(this)"></div><hr>');

    $.ajax({
        url: '/get_subcategories',
        method: 'GET',
        dataType: 'json',
        success: (response) => {
            response["subcategories_list"].forEach(subcategory => {
                // Créer pour la modale de création
                creationDivs.forEach(div => {
                    let section = document.createElement("div");
                    let label = document.createElement("label");
                    label.setAttribute('for', String(subcategory));
                    label.innerHTML = String(subcategory);
                    label.onclick = function() {
                        let box = this.parentNode.querySelector('input');
                        box.checked = !box.checked;
                    };
                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox"
                    checkbox.name = String(subcategory);
                    section.appendChild(label);
                    section.appendChild(checkbox);
                    const toutCocher = div.querySelector('#tout-cocher-creation');
                    if (toutCocher) {
                        toutCocher.onclick = function() {
                            selectAllBox(this);
                        };
                    }
                    div.appendChild(section);
                });

                // Créer pour la modale de modification
                modifyDivs.forEach(div => {
                    let section = document.createElement("div");
                    let label = document.createElement("label");
                    label.setAttribute('for', String(subcategory));
                    label.innerHTML = String(subcategory);
                    label.onclick = function() {
                        let box = this.parentNode.querySelector('input');
                        box.checked = !box.checked;
                    };
                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox"
                    checkbox.name = String(subcategory);
                    section.appendChild(label);
                    section.appendChild(checkbox);
                    const toutCocher = div.querySelector('#tout-cocher-modify');
                    if (toutCocher) {
                        toutCocher.onclick = function() {
                            selectAllBox(this);
                        };
                    }
                    div.appendChild(section);
                });
            });
        }
    });
}

function resetModifyModal() {
    let modal = document.getElementById('modify-modal');
    let form = modal.querySelector('form');

    // Réinitialiser les champs
    let categoryInput = form.querySelector('#category');
    categoryInput.value = '';

    let stateCheckbox = form.querySelector('#state');
    stateCheckbox.checked = false;

    // Réinitialiser les sous-catégories
    let subcategoryGroup = form.querySelector('#subcategory-group-modify');
    let checkboxes = subcategoryGroup.querySelectorAll('input[type="checkbox"]:not(#tout-cocher-modify)');
    checkboxes.forEach(checkbox => checkbox.checked = false);

    // Réinitialiser le "Tout Cocher"
    let selectAll = form.querySelector('#tout-cocher-modify');
    selectAll.checked = false;
}

function selectAllBox(element) {
    const isCreation = element.id === 'tout-cocher-creation';
    const modalId = isCreation ? 'creation-modal' : 'modify-modal';

    // Sélectionner le bon groupe de checkboxes
    const checkboxGroup = $(`#${modalId} #subcategory-group-${isCreation ? 'creation' : 'modify'} input[type="checkbox"]:not(#${element.id})`);

    // Cocher/décocher toutes les cases
    checkboxGroup.each(function() {
        this.checked = element.checked;
    });
}
