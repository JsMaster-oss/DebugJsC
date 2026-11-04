// =============================================================================
// RECONSTRUCTION. Ce fichier n'était pas sur les captures : il est écrit en
// miroir de categorie.js, avec les différences demandées :
//   - aucune attribution de catégorie depuis cette page ;
//   - la colonne Catégorie porte une valeur simple, donc une ligne par
//     sous-catégorie et pas de colonne-liste.js.
// À comparer avec le fichier réel avant de remplacer quoi que ce soit.
// =============================================================================

// --- Fonction qui permet de créer le tableau dynamique des pages liste d'admin --- //
function creerTableauDynamicAdmin(table, data, affichageSupprimer, affichageData, url) {
    const $row = $('<tr>');

    $.each(data, function (cle, valeur) {
        let $cellData;
        if (cle != 'id') {
            if (cle == "state") {
                $cellData = $('<td>');
                const $label = $('<label>').attr('for', 'switch-statut-' + data['id']).addClass('toggle-switch-label');
                const $checkbox = $('<input>').attr('id', 'switch-statut-' + data['id']).attr('type', 'checkbox').addClass('toggle-switch-input');
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

    const $modifierButton = $('<button>').addClass('action-button edit-line edit-btn').attr('type', 'button').attr('data', listInitFormJSON).attr('aria-label', 'Modifier').attr('title', 'Modifier');
    $modifierButton.append($('<i>').addClass('fa fa-pencil-square-o'));
    $actionDiv.append($modifierButton);

    const $supprimerButton = $('<button>').addClass('action-button delete-line delete-btn').attr('type', 'button').attr('data', listInitFormJSON).attr('aria-label', 'Supprimer').attr('title', 'Supprimer');
    $supprimerButton.attr('data-modal-display', `${listInitFormJSONSuppr['data']['subcategory']}`);
    $supprimerButton.append($('<i>').addClass('fa fa-trash'));
    $actionDiv.append($supprimerButton);

    $cellAction.append($actionDiv);
    $row.append($cellAction);
    table.append($row);
}

// Modification du statut d'une ligne
function modifierStatut(urlModif, id, statutIsActif) {
    const data_json = JSON.stringify({ 'statut': statutIsActif, 'action': 'modifier_statut' });

    $.ajax({
        type: 'POST',
        contentType: 'application/json',
        url: urlModif + id,
        data: data_json,
        success: (response) => {
            if (response["state"] == false) {
                document.getElementById("error-modal").showModal();
            }
        },
        error: (error) => {
            console.error(error);
        }
    });
}

// Remplit et ouvre la modale d'erreur. Même contrat que côté serveur :
// { success: false, error: "...", details: [ "...", ... ] }
function afficherErreur(response) {
    const errorModal = document.getElementById("error-modal");
    const errorMessage = document.getElementById("erreurSupprimer");

    const errorLines = (response.details || []).map(line =>
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

$(document).ready(function () {
    // Eventlistener pour display la modal de suppression
    $('.table-tbody').on('click', '.delete-line', function () {
        const modal = document.getElementById('deletion-modal');
        const form = modal.querySelector('form');
        const data = JSON.parse(this.getAttribute('data'))["data"];
        form.setAttribute('id_sous_categorie', data["id"]);
        modal.querySelector('#subcategoryName').innerHTML = data["subcategory"];
        modal.showModal();
    });

    // Eventlistener pour display la modal de modification
    $('.table-tbody').on('click', '.edit-line', function (event) {
        const modal = document.getElementById('modify-modal');
        const data = JSON.parse(this.getAttribute('data'))["data"];
        const form = modal.querySelector('form');
        form.setAttribute('id_sous_categorie', data["id"]);

        form.querySelector('#subcategory').value = data["subcategory"];

        // Catégorie affichée en lecture seule : elle se modifie depuis la page
        // catégorie, une sous-catégorie ne pouvant appartenir qu'à une seule.
        form.querySelector('#categorie-rattachee').textContent = data["category"] || '—';

        const check = form.querySelector('#state');
        const toggleSwitch = event.target.parentNode.parentNode.parentNode.parentNode.querySelector('.toggle-switch-input').checked;
        check.checked = toggleSwitch == true ? false : true;

        modal.showModal();
    });

    // Réinitialise le formulaire quelle que soit la façon dont la modale se
    // ferme, touche Échap comprise. La fermeture elle-même est gérée par
    // administration.js.
    $('#modify-modal').on('close', function () {
        resetModifyModal();
    });

    // Logique de fermeture de la modal d'erreur
    $('#error-modal button.btn-annuler').on('click', function () {
        location.reload();
        document.getElementById('error-modal').close();
    });

    // Logique de submit du formulaire d'ajout
    $('#creation-modal form').on('submit', function (event) {
        event.preventDefault();
        const modal = document.getElementById('creation-modal');
        const subcategory = modal.querySelector('#subcategory').value;

        $.ajax({
            url: '/ajouter_sous_categorie',
            method: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify({ "subcategory": subcategory }),
            success: (response) => {
                if (response.success) {
                    location.reload();
                    modal.close();
                } else {
                    afficherErreur(response);
                }
            },
            error: () => {
                console.log("Une erreur s'est produite lors de l'envoi de la création de la sous-catégorie technologique");
            }
        });
    });

    // Logique de submit du formulaire de suppression
    $('#deletion-modal form').on('submit', function (event) {
        event.preventDefault();
        const modal = document.getElementById('deletion-modal');
        const id = modal.querySelector('form').getAttribute('id_sous_categorie');

        $.ajax({
            url: '/supprimer_sous_categorie/' + String(id),
            method: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify({ "state": "Supprimé" }),
            complete: function (xhr) {
                modal.close();
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response && response.error) {
                        afficherErreur(response);
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

    // Logique de submit du formulaire de modification
    $('#modify-modal form').on('submit', function (event) {
        event.preventDefault();
        const modal = document.getElementById('modify-modal');
        const form = modal.querySelector('form');
        const id = form.getAttribute('id_sous_categorie');
        const subcategory = modal.querySelector('#subcategory').value;
        const state = modal.querySelector('#state').checked;

        $.ajax({
            url: '/modifier_sous_categorie/' + String(id),
            method: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify({ "subcategory": subcategory, "state": !state }),
            success: () => {
                location.reload();
                modal.close();
            },
            error: (xhr) => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response && response.error) afficherErreur(response);
                } catch (e) {
                    console.log("Impossible de parser la réponse");
                }
            }
        });
    });
});

function resetModifyModal() {
    const form = document.getElementById('modify-modal').querySelector('form');
    form.querySelector('#subcategory').value = '';
    form.querySelector('#state').checked = false;
    form.querySelector('#categorie-rattachee').textContent = '';
}
