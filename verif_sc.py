"""
Contrôle de cohérence à lancer AVANT d'activer la contrainte « une
sous-catégorie n'appartient qu'à une seule catégorie ».

Liste les sous-catégories actuellement rattachées à plusieurs catégories. Tant
qu'il en reste, les routes de la page catégorie refuseront toute modification
qui les concerne : il faut les arbitrer à la main.

Usage :
    python -m ProjetApp.verifier_sous_categories

L'import de la fabrique d'application ci-dessous est à adapter au projet : il
n'était pas visible sur les captures ayant servi à cette restitution.
"""

from . import create_app                              # <-- à adapter
from .models import sous_categories_multi_categories


def main():
    app = create_app()
    with app.app_context():
        anomalies = sous_categories_multi_categories()

    if not anomalies:
        print("OK : aucune sous-catégorie rattachée à plusieurs catégories.")
        return 0

    print(f"{len(anomalies)} sous-catégorie(s) en violation de la contrainte :\n")
    for subcategory, categories in anomalies:
        print(f"  {subcategory}")
        for category in categories:
            print(f"      - {category}")
    print("\nIl faut n'en garder qu'une par sous-catégorie, depuis la page catégorie.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
