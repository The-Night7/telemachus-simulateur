"""
Régénère src/capacites.json à partir de "scripts/unodex - unodex.csv".

Le "stat_principale" (stat auto-boostée par une capacité) reflète un choix de
design/lore, pas forcément la stat brute la plus haute. Les valeurs connues et
vérifiées sont figées dans scripts/stat_principale_overrides.json (clé:
nom_personnage + nom_capacite + niveau). Pour toute nouvelle ligne du CSV sans
override, un choix par défaut est déduit de la colonne "Nature" du CSV
(Vivacité -> speed, Defense -> defense, Attaque -> power, Support -> recovery,
Stratege -> power), avec repli sur la stat brute maximale si la Nature est
absente/inconnue. Ces valeurs par défaut sont à vérifier manuellement et,
si besoin, à figer dans le fichier d'overrides.

Usage: python3 scripts/generate_capacites.py
"""
import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "scripts", "unodex - unodex.csv")
OVERRIDES_PATH = os.path.join(BASE_DIR, "scripts", "stat_principale_overrides.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "src", "capacites.json")

NATURE_TO_STAT = {
    "Vivacité": "speed",
    "Defense": "defense",
    "Attaque": "power",
    "Support": "recovery",
    "Stratege": "power",
}

STAT_KEYS = ["power", "speed", "trick", "recovery", "defense"]


def parse_float(s):
    return float(s.replace(",", "."))


def trunc3(x):
    return int(x * 1000) / 1000


def load_overrides():
    with open(OVERRIDES_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    return {(o["nom_personnage"], o["nom_capacite"], o["niveau"]): o["stat_principale"] for o in raw}


def main():
    overrides = load_overrides()
    fallback_used = []

    entries = []
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        id_counter = 1
        for row in reader:
            ability = row["Ability"]
            if not ability or ability == "Aucune":
                continue
            try:
                stats = {k: parse_float(row[k.capitalize()]) for k in STAT_KEYS}
                niveau = parse_float(row["Level"])
            except (ValueError, KeyError):
                continue

            key = (row["Name"], ability, niveau)
            if key in overrides:
                stat_principale = overrides[key]
            else:
                nature = row.get("Nature", "")
                stat_principale = NATURE_TO_STAT.get(nature)
                if stat_principale is None:
                    stat_principale = max(stats, key=stats.get)
                fallback_used.append((row["Name"], ability, niveau, stat_principale))

            type_ = row["Type"]
            ratios = {k: (trunc3(v / niveau) if niveau > 0 else 0) for k, v in stats.items()}

            entries.append({
                "id": id_counter,
                "nom_personnage": row["Name"],
                "nom_capacite": ability,
                "niveau": niveau,
                "type": type_,
                "copiable": type_ != "Mental",
                "stat_principale": stat_principale,
                "stats_de_base": stats,
                "ratios_stats": ratios,
            })
            id_counter += 1

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"{OUTPUT_PATH}: {len(entries)} capacités écrites.")
    if fallback_used:
        print(f"\n{len(fallback_used)} entrée(s) sans override, stat_principale déduite automatiquement :")
        for name, ability, niveau, stat in fallback_used:
            print(f"  - {name} / {ability} (niv {niveau}) -> {stat}")
        print("Vérifie ces choix et ajoute-les si besoin à scripts/stat_principale_overrides.json.")


if __name__ == "__main__":
    main()
