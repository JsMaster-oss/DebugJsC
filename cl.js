// =============================================================================
// Colonne « liste » des tableaux d'administration
// -----------------------------------------------------------------------------
// Une cellule qui porte plusieurs valeurs (sous-catégories, programmes...)
// affiche autant de valeurs que la colonne peut réellement en contenir, puis
// « ... ». La liste complète reste accessible au survol.
//
// POUR L'UTILISER SUR UNE AUTRE PAGE D'ADMINISTRATION :
//   1. charger ce fichier avant le JS de la page, dans le {% block head %} :
//        <script src=".../administration/colonne-liste.js" defer></script>
//   2. dans creerTableauDynamicAdmin, pour une cellule qui porte un tableau :
//        $cellData = creerCelluleListe(valeur);
// C'est tout : les survols sont câblés en délégation sur le document, et le
// recalcul est déclenché automatiquement à chaque construction de cellule.
//
// Prérequis CSS (administration.css) :
//   td.cellule-liste { white-space: nowrap; position: relative; }
//   .tooltipcustom .tooltiptextcustom { ... }   (déjà présent)
// =============================================================================

const LISTE_SEPARATEUR = ' / ';
const LISTE_SUFFIXE = ' ...';

// Délai avant fermeture du tooltip à la sortie de la cellule, en ms.
// 0 = fermeture immédiate. 250 laisse le temps d'aller se poser dessus.
const DELAI_GRACE_TOOLTIP = 0;


// --- Construction de la cellule ----------------------------------------------

// Construit le <td> d'une colonne liste. Le texte visible n'est posé qu'à une
// valeur : ajusterColonneListe() décide ensuite combien en tiennent.
function creerCelluleListe(valeurs) {
    const tooltip = $('<span>').addClass('tooltiptextcustom');
    valeurs.forEach(v => {
        tooltip.append(String(v));
        tooltip.append('<br>');
    });

    // 'tooltipcustom' doit être là dès la construction : c'est elle qui active
    // la règle CSS sortant le tooltip du flux. Sans elle il empile ses valeurs
    // dans la cellule, casse la hauteur des lignes et fausse les mesures.
    const $td = $('<td>').addClass('tooltipcustom cellule-liste').data('valeurs', valeurs);
    $td.append(tooltip);   // doit rester le PREMIER enfant
    $td.append($('<span>').addClass('texte-liste').text(valeurs.length ? String(valeurs[0]) : ''));

    planifierAjustementListe();
    return $td;
}


// --- Mesure de texte ----------------------------------------------------------

let listeContexteMesure = null;

function listeMesurerTexte(texte, police) {
    if (!listeContexteMesure) {
        listeContexteMesure = document.createElement('canvas').getContext('2d');
    }
    listeContexteMesure.font = police;
    return listeContexteMesure.measureText(texte).width;
}

// Rapport entre la largeur rendue par le navigateur et la mesure canvas.
// Corrige une police web pas encore chargée, ou un canvas qui a refusé la
// police et est retombé sur « 10px sans-serif ».
function calibrerMesure(cellule, police) {
    const REFERENCE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 / ...';
    const sonde = document.createElement('span');
    sonde.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    sonde.textContent = REFERENCE;
    cellule.appendChild(sonde);
    const rendue = sonde.getBoundingClientRect().width;
    cellule.removeChild(sonde);

    const canvas = listeMesurerTexte(REFERENCE, police);
    return (rendue && canvas) ? rendue / canvas : 1;
}


// --- Ajustement de la colonne -------------------------------------------------

// Un seul passage par lot de lignes : displayTable() construit N cellules.
let listeAjustementPlanifie = false;

function planifierAjustementListe() {
    if (listeAjustementPlanifie) return;
    listeAjustementPlanifie = true;
    // rAF : les lignes sont posées, la géométrie est mesurable, et on reste
    // avant le premier affichage.
    requestAnimationFrame(function () {
        listeAjustementPlanifie = false;
        ajusterColonneListe();
    });
}

