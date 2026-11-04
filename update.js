// --- Fonction qui permet de créer le tableau dynamique des pages liste d'admin --- //
function creerTableauDynamicAdmin(table, data, affichageSupprimer, affichageData, url) {
    const $row = $('<tr>');

    // Boucle d'initialisation des cellules
    $.each(data, function (cle, valeur) {
        let $cellData;
        if (cle != 'id') {
            if ($.isArray(valeur)) {
                // Colonne liste : logique partagée dans colonne-liste.js. Le
                // nombre de valeurs affichées dépend de la place disponible.
                $cellData = creerCelluleListe(valeur);
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
