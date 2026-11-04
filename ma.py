# =============================================================================
# Extrait de ProjetApp/main.py — routes « Catégorie technologique »
# =============================================================================
# Imports attendus en tête du fichier réel (non visibles sur les captures) :
#   import json
#   from flask import render_template, request, jsonify
#   from .models import (
#       Subcategory,
#       get_categories_tech_order_by_nom, get_subcategories_order_by_nom,
#       get_category_by_id, get_subcategories_ids_by_category_id,
#       get_subcategories_ids_by_names,
#       add_category, modify_category, delete_category, switch_state_category,
#       conflits_sous_categories,
#       get_subcategories_tech_order_by_nom, get_subcategory_by_id,
#       add_subcategory, modify_subcategory, delete_subcategory,
#       switch_state_subcategory,
#   )
# =============================================================================


# Catégorie technologique
@main.route("/categorie")
@login_required
@roles_required("Admin")
def categorie():
    """

    Returns
    -------
    TYPE
        DESCRIPTION.

    """
    return render_template(
        "administration/categorie.html",
    )


@main.route("/donnees_tableau_categories_tech", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def donnees_tableau_categories_tech():
    list_label_categories = []
    list_dict_categories = []

    for category in get_categories_tech_order_by_nom():
        if category.state != "Supprimé":
            list_label_categories.append(category.category)
            list_dict_categories.append(category.to_dict())

    url = {
        "supprimer": "supprimer_categorie/",
        "recuperer": "main.recuperer_donnee_categorie",
        "modifier": "modifier_categorie/",
    }
    # affichage_supprimer = "l'utilisateur "
    json_list_dict_categories = json.dumps(list_dict_categories)

    return jsonify(
        list_dict_admin=json_list_dict_categories,
        list_label_admin=list_label_categories,
        # affichage_supprimer=affichage_supprimer,
        url=url,
    )


@main.route("/get_subcategories", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def get_subcategories():
    subcategories_list = []

    for subcategory in get_subcategories_order_by_nom():
        sub = subcategory.to_dict()
        subcategories_list.append(sub["subcategory"])

    return jsonify(subcategories_list=subcategories_list)


@main.route("/ajouter_categorie", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def ajouter_categorie():
    response = request.get_json()
    # Récupérer la liste de sous-catégories, par défaut une liste vide si non fournie
    subcategories_list = response.get("subcategories_list", [])

    # Une sous-catégorie n'appartient qu'à une seule catégorie.
    conflits = conflits_sous_categories(subcategories_list)
    if conflits:
        # 200 volontairement : le JS de création lit la réponse dans success:,
        # pas dans error:.
        return jsonify({
            "success": False,
            "error": "Sous-catégories déjà rattachées à une autre catégorie technologique :",
            "details": conflits
        })

    result = add_category(
        category=response["category"],
        subcategories_list=subcategories_list
    )

    return jsonify(result)


@main.route("/supprimer_categorie/<int:category_id>", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def supprimer_categorie(category_id):
    try:
        # 1. Récupérer la catégorie SQL
        category = get_category_by_id(category_id)
        if not category:
            return jsonify({"success": False, "error": "Catégorie non trouvée."}), 404

        # 2. Vérifier l'utilisation dans MongoDB et récupérer les références
        with ConnexionMongoDB(config) as clientMongo:
            db_fiche = clientMongo[config["MONGO"]["BaseFiche"]]
            my_collection = db_fiche[config["MONGO"]["CollectionFiche"]]

            # Récupérer tous les documents utilisant cette catégorie
            documents = my_collection.find({"Categorie_Technologique": category.category})

            # Préparer les lignes de détail avec les deux champs
            detail_lines = []
            for doc in documents:
                designation = doc.get("Designation_Article", "N/A")
                reference = doc.get("Reference_Article", "N/A")
                detail_lines.append(f"{designation} | {reference}")

            # 3. Si utilisée, bloquer la suppression avec détails
            if detail_lines:
                return jsonify({
                    "success": False,
                    "error": "Suppression impossible, la catégorie technologique est utilisée dans les fiches de recensement suivantes :",
                    "details": detail_lines
                }), 400

            # 4. Si inutilisée, procéder à la suppression SQL
            deletion_success = delete_category(category_id)

            if not deletion_success:
                return jsonify({"success": False, "error": "Erreur lors de la suppression SQL."}), 500

            return jsonify({"success": True, "deletion_success": True})

    except Exception as e:
        print(f"Erreur lors de la suppression de catégorie: {str(e)}")
        return jsonify({"success": False, "error": "Une erreur serveur est survenue."}), 500


@main.route("/modifier_categorie/<int:category_id>", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def modifier_categorie(category_id):
    category = get_category_by_id(category_id)

    try:
        action = request.get_json().get("action")
    except:
        action = None

    if action == "modifier_statut":
        data = request.get_json()
        state = data.get("statut")
        change = switch_state_category(category, state)
        return jsonify({"success": True, "state": change})
    else:
        data = request.get_json()
        subcategories_list = data["subcategories_list"]
        state = data["state"]

        # 1. Récupérer les sous-catégories actuelles pour la vérification
        old_subcategories = get_subcategories_ids_by_category_id(category.id)
        old_subcategories = {us.id_subcategory for us in old_subcategories}

        new_subcategories = get_subcategories_ids_by_names(subcategories_list)
        new_subcategories = {s.id for s in new_subcategories}

        subcategories_to_delete = old_subcategories - new_subcategories

        # Une sous-catégorie n'appartient qu'à une seule catégorie. On ignore
        # la catégorie en cours de modification, sinon ses propres
        # sous-catégories se signaleraient elles-mêmes.
        conflits = conflits_sous_categories(subcategories_list, category_id=category.id)
        if conflits:
            return jsonify({
                "success": False,
                "error": "Sous-catégories déjà rattachées à une autre catégorie technologique :",
                "details": conflits
            }), 400

        # 2. Vérifier dans MongoDB si les sous-catégories à supprimer sont utilisées
        with ConnexionMongoDB(config) as clientMongo:
            db_fiche = clientMongo[config["MONGO"]["BaseFiche"]]
            my_collection = db_fiche[config["MONGO"]["CollectionFiche"]]

            error_lines = []  # Liste unifiée des erreurs

            for subcategory_id in subcategories_to_delete:
                subcategory = Subcategory.query.get(subcategory_id)
                if not subcategory:
                    continue

                subcategory_name = subcategory.subcategory
                # Vérifier si cette sous-catégorie est utilisée dans MongoDB
                count = my_collection.count_documents({
                    "Categorie_Technologique": category.category,
                    "Sous_Categorie_Technologique": subcategory_name
                })

                if count > 0:
                    # Récupérer les références des fiches concernées
                    documents = my_collection.find({
                        "Categorie_Technologique": category.category,
                        "Sous_Categorie_Technologique": subcategory_name
                    })

                    for doc in documents:
                        designation = doc.get("Designation_Article", "N/A")
                        reference = doc.get("Reference_Article", "N/A")
                        # Format : "Ma sous-catégorie | Designation | Reference"
                        error_lines.append(f"{subcategory_name} | {designation} | {reference}")

        # 3. Si erreurs, bloquer la modification
        if error_lines:
            return jsonify({
                "success": False,
                "error": "Modification impossible, la sous-catégorie technologique est utilisée dans les fiches de recensement suivantes :",
                "details": error_lines  # Liste unifiée
            }), 400

        # 4. Si pas d'erreurs, procéder à la modification SQL
        modify_category(
            category=category,
            subcategories_list=subcategories_list,
            state=state
        )

        return jsonify({"success": True})


# =============================================================================
# sous_categorie.py
# -----------------------------------------------------------------------------
# RECONSTRUCTION. Ces routes n'étaient pas sur les captures : elles sont écrites
# en miroir de celles de categorie, avec les différences demandées :
#   - aucune attribution de catégorie depuis cette page ;
#   - une ligne par sous-catégorie (to_dict expose "category", pas "categories").
# À comparer avec les routes réelles avant de remplacer quoi que ce soit.
# =============================================================================


@main.route("/sous_categorie")
@login_required
@roles_required("Admin")
def sous_categorie():
    return render_template(
        "administration/sous_categorie.html",
    )


@main.route("/donnees_tableau_sous_categories_tech", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def donnees_tableau_sous_categories_tech():
    list_label_subcategories = []
    list_dict_subcategories = []

    for subcategory in get_subcategories_tech_order_by_nom():
        if subcategory.state != "Supprimé":
            list_label_subcategories.append(subcategory.subcategory)
            list_dict_subcategories.append(subcategory.to_dict())

    url = {
        "supprimer": "supprimer_sous_categorie/",
        "recuperer": "main.recuperer_donnee_sous_categorie",
        "modifier": "modifier_sous_categorie/",
    }
    json_list_dict_subcategories = json.dumps(list_dict_subcategories)

    return jsonify(
        list_dict_admin=json_list_dict_subcategories,
        list_label_admin=list_label_subcategories,
        url=url,
    )


@main.route("/ajouter_sous_categorie", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def ajouter_sous_categorie():
    response = request.get_json()

    # Pas de categories_list : le rattachement se pilote depuis la page
    # catégorie, une sous-catégorie n'appartenant qu'à une seule catégorie.
    result = add_subcategory(subcategory=response["subcategory"])

    return jsonify(result)


@main.route("/supprimer_sous_categorie/<int:subcategory_id>", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def supprimer_sous_categorie(subcategory_id):
    try:
        # 1. Récupérer la sous-catégorie SQL
        subcategory = get_subcategory_by_id(subcategory_id)
        if not subcategory:
            return jsonify({"success": False, "error": "Sous-catégorie non trouvée."}), 404

        # 2. Vérifier l'utilisation dans MongoDB et récupérer les références
        with ConnexionMongoDB(config) as clientMongo:
            db_fiche = clientMongo[config["MONGO"]["BaseFiche"]]
            my_collection = db_fiche[config["MONGO"]["CollectionFiche"]]

            documents = my_collection.find(
                {"Sous_Categorie_Technologique": subcategory.subcategory}
            )

            detail_lines = []
            for doc in documents:
                designation = doc.get("Designation_Article", "N/A")
                reference = doc.get("Reference_Article", "N/A")
                detail_lines.append(f"{designation} | {reference}")

            # 3. Si utilisée, bloquer la suppression avec détails
            if detail_lines:
                return jsonify({
                    "success": False,
                    "error": "Suppression impossible, la sous-catégorie technologique est utilisée dans les fiches de recensement suivantes :",
                    "details": detail_lines
                }), 400

            # 4. Si inutilisée, procéder à la suppression SQL
            deletion_success = delete_subcategory(subcategory_id)

            if not deletion_success:
                return jsonify({"success": False, "error": "Erreur lors de la suppression SQL."}), 500

            return jsonify({"success": True, "deletion_success": True})

    except Exception as e:
        print(f"Erreur lors de la suppression de sous-catégorie: {str(e)}")
        return jsonify({"success": False, "error": "Une erreur serveur est survenue."}), 500


@main.route("/modifier_sous_categorie/<int:subcategory_id>", methods=["GET", "POST"])
@login_required
@roles_required("Admin")
def modifier_sous_categorie(subcategory_id):
    subcategory = get_subcategory_by_id(subcategory_id)

    try:
        action = request.get_json().get("action")
    except:
        action = None

    if action == "modifier_statut":
        data = request.get_json()
        state = data.get("statut")
        change = switch_state_subcategory(subcategory, state)
        return jsonify({"success": True, "state": change})

    data = request.get_json()
    state = data["state"]

    # Aucune liste de catégories : rien à recalculer ni à vérifier côté
    # rattachement, donc pas de contrôle MongoDB ici. Il reste sur la page
    # catégorie, qui est la seule à défaire un rattachement.
    modify_subcategory(subcategory=subcategory, state=state)

    return jsonify({"success": True})