function ajusterColonneListe() {
    // Pas de préfixe sur le sélecteur : la classe du <tbody> varie d'une page
    // à l'autre et une dépendance à .table-tbody ferait sortir la fonction
    // sans erreur ni effet visible.
    const $cellules = $('td.cellule-liste');
    if ($cellules.length === 0) {
        console.warn('[colonne liste] aucune cellule td.cellule-liste : la troncature ne sera pas appliquée.');
        return;
    }

    const premiere = $cellules[0];
    const table = premiere.closest('table');
    const conteneur = table.parentElement;
    const style = window.getComputedStyle(premiere);
    const paddings = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

    // Mesure à largeur NATURELLE : si le tableau porte une largeur imposée
    // (width: 100%), le navigateur répartit l'espace libre entre les colonnes
    // et la largeur rendue ne reflète plus le minimum de chacune.
    const largeurImposee = table.style.width;
    table.style.width = 'auto';
    const natTable = table.offsetWidth;        // force le recalcul
    const natCellule = premiere.clientWidth;
    table.style.width = largeurImposee;
    const besoinAutresColonnes = natTable - natCellule;

    // Police reconstruite depuis les propriétés longues : le canvas refuse
    // certaines valeurs du raccourci `font` et retombe alors silencieusement
    // sur « 10px sans-serif », ce qui sous-estime largement les largeurs.
    const police = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
    const correction = calibrerMesure(premiere, police);
    const mesurer = (texte) => listeMesurerTexte(texte, police) * correction;

    // Remplit chaque cellule pour un budget donné. Toutes les cellules d'une
    // colonne partagent la même largeur, donc le budget est commun.
    const appliquer = (budget) => $cellules.each(function () {
        const valeurs = $(this).data('valeurs') || [];
        const $texte = $(this).children('.texte-liste');
        if (!$texte.length) {
            console.warn('[colonne liste] span .texte-liste introuvable : cellule construite hors de creerCelluleListe ?');
            return;
        }

        let rendu = '';
        let affichees = 0;
        for (let i = 0; i < valeurs.length; i++) {
            const essai = (i === 0) ? String(valeurs[i]) : rendu + LISTE_SEPARATEUR + valeurs[i];
            const suffixe = (i < valeurs.length - 1) ? LISTE_SUFFIXE : '';
            // i > 0 : on affiche toujours au moins une valeur.
            if (i > 0 && mesurer(essai + suffixe) > budget) break;
            rendu = essai;
            affichees++;
        }

        let tronque = affichees < valeurs.length;
        let texte = rendu + (tronque ? LISTE_SUFFIXE : '');

        // Une seule valeur, plus large que la colonne : on rogne le libellé
        // (dichotomie sur le nombre de caractères qui tiennent).
        if (rendu && mesurer(texte) > budget) {
            let bas = 1, haut = rendu.length;
            while (bas < haut) {
                const milieu = Math.ceil((bas + haut) / 2);
                if (mesurer(rendu.slice(0, milieu) + LISTE_SUFFIXE) <= budget) bas = milieu;
                else haut = milieu - 1;
            }
            texte = rendu.slice(0, bas) + LISTE_SUFFIXE;
            tronque = true;
        }

        $texte.text(texte);
        // Tooltip inutile si rien n'est masqué. On agit sur le span, pas sur la
        // classe du <td>, qui doit rester pour le sortir du flux.
        $(this).children('.tooltiptextcustom').css('display', tronque ? '' : 'none');
    });

    // Filet de sécurité : si ça déborde encore, on resserre et on recommence.
    // Le texte ne peut que raccourcir, donc ça converge.
    let budget = Math.max(0, conteneur.clientWidth - besoinAutresColonnes - paddings);
    for (let essai = 0; essai < 4; essai++) {
        appliquer(budget);
        const debordement = table.offsetWidth - conteneur.clientWidth;
        if (debordement <= 0) break;
        budget = Math.max(0, budget - debordement);
    }
}


