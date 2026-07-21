"""
Régénère src/capacites.json à partir de "scripts/unodex - unodex.csv" (canon)
et "scripts/unodex - unodex-rp.csv" (RP/OC, source d'autorité pour ces
personnages). Si une ligne RP a été copiée manuellement dans le fichier canon
(même Name + Ability + Level), elle est ignorée côté canon pour éviter les
doublons: le fichier RP prime et est ajouté à la suite.

Le "stat_principale" (stat auto-boostée par une capacité) reflète un choix de
design/lore, pas forcément la stat brute la plus haute. Les valeurs connues et
vérifiées sont figées dans scripts/stat_principale_overrides.json (clé:
nom_personnage + nom_capacite + niveau). Pour toute nouvelle ligne du CSV sans
override, un choix par défaut est déduit de la colonne "Nature" du CSV
(Vivacité -> speed, Defense -> defense, Attaque -> power, Support -> recovery,
Stratege -> power), avec repli sur la stat brute maximale (hors "trick", qui
scale automatiquement avec le niveau et n'est donc jamais un choix pertinent
de stat auto-boostée) si la Nature est absente/inconnue — c'est le cas de
tout le fichier RP, qui n'a pas de colonne Nature. Ces valeurs par défaut
sont à vérifier manuellement et, si besoin, à figer dans le fichier
d'overrides.

Usage: python3 scripts/generate_capacites.py
"""
import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "scripts", "unodex - unodex.csv")
RP_CSV_PATH = os.path.join(BASE_DIR, "scripts", "unodex - unodex-rp.csv")
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


def load_rows(path):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def load_all_rows():
    canon_rows = load_rows(CSV_PATH)
    rp_rows = load_rows(RP_CSV_PATH)
    rp_keys = {(row["Name"], row["Ability"], row["Level"]) for row in rp_rows if row.get("Ability")}
    canon_rows = [row for row in canon_rows if (row["Name"], row["Ability"], row["Level"]) not in rp_keys]
    return canon_rows + rp_rows


def main():
    overrides = load_overrides()
    fallback_used = []

    entries = []
    id_counter = 1
    for row in load_all_rows():
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
                non_trick_stats = {k: v for k, v in stats.items() if k != "trick"}
                stat_principale = max(non_trick_stats, key=non_trick_stats.get)
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
            "tier": row.get("Tier", ""),
            "nature": row.get("Nature", ""),
            "description": row.get("Ability Description", ""),
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
