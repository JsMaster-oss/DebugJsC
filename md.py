# =============================================================================
# Extrait de ProjetApp/models.py — Catégories / Sous-catégories technologiques
# =============================================================================
# Imports attendus en tête du fichier réel (non visibles sur les captures) :
#   from . import db
# =============================================================================


class Category(db.Model):
    __tablename__ = "category"

    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(200), nullable=False)
    state = db.Column(db.String(20), nullable=False, default='Activé')

    # Relations
    categories = db.relationship("CategorySubcategory", back_populates="category", lazy="joined")

    def to_dict(self):
        """
        Il prend l'objet self, qui est une instance de la classe Utilisateur, et renvoie un dictionnaire
        des attributs de l'objet
        :return: Un dictionnaire avec les clés et les valeurs de l'objet.
        """
        return {
            "id": self.id,
            "state": self.state,
            "category": self.category,
            "subcategories": [category_subcategory.subcategory.subcategory for category_subcategory in self.categories],
        }


def get_categories_tech_order_by_nom():
    """
    La fonction get_categories_tech_order_by_nom est utilisée pour récupérer toutes les catégories technologiques de la base de données
    ordonnées par nom
        :return: La liste de toutes les catégories technologiques
    """
    return Category.query.order_by(Category.category).all()


def get_categories_ids_by_names(categories_list):
    """
    La fonction get_programs_ids_by_names est utilisée pour récupérer tout les ids de programme de la base de données
        :return: La liste de tout les ids de programmes d'une liste
    """
    return Category.query.filter(Category.category.in_(categories_list)).all()


def get_category_by_id(id):
    """
    La fonction get_category_by_id est utilisée pour récupérer la catégorie technologique correspondant à l'id
        :return: La liste de toutes les catégories technologiques
    """
    return Category.query.filter_by(id=id).first()


def get_category_by_nom(category):
    """
    La fonction get_category_by_nom est utilisée pour récupérer la catégorie technologique correspondant au nom de catégorie
        :return: La catégorie technologique correspondante
    """
    return Category.query.filter_by(category=category).first()


# def get_category_by_subcategory(subcategory_id):
#     """
#     La fonction get_user_by_sector est utilisée pour récupérer l'utilisateur correspondant au mail
#         :return: La liste de toutes les catégories technologiques
#     """
#     return User.query.filter_by(id_sector=sector_id).first()


def add_category(
    category,
    subcategories_list=None  # Rendre la liste de sous-catégories optionnelle
):
    """
    La fonction add_category est utilisée pour ajouter une nouvelle catégorie technologique dans la base de données
        :param category: un nom de catégorie technologique
        :param subcategories_list: liste optionnelle de sous-catégories (peut être None ou vide)
    """
    category_exist = get_category_by_nom(category)
    if (category_exist):
        if (category_exist.state != "Activé"):

            category_exist.state = "Activé"
            # Ne modifier avec les sous-catégories que si la liste est fournie et non vide
            if subcategories_list:
                modify_category(
                    category_exist,
                    subcategories_list,
                    True
                )
            db.session.add(category_exist)
            db.session.commit()
            return {
                "success": True,
                "message": "Catégorie existante activée",
                "category_id": category_exist.id
            }
        else:
            # Catégorie existe déjà ET est activée - erreur
            return {
                "success": False,
                "error": "Catégorie déjà existante",
                "details": [
                    f"La catégorie '{category}' existe déjà",
                    f"État actuel : Activé",
                    "Impossible de créer une catégorie en double"
                ]
            }
    else:
        new_category = Category(
            category=category,
            state="Activé",
        )

        db.session.add(new_category)
        db.session.commit()

        # Ajouter les associations de sous-catégories uniquement si la liste est fournie et non vide
        if subcategories_list:
            for subcategory_name in subcategories_list:
                subcategory = Subcategory.query.filter_by(subcategory=subcategory_name).first()
                if subcategory:  # Ajouter uniquement si la sous-catégorie existe
                    subcategory_assoc = CategorySubcategory(id_category = new_category.id, id_subcategory = subcategory.id)
                    db.session.add(subcategory_assoc)
                    db.session.commit()


def switch_state_category(category, state):
    """
    La fonction modifier_statut_utilisateur est utilisée pour modifier le statut d'un utilisateur
    dans la base de données et ainsi permettre désactiviation ou nom du compte
        :param utilisateur: Un utilisateur
        :param statut: Le statut
    """
    if state == True:
        category.state = "Activé"
    else:
        category.state = "Désactivé"
    db.session.commit()