// --- Tooltip ------------------------------------------------------------------

let tooltipMasquage = null;   // setTimeout de masquage en cours

// Place le tooltip SOUS le pointeur, en coordonnées viewport : le curseur se
// retrouve déjà à l'intérieur, donc on peut parcourir et faire défiler le
// tooltip sans jamais le quitter ni repasser par le vide.
//
// position:fixed et non absolute : la cellule vit dans un conteneur qui
// défile, lequel rognerait un descendant positionné en absolute.
function positionnerTooltip(cellule, tooltip, x, y) {
    const MARGE = 4;     // garde vis-à-vis des bords de la fenêtre
    const DEBORD = 8;    // de combien le pointeur entre dans le tooltip

    tooltip.style.cssText += ';position:fixed;transform:none;bottom:auto;right:auto;z-index:1000';
    tooltip.style.top = '0px';
    tooltip.style.left = '0px';

    const tip = tooltip.getBoundingClientRect();
    const cell = cellule.getBoundingClientRect();
    const surPointeur = (typeof x === 'number' && typeof y === 'number');

    let top = surPointeur ? y - DEBORD : cell.bottom - 1;
    let left = surPointeur ? x - DEBORD : cell.left;

    top = Math.max(MARGE, Math.min(top, window.innerHeight - tip.height - MARGE));
    left = Math.max(MARGE, Math.min(left, window.innerWidth - tip.width - MARGE));

    // Le recadrage sur la fenêtre a pu éloigner le tooltip du pointeur, près
    // d'un bord. On le ramène pour que le curseur reste dedans : c'est toute
    // la raison d'être de ce positionnement.
    if (surPointeur) {
        top = Math.max(Math.min(top, y - 2), y - tip.height + 2);
        left = Math.max(Math.min(left, x - 2), x - tip.width + 2);
    }

    tooltip.style.top = Math.round(top) + 'px';
    tooltip.style.left = Math.round(left) + 'px';
}

// Survol d'une cellule : le tooltip suit le pointeur.
function survolCelluleListe(cellule, event) {
    const tooltip = cellule.querySelector('.tooltiptextcustom');
    // Pas de repositionnement quand le pointeur est sur le tooltip lui-même :
    // il fuirait devant la souris et deviendrait inatteignable.
    if (tooltip && tooltip.contains(event.target)) return;
    afficherTooltipCellule(cellule, event.clientX, event.clientY);
}

function afficherTooltipCellule(cellule, x, y) {
    const tooltip = cellule.querySelector('.tooltiptextcustom');
    if (!tooltip) return;
    clearTimeout(tooltipMasquage);
    positionnerTooltip(cellule, tooltip, x, y);
    tooltip.style.visibility = 'visible';
    tooltip.style.opacity = '1';
}

// On ne force jamais le masquage : on retire les styles en ligne pour rendre
// la main au CSS (.tooltipcustom:hover).
function programmerMasquageTooltip(cellule) {
    const tooltip = cellule.querySelector('.tooltiptextcustom');
    if (!tooltip) return;
    clearTimeout(tooltipMasquage);

    const masquer = function () {
        tooltip.style.visibility = '';
        tooltip.style.opacity = '';
    };
    if (DELAI_GRACE_TOOLTIP <= 0) masquer();
    else tooltipMasquage = setTimeout(masquer, DELAI_GRACE_TOOLTIP);
}


// --- Câblage, commun à toutes les pages ---------------------------------------

$(function () {
    // Délégation sur le document : aucune page n'a à déclarer quoi que ce soit,
    // et les lignes reconstruites à chaque recherche restent couvertes.
    $(document).on('mousemove', 'td.cellule-liste', function (event) {
        survolCelluleListe(this, event);
    });

    $(document).on('mouseleave', 'td.cellule-liste', function () {
        programmerMasquageTooltip(this);
    });
});
