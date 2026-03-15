import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, Zap, Swords, Brain, Heart, ChevronDown, Layers, Lock, Battery, ChevronsUp, Sparkles, Target } from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
type StatKey = 'power' | 'speed' | 'trick' | 'recovery' | 'defense';

type BoostOption = {
  mult: number;
  cost: number;
  label: string;
};

type StatInfo = {
  val: number;
  sourceLevel: number;
  isAutoBoosted: boolean;
  autoBoostMult?: number;
};

// IMPORTANT: Décommentez cette ligne dans votre projet pour utiliser votre propre JSON.
// import capacitesData from './capacites.json'; 

// --- 0. DONNÉES DES CAPACITÉS (Intégrées pour autonomie) ---
const capacitesData = [
    { "id": 1, "nom_personnage": "Uru-chan", "nom_capacite": "Troll", "niveau": 1.2, "type": "Manipulation", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 2.0, "recovery": 0.0, "defense": 1.0 }, "ratios_stats": { "power": 0.833, "speed": 0.833, "trick": 1.666, "recovery": 0.0, "defense": 0.833 } },
    { "id": 2, "nom_personnage": "Evie", "nom_capacite": "Illumination", "niveau": 1.5, "type": "Quantum", "copiable": true, "stat_principale": "recovery", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.666, "speed": 0.666, "trick": 1.333, "recovery": 0.666, "defense": 0.666 } },
    { "id": 3, "nom_personnage": "Lin", "nom_capacite": "Needles", "niveau": 1.8, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.555, "speed": 0.555, "trick": 1.111, "recovery": 0.555, "defense": 0.555 } },
    { "id": 4, "nom_personnage": "Hower", "nom_capacite": "Heat Palm", "niveau": 2.1, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 2.0, "speed": 1.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.952, "speed": 0.476, "trick": 0.952, "recovery": 0.476, "defense": 0.476 } },
    { "id": 5, "nom_personnage": "Rouker", "nom_capacite": "Missiles", "niveau": 2.2, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 3.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.363, "speed": 0.909, "trick": 1.363, "recovery": 0.454, "defense": 0.454 } },
    { "id": 6, "nom_personnage": "Weim", "nom_capacite": "Phantom Fist", "niveau": 2.4, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 2.0, "speed": 1.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.833, "speed": 0.416, "trick": 0.833, "recovery": 0.416, "defense": 0.416 } },
    { "id": 7, "nom_personnage": "Bimel", "nom_capacite": "Rock Arm", "niveau": 2.4, "type": "Enhancement", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 2.0, "speed": 1.0, "trick": 1.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 0.833, "speed": 0.416, "trick": 0.416, "recovery": 0.416, "defense": 0.833 } },
    { "id": 8, "nom_personnage": "Skrev", "nom_capacite": "Strong Kick", "niveau": 2.4, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 1.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.25, "speed": 0.833, "trick": 0.416, "recovery": 0.416, "defense": 0.416 } },
    { "id": 9, "nom_personnage": "Crail", "nom_capacite": "Strong Punch", "niveau": 2.4, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 1.0, "trick": 1.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.666, "speed": 0.416, "trick": 0.416, "recovery": 0.416, "defense": 0.416 } },
    { "id": 10, "nom_personnage": "Wyatt", "nom_capacite": "Charge Shot", "niveau": 2.4, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 1.0, "trick": 2.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 1.25, "speed": 0.416, "trick": 0.833, "recovery": 0.416, "defense": 0.833 } },
    { "id": 11, "nom_personnage": "Bryce", "nom_capacite": "Quick Strike", "niveau": 2.4, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 2.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 0.833, "speed": 0.833, "trick": 0.833, "recovery": 0.416, "defense": 0.833 } },
    { "id": 12, "nom_personnage": "Wenqi", "nom_capacite": "Speed", "niveau": 2.4, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 2.0, "speed": 3.0, "trick": 3.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.833, "speed": 1.25, "trick": 1.25, "recovery": 0.416, "defense": 0.416 } },
    { "id": 13, "nom_personnage": "Juni", "nom_capacite": "Flash Forward", "niveau": 2.5, "type": "Mental", "copiable": false, "stat_principale": "recovery", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 3.0, "recovery": 2.0, "defense": 1.0 }, "ratios_stats": { "power": 0.4, "speed": 0.4, "trick": 1.2, "recovery": 0.8, "defense": 0.4 } },
    { "id": 14, "nom_personnage": "Krolik", "nom_capacite": "Lazor", "niveau": 2.5, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 1.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.2, "speed": 0.4, "trick": 0.8, "recovery": 0.4, "defense": 0.4 } },
    { "id": 15, "nom_personnage": "Keesh", "nom_capacite": "Hair Growth", "niveau": 2.6, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 1.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.384, "speed": 0.769, "trick": 0.769, "recovery": 0.384, "defense": 0.384 } },
    { "id": 16, "nom_personnage": "Clio", "nom_capacite": "Dizzy Punch", "niveau": 2.6, "type": "Status", "copiable": true, "stat_principale": "recovery", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 3.0, "recovery": 2.0, "defense": 1.0 }, "ratios_stats": { "power": 0.384, "speed": 0.384, "trick": 1.153, "recovery": 0.769, "defense": 0.384 } },
    { "id": 17, "nom_personnage": "Rex", "nom_capacite": "Ground Pound", "niveau": 2.6, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.153, "speed": 0.769, "trick": 0.769, "recovery": 0.384, "defense": 0.384 } },
    { "id": 18, "nom_personnage": "Emerson", "nom_capacite": "Hand Blade", "niveau": 2.6, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 2.0, "speed": 2.0, "trick": 3.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.769, "speed": 0.769, "trick": 1.153, "recovery": 0.384, "defense": 0.384 } },
    { "id": 19, "nom_personnage": "Kiara", "nom_capacite": "Barrage", "niveau": 2.7, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 2.0, "speed": 2.0, "trick": 3.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.74, "speed": 0.74, "trick": 1.111, "recovery": 0.37, "defense": 0.37 } },
    { "id": 20, "nom_personnage": "Heinz", "nom_capacite": "Catch Up", "niveau": 2.7, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 2.0, "speed": 3.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.74, "speed": 1.111, "trick": 0.74, "recovery": 0.37, "defense": 0.37 } },
    { "id": 21, "nom_personnage": "Alana", "nom_capacite": "Fortify", "niveau": 2.7, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 1.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 1.111, "speed": 0.74, "trick": 0.37, "recovery": 0.37, "defense": 0.74 } },
    { "id": 22, "nom_personnage": "Illena", "nom_capacite": "Strength", "niveau": 2.7, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 1.481, "speed": 0.74, "trick": 0.74, "recovery": 0.37, "defense": 0.74 } },
    { "id": 23, "nom_personnage": "Yuline", "nom_capacite": "Clobber", "niveau": 2.8, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 1.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 1.071, "speed": 0.714, "trick": 0.357, "recovery": 0.357, "defense": 0.714 } },
    { "id": 24, "nom_personnage": "Waldo", "nom_capacite": "Shockwave", "niveau": 2.8, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.071, "speed": 0.714, "trick": 0.714, "recovery": 0.357, "defense": 0.357 } },
    { "id": 25, "nom_personnage": "Keith", "nom_capacite": "Heavy-Hitter", "niveau": 2.8, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 1.071, "speed": 0.714, "trick": 0.714, "recovery": 0.357, "defense": 0.714 } },
    { "id": 26, "nom_personnage": "Kalum", "nom_capacite": "Phantom Push", "niveau": 2.8, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 3.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.071, "speed": 0.714, "trick": 1.071, "recovery": 0.357, "defense": 0.357 } },
    { "id": 27, "nom_personnage": "Raddix", "nom_capacite": "Archer", "niveau": 2.8, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 1.5, "trick": 3.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.428, "speed": 0.535, "trick": 1.071, "recovery": 0.357, "defense": 0.357 } },
    { "id": 28, "nom_personnage": "Gavin", "nom_capacite": "Stone Skin", "niveau": 2.8, "type": "Transformation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 2.0, "speed": 3.0, "trick": 1.0, "recovery": 1.0, "defense": 4.0 }, "ratios_stats": { "power": 0.714, "speed": 1.071, "trick": 0.357, "recovery": 0.357, "defense": 1.428 } },
    { "id": 29, "nom_personnage": "Sherri", "nom_capacite": "Vigor", "niveau": 2.9, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 2.0, "trick": 1.0, "recovery": 2.0, "defense": 1.0 }, "ratios_stats": { "power": 1.379, "speed": 0.689, "trick": 0.344, "recovery": 0.689, "defense": 0.344 } },
    { "id": 30, "nom_personnage": "Melody", "nom_capacite": "Impact", "niveau": 3.1, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 2.0, "trick": 2.0, "recovery": 2.0, "defense": 1.0 }, "ratios_stats": { "power": 1.29, "speed": 0.645, "trick": 0.645, "recovery": 0.645, "defense": 0.322 } },
    { "id": 31, "nom_personnage": "Tanner", "nom_capacite": "Regeneration", "niveau": 3.1, "type": "Curative", "copiable": true, "stat_principale": "recovery", "stats_de_base": { "power": 2.0, "speed": 1.0, "trick": 3.0, "recovery": 5.0, "defense": 3.0 }, "ratios_stats": { "power": 0.645, "speed": 0.322, "trick": 0.967, "recovery": 1.612, "defense": 0.967 } },
    { "id": 32, "nom_personnage": "Brea", "nom_capacite": "Arcane Shot", "niveau": 3.2, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 2.0, "trick": 2.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.25, "speed": 0.625, "trick": 0.625, "recovery": 0.312, "defense": 0.312 } },
    { "id": 33, "nom_personnage": "Lance", "nom_capacite": "Tremor", "niveau": 3.2, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 2.0, "trick": 3.0, "recovery": 2.0, "defense": 2.0 }, "ratios_stats": { "power": 1.25, "speed": 0.625, "trick": 0.937, "recovery": 0.625, "defense": 0.625 } },
    { "id": 34, "nom_personnage": "Merin", "nom_capacite": "Charge", "niveau": 3.4, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 2.0, "speed": 4.0, "trick": 1.0, "recovery": 2.0, "defense": 4.0 }, "ratios_stats": { "power": 0.588, "speed": 1.176, "trick": 0.294, "recovery": 0.588, "defense": 1.176 } },
    { "id": 35, "nom_personnage": "Elaine", "nom_capacite": "Healing", "niveau": 3.5, "type": "Curative", "copiable": true, "stat_principale": "recovery", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 1.0, "recovery": 7.0, "defense": 3.0 }, "ratios_stats": { "power": 0.285, "speed": 0.285, "trick": 0.285, "recovery": 2.0, "defense": 0.857 } },
    { "id": 36, "nom_personnage": "???", "nom_capacite": "Sleep Touch", "niveau": 3.5, "type": "Alteration", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 2.0, "speed": 3.0, "trick": 5.0, "recovery": 2.0, "defense": 2.0 }, "ratios_stats": { "power": 0.571, "speed": 0.857, "trick": 1.428, "recovery": 0.571, "defense": 0.571 } },
    { "id": 37, "nom_personnage": "Lennon", "nom_capacite": "Conjure: Disks", "niveau": 3.5, "type": "Creation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 3.0, "speed": 2.0, "trick": 4.0, "recovery": 1.3, "defense": 5.0 }, "ratios_stats": { "power": 0.857, "speed": 0.571, "trick": 1.142, "recovery": 0.371, "defense": 1.428 } },
    { "id": 38, "nom_personnage": "Levani", "nom_capacite": "Grenadier", "niveau": 3.6, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 2.0, "trick": 4.0, "recovery": 2.0, "defense": 1.0 }, "ratios_stats": { "power": 1.388, "speed": 0.555, "trick": 1.111, "recovery": 0.555, "defense": 0.277 } },
    { "id": 39, "nom_personnage": "Payton", "nom_capacite": "Superhuman", "niveau": 3.6, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 3.0, "speed": 3.0, "trick": 2.0, "recovery": 3.0, "defense": 3.0 }, "ratios_stats": { "power": 0.833, "speed": 0.833, "trick": 0.555, "recovery": 0.833, "defense": 0.833 } },
    { "id": 40, "nom_personnage": "Abel", "nom_capacite": "Explosion", "niveau": 3.6, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 2.0, "trick": 4.0, "recovery": 2.0, "defense": 3.0 }, "ratios_stats": { "power": 1.111, "speed": 0.555, "trick": 1.111, "recovery": 0.555, "defense": 0.833 } },
    { "id": 41, "nom_personnage": "Zirian", "nom_capacite": "Crescent Slash", "niveau": 3.7, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 3.0, "recovery": 2.0, "defense": 3.0 }, "ratios_stats": { "power": 1.351, "speed": 0.81, "trick": 0.81, "recovery": 0.54, "defense": 0.81 } },
    { "id": 42, "nom_personnage": "Myles", "nom_capacite": "Heal Link", "niveau": 3.8, "type": "Curative", "copiable": true, "stat_principale": "recovery", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 3.0, "recovery": 7.0, "defense": 2.0 }, "ratios_stats": { "power": 0.263, "speed": 0.263, "trick": 0.789, "recovery": 1.842, "defense": 0.526 } },
    { "id": 43, "nom_personnage": "Leena", "nom_capacite": "Fleetstep", "niveau": 3.8, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 3.0, "speed": 4.0, "trick": 5.0, "recovery": 1.0, "defense": 2.0 }, "ratios_stats": { "power": 0.789, "speed": 1.052, "trick": 1.315, "recovery": 0.263, "defense": 0.526 } },
    { "id": 44, "nom_personnage": "Jace", "nom_capacite": "Iron Knuckle", "niveau": 3.8, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 2.0, "trick": 2.0, "recovery": 2.0, "defense": 4.0 }, "ratios_stats": { "power": 1.315, "speed": 0.526, "trick": 0.526, "recovery": 0.526, "defense": 1.052 } },
    { "id": 45, "nom_personnage": "Ezra", "nom_capacite": "Shadow Flame", "niveau": 3.8, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 6.0, "speed": 2.0, "trick": 3.0, "recovery": 2.0, "defense": 2.0 }, "ratios_stats": { "power": 1.578, "speed": 0.526, "trick": 0.789, "recovery": 0.526, "defense": 0.526 } },
    { "id": 46, "nom_personnage": "Kayden", "nom_capacite": "Teleportation", "niveau": 3.8, "type": "Quantum", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 1.0, "speed": 7.0, "trick": 3.0, "recovery": 3.0, "defense": 1.0 }, "ratios_stats": { "power": 0.263, "speed": 1.842, "trick": 0.789, "recovery": 0.789, "defense": 0.263 } },
    { "id": 47, "nom_personnage": "Ventus", "nom_capacite": "Whirlwind", "niveau": 3.8, "type": "Quantum", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 3.0, "speed": 4.0, "trick": 3.0, "recovery": 2.0, "defense": 3.0 }, "ratios_stats": { "power": 0.789, "speed": 1.052, "trick": 0.789, "recovery": 0.526, "defense": 0.789 } },
    { "id": 48, "nom_personnage": "Meili", "nom_capacite": "Demon Claw", "niveau": 3.8, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 3.0, "recovery": 2.0, "defense": 3.0 }, "ratios_stats": { "power": 1.315, "speed": 0.789, "trick": 0.789, "recovery": 0.526, "defense": 0.789 } },
    { "id": 49, "nom_personnage": "???", "nom_capacite": "Heal", "niveau": 3.8, "type": "Curative", "copiable": true, "stat_principale": "recovery", "stats_de_base": { "power": 2.0, "speed": 1.0, "trick": 4.0, "recovery": 6.0, "defense": 2.0 }, "ratios_stats": { "power": 0.526, "speed": 0.263, "trick": 1.052, "recovery": 1.578, "defense": 0.526 } },
    { "id": 50, "nom_personnage": "Gou", "nom_capacite": "Super Strength", "niveau": 4.0, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 6.0, "speed": 3.0, "trick": 1.0, "recovery": 2.0, "defense": 5.0 }, "ratios_stats": { "power": 1.5, "speed": 0.75, "trick": 0.25, "recovery": 0.5, "defense": 1.25 } },
    { "id": 51, "nom_personnage": "Skylar", "nom_capacite": "Demon Blade", "niveau": 4.2, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 6.0, "speed": 3.0, "trick": 3.0, "recovery": 2.0, "defense": 2.0 }, "ratios_stats": { "power": 1.428, "speed": 0.714, "trick": 0.714, "recovery": 0.476, "defense": 0.476 } },
    { "id": 52, "nom_personnage": "Zeke", "nom_capacite": "Phase Shift (Def)", "niveau": 4.2, "type": "Enhancement", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 1.0, "speed": 1.0, "trick": 6.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 0.238, "speed": 0.238, "trick": 1.428, "recovery": 0.714, "defense": 1.19 } },
    { "id": 53, "nom_personnage": "Zeke", "nom_capacite": "Phase Shift (Off)", "niveau": 4.2, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 6.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 1.19, "speed": 0.714, "trick": 1.428, "recovery": 0.238, "defense": 0.238 } },
    { "id": 54, "nom_personnage": "Charlie", "nom_capacite": "Contact Shred", "niveau": 4.2, "type": "Non spécifiée", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 6.0, "speed": 1.5, "trick": 1.5, "recovery": 4.5, "defense": 3.0 }, "ratios_stats": { "power": 1.428, "speed": 0.357, "trick": 0.357, "recovery": 1.071, "defense": 0.714 } },
    { "id": 55, "nom_personnage": "Darren", "nom_capacite": "Nightmare", "niveau": 4.2, "type": "Mental", "copiable": false, "stat_principale": "defense", "stats_de_base": { "power": 1.0, "speed": 2.0, "trick": 5.0, "recovery": 4.0, "defense": 5.0 }, "ratios_stats": { "power": 0.238, "speed": 0.476, "trick": 1.19, "recovery": 0.952, "defense": 1.19 } },
    { "id": 56, "nom_personnage": "Terrence", "nom_capacite": "Invisibility", "niveau": 4.4, "type": "Enhancement", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 1.0, "speed": 3.0, "trick": 10.0, "recovery": 2.0, "defense": 2.0 }, "ratios_stats": { "power": 0.227, "speed": 0.681, "trick": 2.272, "recovery": 0.454, "defense": 0.454 } },
    { "id": 57, "nom_personnage": "Kree", "nom_capacite": "Armor Suit", "niveau": 4.4, "type": "Enhancement", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 4.0, "speed": 3.0, "trick": 4.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 0.909, "speed": 0.681, "trick": 0.909, "recovery": 0.681, "defense": 1.136 } },
    { "id": 58, "nom_personnage": "\"Valorian\"", "nom_capacite": "Royal Guard", "niveau": 4.6, "type": "Creation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 5.0, "recovery": 2.0, "defense": 6.0 }, "ratios_stats": { "power": 1.086, "speed": 0.652, "trick": 1.086, "recovery": 0.434, "defense": 1.304 } },
    { "id": 59, "nom_personnage": "Isen", "nom_capacite": "Hunter", "niveau": 4.8, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 6.0, "speed": 3.0, "trick": 6.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 1.25, "speed": 0.625, "trick": 1.25, "recovery": 0.625, "defense": 1.041 } },
    { "id": 60, "nom_personnage": "Melvin", "nom_capacite": "Spectral Claw", "niveau": 5.0, "type": "Enhancement", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 8.0, "speed": 5.0, "trick": 6.0, "recovery": 2.0, "defense": 3.0 }, "ratios_stats": { "power": 1.6, "speed": 1.0, "trick": 1.2, "recovery": 0.4, "defense": 0.6 } },
    { "id": 61, "nom_personnage": "Rein", "nom_capacite": "Arachnid", "niveau": 5.1, "type": "Creation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 4.0, "speed": 4.0, "trick": 4.0, "recovery": 2.0, "defense": 6.0 }, "ratios_stats": { "power": 0.784, "speed": 0.784, "trick": 0.784, "recovery": 0.392, "defense": 1.176 } },
    { "id": 62, "nom_personnage": "Blyke", "nom_capacite": "Energy Discharge", "niveau": 5.1, "type": "Emission", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 8.0, "speed": 4.0, "trick": 5.0, "recovery": 5.0, "defense": 4.0 }, "ratios_stats": { "power": 1.568, "speed": 0.784, "trick": 0.98, "recovery": 0.98, "defense": 0.784 } },
    { "id": 63, "nom_personnage": "Cecile", "nom_capacite": "Conjure: Vines", "niveau": 5.3, "type": "Creation", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 7.0, "recovery": 4.0, "defense": 5.0 }, "ratios_stats": { "power": 0.943, "speed": 0.566, "trick": 1.32, "recovery": 0.754, "defense": 0.943 } },
    { "id": 64, "nom_personnage": "Isen", "nom_capacite": "Predator", "niveau": 5.3, "type": "Predator", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 7.0, "speed": 4.0, "trick": 6.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 1.32, "speed": 0.754, "trick": 1.132, "recovery": 0.566, "defense": 0.943 } },
    { "id": 65, "nom_personnage": "Candice", "nom_capacite": "Duplication", "niveau": 5.6, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 8.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 0.892, "speed": 0.535, "trick": 1.428, "recovery": 0.535, "defense": 0.892 } },
    { "id": 66, "nom_personnage": "Colt", "nom_capacite": "Imprison", "niveau": 5.6, "type": "Creation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 7.0, "speed": 2.0, "trick": 6.0, "recovery": 4.0, "defense": 7.0 }, "ratios_stats": { "power": 1.25, "speed": 0.357, "trick": 1.071, "recovery": 0.714, "defense": 1.25 } },
    { "id": 67, "nom_personnage": "\"Scorch\"", "nom_capacite": "Psy-Blast+", "niveau": 5.7, "type": "Mental", "copiable": false, "stat_principale": "power", "stats_de_base": { "power": 9.0, "speed": 4.0, "trick": 6.0, "recovery": 2.0, "defense": 3.0 }, "ratios_stats": { "power": 1.578, "speed": 0.701, "trick": 1.052, "recovery": 0.35, "defense": 0.526 } },
    { "id": 68, "nom_personnage": "\"Cinder\"", "nom_capacite": "Azure Storm+", "niveau": 5.8, "type": "Quantique", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 4.0, "speed": 5.0, "trick": 8.0, "recovery": 4.0, "defense": 5.0 }, "ratios_stats": { "power": 0.689, "speed": 0.862, "trick": 1.379, "recovery": 0.689, "defense": 0.862 } },
    { "id": 69, "nom_personnage": "Rei", "nom_capacite": "Lightining", "niveau": 5.8, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 8.0, "speed": 6.0, "trick": 4.0, "recovery": 3.0, "defense": 4.0 }, "ratios_stats": { "power": 1.379, "speed": 1.034, "trick": 0.689, "recovery": 0.517, "defense": 0.689 } },
    { "id": 70, "nom_personnage": "Remi", "nom_capacite": "Lightning", "niveau": 5.8, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 7.0, "speed": 6.0, "trick": 5.0, "recovery": 4.0, "defense": 4.0 }, "ratios_stats": { "power": 1.206, "speed": 1.034, "trick": 0.862, "recovery": 0.689, "defense": 0.689 } },
    { "id": 71, "nom_personnage": "Verte", "nom_capacite": "Demolition", "niveau": 5.8, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 8.0, "speed": 4.0, "trick": 5.0, "recovery": 4.0, "defense": 6.0 }, "ratios_stats": { "power": 1.379, "speed": 0.689, "trick": 0.862, "recovery": 0.689, "defense": 1.034 } },
    { "id": 72, "nom_personnage": "Byron", "nom_capacite": "Botanist", "niveau": 6.0, "type": "Quantum", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 5.0, "speed": 2.0, "trick": 6.0, "recovery": 5.0, "defense": 7.0 }, "ratios_stats": { "power": 0.833, "speed": 0.333, "trick": 1.0, "recovery": 0.833, "defense": 1.166 } },
    { "id": 73, "nom_personnage": "Tarik", "nom_capacite": "Paralysis", "niveau": 6.2, "type": "Quantum", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 3.0, "speed": 4.0, "trick": 10.0, "recovery": 3.0, "defense": 3.0 }, "ratios_stats": { "power": 0.483, "speed": 0.645, "trick": 1.612, "recovery": 0.483, "defense": 0.483 } },
    { "id": 74, "nom_personnage": "Liam", "nom_capacite": "Hydrofreeze", "niveau": 6.2, "type": "Quantum", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 8.0, "recovery": 4.0, "defense": 6.0 }, "ratios_stats": { "power": 0.806, "speed": 0.483, "trick": 1.29, "recovery": 0.645, "defense": 0.967 } },
    { "id": 75, "nom_personnage": "Kuyo", "nom_capacite": "Blademaster", "niveau": 6.3, "type": "Creation", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 9.0, "speed": 5.0, "trick": 5.0, "recovery": 3.0, "defense": 4.0 }, "ratios_stats": { "power": 1.428, "speed": 0.793, "trick": 0.793, "recovery": 0.476, "defense": 0.634 } },
    { "id": 76, "nom_personnage": "Arlo", "nom_capacite": "Barrier", "niveau": 6.5, "type": "Creation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 7.0, "speed": 2.0, "trick": 6.0, "recovery": 3.0, "defense": 9.0 }, "ratios_stats": { "power": 1.076, "speed": 0.307, "trick": 0.923, "recovery": 0.461, "defense": 1.384 } },
    { "id": 77, "nom_personnage": "Leilah", "nom_capacite": "Time Manipulation", "niveau": 6.6, "type": "Quantum", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 7.0, "speed": 9.0, "trick": 7.0, "recovery": 5.0, "defense": 1.0 }, "ratios_stats": { "power": 1.06, "speed": 1.363, "trick": 1.06, "recovery": 0.757, "defense": 0.151 } },
    { "id": 78, "nom_personnage": "Keene", "nom_capacite": "Minefield", "niveau": 6.8, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 8.0, "speed": 4.0, "trick": 12.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 1.176, "speed": 0.588, "trick": 1.764, "recovery": 0.441, "defense": 0.735 } },
    { "id": 79, "nom_personnage": "Kassandra", "nom_capacite": "Particles", "niveau": 6.8, "type": "Creation", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 8.0, "speed": 3.0, "trick": 12.0, "recovery": 4.0, "defense": 5.0 }, "ratios_stats": { "power": 1.176, "speed": 0.441, "trick": 1.764, "recovery": 0.588, "defense": 0.735 } },
    { "id": 80, "nom_personnage": "Sylvia", "nom_capacite": "Sensory Control", "niveau": 7.3, "type": "Status", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 5.0, "speed": 3.0, "trick": 14.0, "recovery": 3.0, "defense": 5.0 }, "ratios_stats": { "power": 0.684, "speed": 0.41, "trick": 1.917, "recovery": 0.41, "defense": 0.684 } },
    { "id": 81, "nom_personnage": "Narisa", "nom_capacite": "Time Manipulation", "niveau": 7.4, "type": "Quantum", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 9.0, "speed": 12.0, "trick": 10.0, "recovery": 5.0, "defense": 1.0 }, "ratios_stats": { "power": 1.216, "speed": 1.621, "trick": 1.351, "recovery": 0.675, "defense": 0.135 } },
    { "id": 82, "nom_personnage": "Valerie", "nom_capacite": "Barrier", "niveau": 7.5, "type": "Creation", "copiable": true, "stat_principale": "defense", "stats_de_base": { "power": 8.0, "speed": 2.0, "trick": 7.0, "recovery": 6.0, "defense": 12.0 }, "ratios_stats": { "power": 1.066, "speed": 0.266, "trick": 0.933, "recovery": 0.8, "defense": 1.6 } },
    { "id": 83, "nom_personnage": "John", "nom_capacite": "Aura Manipulation", "niveau": 7.6, "type": "Detection", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 4.0, "speed": 1.0, "trick": 16.0, "recovery": 1.0, "defense": 1.0 }, "ratios_stats": { "power": 0.526, "speed": 0.131, "trick": 2.105, "recovery": 0.131, "defense": 0.131 } },
    { "id": 84, "nom_personnage": "Vaughn", "nom_capacite": "Telekinesis", "niveau": 7.8, "type": "Quantum", "copiable": true, "stat_principale": "power", "stats_de_base": { "power": 14.0, "speed": 3.0, "trick": 12.0, "recovery": 6.0, "defense": 8.0 }, "ratios_stats": { "power": 1.794, "speed": 0.384, "trick": 1.538, "recovery": 0.769, "defense": 1.025 } },
    { "id": 85, "nom_personnage": "Seraphina", "nom_capacite": "Time Manipulation", "niveau": 8.0, "type": "Quantum", "copiable": true, "stat_principale": "speed", "stats_de_base": { "power": 12.0, "speed": 14.0, "trick": 10.0, "recovery": 9.0, "defense": 2.0 }, "ratios_stats": { "power": 1.5, "speed": 1.75, "trick": 1.25, "recovery": 1.125, "defense": 0.25 } }
];