def modify_category(
    category,
    subcategories_list,
    state
):
    """
    Modifie une catégorie dans la base SQL uniquement
    """
    # 1. Calculer les sous-catégories à ajouter/supprimer
    new_subcategories_list = get_subcategories_ids_by_names(subcategories_list)
    new_subcategories_list = {s.id for s in new_subcategories_list}

    old_subcategories_list = get_subcategories_ids_by_category_id(category.id)
    old_subcategories_list = {us.id_subcategory for us in old_subcategories_list}

    subcategories_to_delete = old_subcategories_list - new_subcategories_list
    subcategories_to_add = new_subcategories_list - old_subcategories_list

    # 2. Appliquer les modifications SQL
    if state == True:
        category.state = "Activé"
    else:
        category.state = "Désactivé"

    # Suppression des relations à supprimer
    for subcategory_id in subcategories_to_delete:
        up = CategorySubcategory.query.filter_by(id_category=category.id, id_subcategory=subcategory_id).first()
        if up:
            db.session.delete(up)

    # Ajout des nouvelles relations
    for subcategory_id in subcategories_to_add:
        subcategory = Subcategory.query.get(subcategory_id)
        if subcategory and subcategory_id not in old_subcategories_list:
            relation = CategorySubcategory(id_category=category.id, id_subcategory=subcategory.id)
            db.session.add(relation)

    db.session.commit()
    return True


def delete_category(category_id):
    """
    La fonction delete_category est utilisée pour supprimer une catégorie et toutes ses associations
    :param category_id: L'identifiant d'une catégorie
    """
    try:
        # 1. Récupérer la catégorie
        category = get_category_by_id(category_id)
        if not category:
            return False

        # 2. Supprimer TOUTES les associations de sous-catégories
        # C'est ça qui résout ton problème de réapparition des anciennes sous-catégories
        associations = CategorySubcategory.query.filter_by(id_category=category_id).all()

        for assoc in associations:
            db.session.delete(assoc)  # <--- SUPPRESSION DES LIENS

        # 3. Marquer la catégorie comme supprimée (soft delete)
        category.state = "Supprimé"

        # 4. Commit unique pour toute l'opération
        db.session.commit()

        return True

    except Exception as e:
        db.session.rollback()
        return False


class Subcategory(db.Model):
    __tablename__ = "subcategory"

    id = db.Column(db.Integer, primary_key=True)
    subcategory = db.Column(db.String(200), nullable=False)
    state = db.Column(db.String(20), nullable=False, default='Activé')

    # Relations
    subcategories = db.relationship("CategorySubcategory", back_populates="subcategory", lazy="joined")

    def to_dict(self):
        """
        Il prend l'objet self, qui est une instance de la classe Utilisateur, et renvoie un dictionnaire
        des attributs de l'objet
        :return: Un dictionnaire avec les clés et les valeurs de l'objet.
        """
        return {
            "id": self.id,
            "state": self.state,
            "subcategory": self.subcategory,
            # Une sous-catégorie n'appartient qu'à une seule catégorie : on
            # expose une valeur simple et non une liste, d'où une ligne par
            # sous-catégorie dans le tableau d'administration.
            "category": self.subcategories[0].category.category if self.subcategories else "",
        }


def get_subcategories_ids_by_names(subcategories_list):
    """
    La fonction get_programs_ids_by_names est utilisée pour récupérer tout les ids de programme de la base de données
        :return: La liste de tout les ids de programmes d'une liste
    """
    return Subcategory.query.filter(Subcategory.subcategory.in_(subcategories_list)).all()


def get_categories_ids_by_subcategory_id(subcategory_id):
    """
    Récupère les associations de catégories pour une sous-catégorie donnée
    """
    return CategorySubcategory.query.filter_by(id_subcategory=subcategory_id).all()


def get_category_of_subcategory(subcategory_id):
    """
    La catégorie à laquelle une sous-catégorie est rattachée, ou None.
    Une sous-catégorie ne peut appartenir qu'à une seule catégorie.
    """
    association = CategorySubcategory.query.filter_by(id_subcategory=subcategory_id).first()
    return association.category if association else None


def conflits_sous_categories(subcategories_list, category_id=None):
    """
    Sous-catégories de la liste déjà rattachées à une AUTRE catégorie.
    :param subcategories_list: noms de sous-catégories à rattacher
    :param category_id: catégorie en cours de modification, à ne pas compter
    :return: lignes prêtes à afficher, vide si aucun conflit
    """
    conflits = []
    for subcategory in get_subcategories_ids_by_names(subcategories_list):
        for association in get_categories_ids_by_subcategory_id(subcategory.id):
            if category_id is not None and association.id_category == category_id:
                continue
            autre = get_category_by_id(association.id_category)
            # Une catégorie supprimée ne bloque pas : ses liens sont déjà purgés
            # par delete_category, mais on reste tolérant.
            if autre and autre.state != "Supprimé":
                conflits.append(
                    f"{subcategory.subcategory} | déjà rattachée à {autre.category}"
                )
    return conflits


def sous_categories_multi_categories():
    """
    Contrôle de cohérence : sous-catégories actuellement rattachées à plusieurs
    catégories, en violation de la règle. À lancer avant d'activer la contrainte.
    :return: liste de (nom de sous-catégorie, [noms de catégories])
    """
    anomalies = []
    for subcategory in get_subcategories_order_by_nom():
        categories = [
            get_category_by_id(a.id_category)
            for a in get_categories_ids_by_subcategory_id(subcategory.id)
        ]
        noms = [c.category for c in categories if c and c.state != "Supprimé"]
        if len(noms) > 1:
            anomalies.append((subcategory.subcategory, noms))
    return anomalies


