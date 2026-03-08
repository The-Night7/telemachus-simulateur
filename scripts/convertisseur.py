import csv
import json

capacites = []

# Ouvre ton fichier CSV
with open('scripts/unodex - unodex.csv', mode='r', encoding='utf-8') as fichier_csv:
    lecteur = csv.DictReader(fichier_csv)
    
    id_counter = 1
    for ligne in lecteur:
        try:
            # On ignore ceux sans pouvoir
            if ligne['Ability'] == 'Aucune' or ligne['Ability'] == '':
                continue
                
            # Les stats de base extraites
            stats = {
                "power": float(ligne['Power'].replace(',', '.')),
                "speed": float(ligne['Speed'].replace(',', '.')),
                "trick": float(ligne['Trick'].replace(',', '.')),
                "recovery": float(ligne['Recovery'].replace(',', '.')),
                "defense": float(ligne['Defense'].replace(',', '.'))
            }
            
            niveau = float(ligne['Level'].replace(',', '.'))
            
            # Identifier la stat principale (la plus haute parmi les stats de base)
            stat_principale = max(stats, key=stats.get)
            
            # Calcul des rapports stats/niveau pour réadapter la stat plus tard
            ratios = {}
            for cle, valeur in stats.items():
                ratios[cle] = valeur / niveau if niveau > 0 else 0
            
            capacites.append({
                "id": id_counter,
                "nom_personnage": ligne['Name'],
                "nom_capacite": ligne['Ability'],
                "niveau": niveau,
                "tier": ligne.get('Tier', ''),
                "stat_principale": stat_principale,
                "stats_de_base": stats,
                "ratios_stats": ratios # On intègre le ratio dans le JSON
            })
            id_counter += 1
        except ValueError:
            continue

# Sauvegarde en JSON
with open('./src/capacites.json', 'w', encoding='utf-8') as f:
    json.dump(capacites, f, indent=4, ensure_ascii=False)

print(f"Génération terminée : {len(capacites)} capacités exportées avec leurs ratios.")