const statConfig: { key: StatKey, label: string, Icon: React.ElementType, color: string }[] = [
  { key: 'power', label: 'Power', Icon: Swords, color: 'text-red-500' },
  { key: 'speed', label: 'Speed', Icon: Zap, color: 'text-blue-400' },
  { key: 'trick', label: 'Trick', Icon: Brain, color: 'text-purple-500' },
  { key: 'recovery', label: 'Recovery', Icon: Heart, color: 'text-green-400' },
  { key: 'defense', label: 'Defense', Icon: Shield, color: 'text-yellow-600' }
];

// --- LOGIQUE DE TIER ET DE SLOTS DE TELEMACHUS ---
const getTierInfo = (level: number) => {
  if (level < 2.0) return { name: "Low-Tier", slots: 1, color: "text-neutral-400" };
  if (level < 4.0) return { name: "Mid-Tier", slots: 2, color: "text-green-400" };
  if (level < 5.0) return { name: "Elite-Tier", slots: 2, color: "text-blue-400" };
  if (level < 6.0) return { name: "High-Tier", slots: 3, color: "text-purple-400" };
  return { name: "God-Tier", slots: 4, color: "text-yellow-400" };
};

// --- LOGIQUE DE DRAIN D'AURA DE BASE ---
const getAuraCost = (niveau: number) => {
  return parseFloat((niveau * (niveau / 1.5)).toFixed(1));
};