def get_subcategories_order_by_nom():
    """
    La fonction get_subcategories_order_by_nom est utilisée pour récupérer toutes les catégories technologiques de la base de données
    ordonnées par nom
        :return: La liste de toutes les catégories technologiques
    """
    return Subcategory.query.order_by(Subcategory.subcategory).all()


def get_subcategories_tech_order_by_nom():
    """
    La fonction get_subcategories_tech_order_by_nom est utilisée pour récupérer toutes les sous-catégories technologiques
    de la base de données ordonnées par nom
        :return: La liste de toutes les sous-catégories technologiques
    """
    return Subcategory.query.order_by(Subcategory.subcategory).all()


def get_subcategory_by_id(id):
    """
    La fonction get_subcategory_by_id est utilisée pour récupérer la sous-catégorie technologique correspondant à l'id
        :return: La sous-catégorie technologique correspondante
    """
    return Subcategory.query.filter_by(id=id).first()


def get_subcategory_by_nom(subcategory):
    """
    La fonction get_subcategory_by_nom est utilisée pour récupérer la sous-catégorie technologique correspondant
    au nom de sous-catégorie technologique en entrée
        :return: La sous-catégorie technologique correspondante
    """
    return Subcategory.query.filter_by(subcategory=subcategory).first()


def add_subcategory(subcategory):
    """
    La fonction add_subcategory est utilisée pour ajouter une nouvelle sous-catégorie technologique
    dans la base de données.
    Le rattachement à une catégorie ne se fait PAS ici : il se pilote depuis la page catégorie,
    une sous-catégorie ne pouvant appartenir qu'à une seule catégorie.
        :param subcategory: un nom de sous-catégorie technologique
    """
    subcategory_exist = get_subcategory_by_nom(subcategory)
    if subcategory_exist:
        if subcategory_exist.state == "Activé":
            return {
                "success": False,
                "error": "Sous-catégorie déjà existante",
                "details": [
                    f"La sous-catégorie '{subcategory}' existe déjà",
                    "État actuel : Activé",
                    "Impossible de créer une sous-catégorie en double"
                ]
            }

        subcategory_exist.state = "Activé"
        db.session.add(subcategory_exist)
        db.session.commit()
        return {
            "success": True,
            "message": "Sous-catégorie existante activée",
            "subcategory_id": subcategory_exist.id
        }

    new_subcategory = Subcategory(
        subcategory=subcategory,
        state="Activé",
    )
    db.session.add(new_subcategory)
    db.session.commit()
    return {
        "success": True,
        "subcategory_id": new_subcategory.id
    }


def switch_state_subcategory(subcategory, state):
    """
    La fonction switch_state_subcategory est utilisée pour modifier le statut d'une sous-catégorie
    dans la base de données
        :param subcategory: Une sous-catégorie
        :param state: Le statut (True pour "Activé", False pour "Désactivé")
    """
    if state == True:
        subcategory.state = "Activé"
    else:
        subcategory.state = "Désactivé"
    db.session.commit()


def modify_subcategory(subcategory, state):
    """
    Modifie une sous-catégorie dans la base SQL uniquement.
    Les rattachements de catégories ne sont pas touchés : ils se gèrent depuis
    la page catégorie.
        :param subcategory: une sous-catégorie
        :param state: True pour "Activé", False pour "Désactivé"
    """
    if state == True:
        subcategory.state = "Activé"
    else:
        subcategory.state = "Désactivé"

    db.session.commit()
    return True


def delete_subcategory(subcategory_id):
    """
    La fonction delete_subcategory est utilisée pour supprimer une sous-catégorie et toutes ses associations
    :param subcategory_id: L'identifiant d'une sous-catégorie
    """
    try:
        # 1. Récupérer la sous-catégorie
        subcategory = get_subcategory_by_id(subcategory_id)
        if not subcategory:
            return False

        # 2. Supprimer TOUTES les associations de catégories
        associations = CategorySubcategory.query.filter_by(id_subcategory=subcategory_id).all()

        for assoc in associations:
            db.session.delete(assoc)  # <--- SUPPRESSION DES LIENS

        # 3. Marquer la sous-catégorie comme supprimée (soft delete)
        subcategory.state = "Supprimé"

        # 4. Commit unique pour toute l'opération
        db.session.commit()

        return True

    except Exception as e:
        db.session.rollback()
        return False


class CategorySubcategory(db.Model):
    __tablename__ = "category_subcategory"

    id = db.Column(db.Integer, primary_key=True)
    id_category = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=False)
    id_subcategory = db.Column(db.Integer, db.ForeignKey("subcategory.id"), nullable=False)

    # Relations
    category = db.relationship("Category", back_populates="categories", lazy="joined")
    subcategory = db.relationship("Subcategory", back_populates="subcategories", lazy="joined")


def get_subcategories_ids_by_category_id(category_id):
    """
    La fonction get_programs_ids_by_user_id est utilisée pour récupérer tout les ids de programme d'un utilisateur
        :return: La liste de tout les ids de programmes d'un utilisateur
    """
    return CategorySubcategory.query.filter_by(id_category=category_id).all()