// --- COMPOSANT GRAPHIQUE RADAR SVG ---
const RadarChart = ({ stats, boosts, baseStatsInfo }: { stats: Record<StatKey, number>, boosts: Record<string, number>, baseStatsInfo: Record<StatKey, StatInfo> }) => {
  const maxStat = 10;
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 130; 
  const keys: StatKey[] = ['power', 'speed', 'trick', 'recovery', 'defense'];
  const labels = ['Power', 'Speed', 'Trick', 'Recovery', 'Defense'];

  const getPoints = (statObj: Record<string, number>, clamp: boolean = false) => {
    return keys.map((key, i) => {
      const val = clamp ? Math.min(statObj[key] || 1, maxStat) : (statObj[key] || 1);
      const r = (val / maxStat) * radius;
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  };

  const levels = [2, 4, 6, 8, 10];

  return (
    <div className="relative w-full aspect-square max-w-[450px] mx-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-neutral-950 rounded-full p-4 shadow-2xl border border-neutral-800">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {levels.map(l => (
          <polygon key={l} points={getPoints({power:l, speed:l, trick:l, recovery:l, defense:l}, true)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
        ))}
        {keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          return (
            <line key={`axis-${key}`} x1={cx} y1={cy} x2={cx + radius * Math.cos(angle)} y2={cy + radius * Math.sin(angle)} stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
          )
        })}
        
        {/* Aura Shape */}
        <polygon points={getPoints(stats, false)} fill="rgba(255, 215, 0, 0.3)" stroke="#ffd700" strokeWidth="3" className="transition-all duration-500 ease-in-out drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
        
        {/* Nodes */}
        {keys.map((key, i) => {
          const val = stats[key] || 1;
          const r = (val / maxStat) * radius;
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const isBoosted = boosts[key] > 0 || baseStatsInfo[key].isAutoBoosted;
          
          return (
            <circle 
              key={`pt-${key}`} 
              cx={cx + r * Math.cos(angle)} 
              cy={cy + r * Math.sin(angle)} 
              r={isBoosted ? "7" : "5"} 
              fill={isBoosted ? "#ffd700" : "#121212"} 
              stroke="#ffd700" 
              strokeWidth="2.5" 
              className="transition-all duration-500 ease-in-out" 
            />
          )
        })}
        
        {/* Labels */}
        {keys.map((key, i) => {
          const val = stats[key] || 1;
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const currentRadius = (val / maxStat) * radius;
          const rText = Math.max(radius, currentRadius) + 35; 
          const isBoosted = boosts[key] > 0 || baseStatsInfo[key].isAutoBoosted;
          
          return (
            <text 
              key={`lbl-${key}`} 
              x={cx + rText * Math.cos(angle)} 
              y={cy + rText * Math.sin(angle)} 
              fill={isBoosted ? "#ffffff" : "#ffd700"} 
              fontSize="14" 
              fontWeight="bold" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className={`tracking-wider uppercase opacity-90 transition-all duration-500 ease-in-out ${isBoosted ? 'drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]' : ''}`}
            >
              {labels[i]} {isBoosted && '↑'}
            </text>
          )
        })}
      </svg>
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const [activeTab, setActiveTab] = useState('classic');
  const [potential, setPotential] = useState(9.0);
  const [mastery, setMastery] = useState(6.9);
  const [slots, setSlots] = useState<string[]>(["", "", "", ""]);
  
  const level = useMemo(() => parseFloat(((potential * mastery) / 10).toFixed(1)), [potential, mastery]);
  const [boostState, setBoostState] = useState<Record<string, number>>({ power: 0, speed: 0, trick: 0, recovery: 0, defense: 0 });

  const tierInfo = useMemo(() => getTierInfo(level), [level]);
  const slotsUsed = useMemo(() => slots.filter(s => s !== "").length, [slots]);
  
  const activeBoostsCount = useMemo(() => Object.values(boostState).filter(v => v > 0).length, [boostState]);

  // --- MOTEUR DE FUSION ET IDENTIFICATION DES STATS FORTES/FAIBLES (AVEC POOL DE REPARTITION) ---
  const baseStatsInfo = useMemo(() => {
    let stats: Record<StatKey, StatInfo> = { 
      power: { val: 1, sourceLevel: level, isAutoBoosted: false }, 
      speed: { val: 1, sourceLevel: level, isAutoBoosted: false }, 
      trick: { val: level * 2.414, sourceLevel: level, isAutoBoosted: false }, 
      recovery: { val: 1, sourceLevel: level, isAutoBoosted: false }, 
      defense: { val: 1, sourceLevel: level, isAutoBoosted: false } 
    };
    
    // 1. Récupérer toutes les capacités actuellement équipées
    const equippedCaps = slots
      .map((id, index) => (index < tierInfo.slots && id) ? capacitesData.find(c => c.id === parseInt(id)) : null)
      .filter(c => c !== null && c !== undefined) as typeof capacitesData;

    // 2. CALCUL DES MULTIPLICATEURS (Shine-City)
    const multMap = new Map<number, number>();
    if (activeTab === 'alternative') {
      // Capacités plus faibles ou égales
      const weakerCaps = equippedCaps.filter(cap => cap.niveau <= level).sort((a, b) => a.niveau - b.niveau);
      weakerCaps.forEach((cap, idx) => {
        const diff = level - cap.niveau;
        // Si la capacité est bien plus faible (>= 2 niveaux d'écart) ET c'est la plus faible -> 1.75
        if (idx === 0 && diff >= 2.0) {
          multMap.set(cap.id, 1.75);
        } else if (idx === 0 && diff <= -1.0) {
          multMap.set(cap.id, 1.25);
        } else {
          multMap.set(cap.id, 1.5);
        }
      });

      // Capacités trop complexes (plus fortes que lui)
      const strongerCaps = equippedCaps.filter(cap => cap.niveau > level);
      strongerCaps.forEach(cap => {
        const diff = cap.niveau - level;
        // Si la capacité est bien trop puissante (>= 1 niveau d'écart) -> 1.25
        if (diff >= 1.0) {
          multMap.set(cap.id, 1.25);
        } else {
          multMap.set(cap.id, 1.5);
        }
      });
    }

    // 3. RÉPARTITION GLOBALE DES STATS À BOOSTER (Shine-City)
    const abilityBoostMap = new Map<number, string>();
    if (activeTab === 'alternative') {
      const pool: { id: number, stat: string, val: number }[] = [];
      equippedCaps.forEach(cap => {
        ['power', 'speed', 'recovery', 'defense'].forEach(stat => {
          pool.push({ id: cap.id, stat, val: (cap.stats_de_base as any)[stat] });
        });
      });

      pool.sort((a, b) => {
        if (b.val !== a.val) return b.val - a.val;
        const capA = equippedCaps.find(c => c.id === a.id);
        const capB = equippedCaps.find(c => c.id === b.id);
        return (capB?.niveau || 0) - (capA?.niveau || 0);
      });

      const assignedStats = new Set<string>();

      for (const item of pool) {
        if (!abilityBoostMap.has(item.id) && !assignedStats.has(item.stat)) {
          abilityBoostMap.set(item.id, item.stat);
          assignedStats.add(item.stat);
        }
      }
    }

    // 4. FUSION DES STATS FINALES
    equippedCaps.forEach(cap => {
      const isTelemachusWeaker = level < cap.niveau;
      
      // RÉADAPTATION (Malus si la capacité est plus forte)
      const effectiveLevelForCopy = Math.max(1.0, level - 1.0);

      let currentAutoBoostMult = 1.5;
      let keyToBoost: string | null = null;
      
      if (activeTab === 'alternative') {
        currentAutoBoostMult = multMap.get(cap.id) || 1.5;
        keyToBoost = abilityBoostMap.get(cap.id) || null;
      } else {
        currentAutoBoostMult = 1.5;
        keyToBoost = cap.stat_principale;
      }

      const alreadyAutoBoostedStats = new Set<string>();
      if (keyToBoost) {
        alreadyAutoBoostedStats.add(keyToBoost);
      }

      for (let key in cap.stats_de_base) {
        const baseKey = key as StatKey;
        
        // RÈGLE DE COPIE STRICTE :
        // - Capacité plus forte (isTelemachusWeaker) = Pénalité (ratios * (niveau - 1))
        // - Capacité plus faible/égale = Stats d'origine telles quelles
        let valeurCopiee = 0;
        if (isTelemachusWeaker) {
          valeurCopiee = (cap.ratios_stats as any)[baseKey] * effectiveLevelForCopy;
        } else {
          valeurCopiee = (cap.stats_de_base as any)[baseKey];
        }

        const isBoostedThisStat = baseKey === keyToBoost;
        if (isBoostedThisStat) {
          valeurCopiee *= currentAutoBoostMult;
        }

        // On met à jour la statistique de Telemachus si la valeur est supérieure
        if (valeurCopiee > stats[baseKey].val) {
          stats[baseKey] = { 
            val: valeurCopiee, 
            sourceLevel: cap.niveau, 
            isAutoBoosted: isBoostedThisStat,
            autoBoostMult: isBoostedThisStat ? currentAutoBoostMult : undefined
          };
        } else if (valeurCopiee === stats[baseKey].val && isBoostedThisStat) {
          stats[baseKey].isAutoBoosted = true;
          stats[baseKey].autoBoostMult = currentAutoBoostMult;
        }
      }
    });

    return stats;
  }, [level, slots, tierInfo, activeTab]);

  // --- LOGIQUE DES OPTIONS D'AMPLIFICATION ---
  const getBoostOptions = useCallback((statKey: StatKey): BoostOption[] => {
    const sourceLevel = baseStatsInfo[statKey].sourceLevel;
    const isTelemachusStrong = sourceLevel <= level; 

    let options: BoostOption[] = [];
    if (isTelemachusStrong) {
      if (mastery >= 1.6) options.push({ mult: mastery >= 10 ? 1.3 : 1.25, cost: 1.5, label: mastery >= 10 ? 'x1.3 (Très Faible)' : 'x1.25 (Très Faible)' });
      if (mastery >= 2.5) options.push({ mult: 1.5, cost: 2.5, label: 'x1.5 (Faible)' });
      if (mastery >= 4.0) options.push({ mult: 1.75, cost: 5.0, label: 'x1.75 (Standard)' });
    } else {
      if (mastery >= 6.0) options.push({ mult: 1.05, cost: 2.5, label: 'x1.05 (Faible)' });
      if (mastery >= 7.5) options.push({ mult: mastery >= 10 ? 1.3 : 1.25, cost: 5.0, label: mastery >= 10 ? 'x1.3 (Standard)' : 'x1.25 (Standard)' });
      if (mastery >= 8.5) options.push({ mult: 1.5, cost: 7.5, label: 'x1.5 (Élevé)' });
    }
    return options;
  }, [baseStatsInfo, level, mastery]);

  // --- LOGIQUE DE RÉSERVE D'AURA ---
  const maxAura = useMemo(() => level * 10, [level]);
  
  const currentAuraDrain = useMemo(() => {
    let drain = slots.reduce((total, slotId) => {
      if (!slotId) return total;
      const cap = capacitesData.find(c => c.id === parseInt(slotId));
      return total + (cap ? getAuraCost(cap.niveau) : 0);
    }, 0);
    
    Object.keys(boostState).forEach(key => {
      const idx = boostState[key];
      if (idx > 0) {
        const options = getBoostOptions(key as StatKey);
        if (options[idx - 1]) drain += options[idx - 1].cost;
      }
    });

    return parseFloat(drain.toFixed(1));
  }, [slots, boostState, getBoostOptions]);

  const auraRemaining = parseFloat((maxAura - currentAuraDrain).toFixed(1));
  const auraPercentage = Math.min(100, (currentAuraDrain / maxAura) * 100);

  // --- STATS FINALES APRÈS BOOST ---
  const statsFinales = useMemo(() => {
    let finalStats: Record<StatKey, number> = { power: 1, speed: 1, trick: 1, recovery: 1, defense: 1 };
    
    for (let key in baseStatsInfo) {
      const typedKey = key as StatKey;
      let val = baseStatsInfo[typedKey].val;
      const idx = boostState[typedKey];
      if (idx > 0) {
        const options = getBoostOptions(typedKey);
        if (options[idx - 1]) val *= options[idx - 1].mult;
      }
      finalStats[typedKey] = val; 
    }
    return finalStats;
  }, [baseStatsInfo, boostState, getBoostOptions]);

  // --- ALGORITHME DU NIVEAU EFFECTIF ESTIMÉ (Moyenne Extra + Bridage par Tiers) ---
  const estimatedEffectiveLevel = useMemo(() => {
    const { power, speed, trick, recovery, defense } = statsFinales;

    // 1. Dérivation des Extra Stats (Formules combinées)
    const attackSpeed = power * speed / level;
    const attackCharge = power * recovery / level;
    
    // 2. Somme totale incluant les 5 stats + les 2 extras
    const totalSum = power + speed + recovery + defense + attackSpeed + attackCharge;
    
    // 3. Calcul de la moyenne brute en divisant par 5 (pour matcher la progression)
    let rawLevel = totalSum / 5;

    // Lissage pour les hauts niveaux afin d'éviter une explosion de la valeur
    if (rawLevel > 7.0) {
      rawLevel = 7.0 + (rawLevel - 7.0) * 0.4;
    }

    // 4. Règles strictes de Tiers (basées sur la stat max, sans inclure le 'trick')
    const baseStats = [power, speed, recovery, defense];
    const maxBaseStat = Math.max(...baseStats);
    const statsOver10 = baseStats.filter(s => s >= 10).length;

    let minLvl = 1.0;
    let maxLvl = 10.0;

    if (maxBaseStat <= 2.0) {
      maxLvl = 1.9; // Low tier
    } else if (maxBaseStat <= 4.0) {
      minLvl = 2.0; 
      maxLvl = 3.0; // Mid tier (jusqu'au niveau 3)
    } else if (maxBaseStat <= 5.0) {
      minLvl = 3.1; 
      maxLvl = 3.9; // Mid tier (passé niveau 3)
    } else if (maxBaseStat <= 7.0) {
      minLvl = 4.0; 
      maxLvl = 4.9; // Elite tier
    } else if (maxBaseStat <= 9.9) {
      minLvl = 5.0; 
      maxLvl = 6.9; // High tier & God tier initial (jusqu'à 7.0)
    } else {
      // maxBaseStat >= 10.0 (God tier supérieur)
      if (statsOver10 <= 1) {
        minLvl = 7.0;
        maxLvl = 7.4; 
      } else if (statsOver10 === 2) {
        minLvl = 7.5;
        maxLvl = 8.9; // Niveau 7.5+ avec 2 stats dépassant 10
      } else {
        minLvl = 9.0;
        maxLvl = 10.0; // 3 stats ou + dépassant 10
      }
    }

    // 5. Bridage de la moyenne brute avec les limites dictées par les règles du Tier
    let finalLevel = Math.min(maxLvl, Math.max(minLvl, rawLevel));

    return finalLevel.toFixed(1);
  }, [statsFinales]);


  // --- INTERACTIONS ---
  const updateSlot = (index: number, value: string) => {
    if (!value) {
      const newSlots = [...slots];
      newSlots[index] = "";
      setSlots(newSlots);
      return;
    }

    const cap = capacitesData.find(c => c.id === parseInt(value));
    if (!cap) return;

    const currentSlotVal = slots[index];
    const currentCap = currentSlotVal ? capacitesData.find(c => c.id === parseInt(currentSlotVal)) : null;

    const currentDrainInThisSlot = currentCap ? getAuraCost(currentCap.niveau) : 0;
    const newDrain = getAuraCost(cap.niveau);
    
    const projectedAuraDrain = currentAuraDrain - currentDrainInThisSlot + newDrain;

    if (projectedAuraDrain > maxAura) return;

    const newSlots = [...slots];
    newSlots[index] = value;
    setSlots(newSlots);
  };

  const handleBoostClick = (key: string) => {
    const typedKey = key as StatKey;
    const options = getBoostOptions(typedKey);
    if (options.length === 0) return;

    const currentIdx = boostState[typedKey];
    let nextIdx = currentIdx + 1;

    while (nextIdx <= options.length) {
      const opt = options[nextIdx - 1];
      const oldCost = currentIdx > 0 ? options[currentIdx - 1].cost : 0;
      const netCost = opt.cost - oldCost;

      if (auraRemaining >= netCost) {
        break;
      }
      nextIdx++;
    }

    if (nextIdx > options.length) {
      nextIdx = 0; 
    }

    setBoostState(prev => ({ ...prev, [typedKey]: nextIdx }));
  };

  // Réinitialisation lors du changement de niveau/slots
  useEffect(() => {
    const currentTier = getTierInfo(level);
    if (slotsUsed > currentTier.slots) {
      const newSlots = [...slots];
      for (let i = currentTier.slots; i < 4; i++) {
        newSlots[i] = "";
      }
      setSlots(newSlots);
    }
  }, [level, slotsUsed, activeTab]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 selection:bg-yellow-500/30 pb-20">
      
      {/* En-tête */}
      <div className="max-w-6xl mx-auto mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 tracking-tight mb-2">
          TELEMACHUS PAWN
        </h1>
        <p className="text-neutral-400 font-medium uppercase tracking-widest text-sm md:text-base mb-6">
          Aura Deity - Simulateur de Capacité
        </p>
        
        {/* ONGLETS */}
        <div className="inline-flex bg-neutral-900 border border-neutral-800 p-1 rounded-full shadow-lg">
          <button
            onClick={() => setActiveTab('classic')}
            className={`px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'classic' ? 'bg-yellow-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Système Classique
          </button>
          <button
            onClick={() => setActiveTab('alternative')}
            className={`px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'alternative' ? 'bg-yellow-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Système Shine-City
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* PANNEAU GAUCHE : CONTRÔLES */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-lg font-bold text-neutral-200 block">
                  Niveau Actuel
                </label>
                <span className={`text-sm font-bold uppercase tracking-wider ${tierInfo.color}`}>
                  {tierInfo.name}
                </span>
              </div>
              <div className="text-3xl font-black text-yellow-500">
                {level.toFixed(1)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-neutral-800">
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">Potentiel</label>
                <input 
                  type="number" 
                  value={potential}
                  onChange={(e) => setPotential(parseFloat(e.target.value) || 1)}
                  step="0.1" 
                  min="1.0" 
                  max="10.0"
                  className="w-full bg-neutral-950 text-neutral-200 text-lg font-bold py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">Maîtrise</label>
                <input 
                  type="number" 
                  value={mastery}
                  onChange={(e) => setMastery(parseFloat(e.target.value) || 1)}
                  step="0.1" 
                  min="1.0" 
                  max="10.0"
                  className="w-full bg-neutral-950 text-neutral-200 text-lg font-bold py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="text-neutral-200 font-bold text-lg flex items-center gap-2">
                  <Battery size={20} className={auraPercentage > 90 ? "text-red-500" : "text-yellow-500"} /> 
                  Réserves d'Aura
                </h2>
                <p className="text-xs text-neutral-500 mt-1">L'amplification et la copie drainent l'aura.</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-yellow-500">{auraRemaining}</span>
                <span className="text-neutral-500 text-sm ml-1">/ {maxAura}</span>
              </div>
            </div>
            
            <div className="h-4 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 relative">
              <div 
                className={`h-full transition-all duration-500 ease-out ${auraPercentage > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'}`}
                style={{ width: `${auraPercentage}%` }}
              ></div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ChevronsUp size={16} className="text-yellow-500" />
                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">Amplifications Actives</span>
              </div>
              <span className="text-sm font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                {activeBoostsCount} Stat{activeBoostsCount > 1 ? 's' : ''} Boostée{activeBoostsCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-neutral-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} />
              Auras Copiées ({slotsUsed}/{tierInfo.slots})
            </h2>
            
            {[0, 1, 2, 3].map((index) => {
              const isLocked = index >= tierInfo.slots;
              const slotValue = slots[index];
              const currentCap = slotValue ? capacitesData.find(c => c.id === parseInt(slotValue)) : null;
              const currentSlotDrain = currentCap ? getAuraCost(currentCap.niveau) : 0;
              const levelDiff = currentCap ? (level - currentCap.niveau) : 0;

              return (
                <div key={index} className="relative group">
                  <select
                    value={slotValue}
                    onChange={(e) => updateSlot(index, e.target.value)}
                    disabled={isLocked}
                    className={`w-full appearance-none bg-neutral-950 border py-3 pl-4 pr-32 md:pr-40 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all font-medium
                      ${isLocked 
                        ? 'border-neutral-800 text-neutral-600 cursor-not-allowed bg-neutral-950/50' 
                        : 'border-neutral-700 text-neutral-200 cursor-pointer focus:border-yellow-500 hover:border-neutral-600'}`}
                  >
                    <option value="">-- Emplacement Vide --</option>
                    {!isLocked && capacitesData.map(cap => {
                      const cost = getAuraCost(cap.niveau);
                      const isTooExpensive = (currentAuraDrain - currentSlotDrain + cost) > maxAura;
                      return (
                        <option key={cap.id} value={cap.id} disabled={(slots.includes(cap.id.toString()) && slotValue !== cap.id.toString()) || (isTooExpensive && slotValue !== cap.id.toString())}>
                          {cap.nom_capacite} - Niv {cap.niveau} {slots.includes(cap.id.toString()) && slotValue !== cap.id.toString() ? "(Déjà équipé)" : isTooExpensive && slotValue !== cap.id.toString() ? "[Aura Insuffisante]" : ""}
                        </option>
                      )
                    })}
                  </select>
                  
                  {slotValue && currentCap && !isLocked && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2">
                      <div className={`text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-1 rounded-md border ${
                        levelDiff >= 0 
                          ? 'text-green-400 bg-green-400/10 border-green-400/20' 
                          : 'text-red-400 bg-red-400/10 border-red-400/20'
                      }`} title="Différence de niveau (Telemachus vs Capacité)">
                        {levelDiff > 0 ? '+' : ''}{levelDiff.toFixed(1)} Niv
                      </div>
                      <div className="text-[10px] md:text-xs font-bold text-yellow-500/70 bg-yellow-500/10 px-1.5 md:px-2 py-1 rounded-md border border-yellow-500/20" title="Coût en Aura">
                        -{getAuraCost(currentCap.niveau)}
                      </div>
                    </div>
                  )}
                  
                  {isLocked ? (
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-700 pointer-events-none" size={18} />
                  ) : (
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" size={20} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANNEAU DROIT : VISUALISATION */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative">
          
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm w-fit">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Aura Jaune</span>
            </div>
            
            {activeTab === 'alternative' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg shadow-sm w-fit">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Boost Passif Actif</span>
              </div>
            )}
          </div>

          <div className="w-full mb-2 mt-12 md:mt-6">
            <RadarChart stats={statsFinales} boosts={boostState} baseStatsInfo={baseStatsInfo} />
          </div>

          {/* AJOUT : LIGNE DU NIVEAU EFFECTIF ESTIMÉ */}
          <div className="w-full flex justify-end mb-3 pr-2">
            <div className="flex items-center gap-2 text-[13px] text-neutral-400 font-medium">
              <Target size={14} className="opacity-70" />
              <span>Estimated Effective Level :</span>
              <span className="font-black text-yellow-500 ml-1">{estimatedEffectiveLevel}</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-3">
            {statConfig.map(({ key, label, Icon, color }) => {
              const currentIdx = boostState[key];
              const isBoosted = currentIdx > 0;
              const isAutoBoosted = baseStatsInfo[key].isAutoBoosted;
              const autoBoostMult = baseStatsInfo[key].autoBoostMult;
              
              const options = getBoostOptions(key);
              const isUnboostable = options.length === 0;
              const cannotAffordInitial = !isBoosted && (auraRemaining < (options[0]?.cost || 999));

              return (
                <div key={key} className={`bg-neutral-950 border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group transition-colors duration-300
                  ${isBoosted || isAutoBoosted ? 'border-yellow-500 bg-yellow-500/10' : 'border-neutral-800'}`}>
                  
                  {isAutoBoosted && (
                    <div className="absolute top-1 right-1 flex items-center gap-1 text-yellow-400/80 bg-yellow-500/10 px-1.5 py-0.5 rounded-bl-lg" title={`Boost passif x${autoBoostMult} sur la stat forte`}>
                      <span className="text-[10px] font-bold">x{autoBoostMult}</span>
                      <Sparkles size={12} />
                    </div>
                  )}
                  
                  <Icon size={20} className={`mb-2 mt-1 ${isBoosted || isAutoBoosted ? 'text-yellow-500' : color} opacity-80`} />
                  <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1">{label}</span>
                  <span className={`text-xl font-black ${isBoosted || isAutoBoosted ? 'text-yellow-400' : 'text-neutral-100'}`}>
                    {statsFinales[key].toFixed(1)}
                  </span>

                  <button 
                    onClick={() => handleBoostClick(key)}
                    disabled={isUnboostable || cannotAffordInitial}
                    className={`mt-3 w-full py-2 px-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center transition-all leading-tight
                      ${isBoosted 
                        ? 'bg-yellow-500 text-neutral-950 hover:bg-yellow-400' 
                        : isUnboostable || cannotAffordInitial
                          ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800' 
                          : 'bg-neutral-900 text-neutral-400 hover:text-yellow-500 border border-neutral-700 hover:border-yellow-500/50'
                      }`}
                  >
                    <div className="flex items-center gap-1">
                      <ChevronsUp size={12} />
                      {isBoosted 
                        ? options[currentIdx - 1].label.split(' ')[0] 
                        : isUnboostable 
                          ? 'Non Dispo' 
                          : 'Amplifier'
                      }
                    </div>
                    {isBoosted && (
                      <span className="opacity-80 mt-0.5 text-[8px]">
                        {options[currentIdx - 1].label.split(' ').slice(1).join(' ')}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}