# JapanTrip — contexte pour Claude Code

Application iOS **personnelle** (Marco et Nadia) qui guide un voyage au Japon, jour par jour,
du 26 octobre au 7 novembre 2026. Usage privé, pas de publication App Store.

**À lire d'abord** : `SPEC.md` (cahier des charges), puis `Data/trip.json` (toutes les données du voyage).

## Règles du projet

- **SwiftUI**, iOS 17 minimum, iPhone uniquement. **Aucune dépendance tierce.**
- **Hors ligne d'abord** : tout est embarqué (JSON + photos). Aucun appel réseau.
- `Data/trip.json` est la **source de vérité**. Pas d'horaire, d'hôtel ou d'activité codés en dur dans les vues.
  Pour changer le contenu du voyage, on modifie le JSON, pas le code. Garder `Resources/trip.json` du projet synchronisé avec `Data/trip.json`.
- `events[]` de chaque jour est **déjà dans l'ordre d'affichage** : ne pas retrier par heure.
- Le « jour courant » se calcule dans le fuseau **`Asia/Tokyo`**. Toute logique dépendant de la date prend `now: Date` en paramètre (testable).
- Interface en **français**. Identifiants de code en anglais. Commentaires courts, en français ou en anglais.
- Respecter Dynamic Type, le mode sombre, VoiceOver. Cibles tactiles ≥ 44 pt.
- Ne pas modifier `Source/` (le Word d'origine) ni les photos d'origine de `Assets/` ; travailler sur des copies redimensionnées (≤ 1600 px de large) dans le catalogue d'assets.

## Méthode de travail

1. Avancer par petites étapes ; **compiler après chaque étape** et corriger les erreurs avant de continuer.
2. Lancer les tests (`JapanTripTests`) à chaque étape où de la logique change.
3. Trouver un simulateur iPhone disponible avec `xcrun simctl list devices available`, ne pas supposer un nom de modèle.
4. Vérifier visuellement dans le simulateur (captures d'écran) pour les écrans principaux : Aujourd'hui, Programme, Détail d'un jour, Bagages, Aïkido.
5. Petits commits (`git`), messages en français, un sujet par commit.
6. Avant toute action sensible (installation d'outil, modification de réglages Xcode/signature, suppression de fichiers), demander à Marco.

## Points d'attention connus

Le dossier d'origine contient des incohérences, déjà consignées dans `trip.json › toVerify` et résumées dans `SPEC.md §6`.
**Ne pas les « corriger » silencieusement dans le code** : les afficher dans l'app (écran « À vérifier ») jusqu'à ce que Marco tranche, puis mettre à jour le JSON.

## Commandes utiles

```bash
# Simulateurs disponibles
xcrun simctl list devices available

# Compiler (adapter le schéma et la destination)
xcodebuild -scheme JapanTrip -destination 'platform=iOS Simulator,name=<un iPhone disponible>' build

# Tests
xcodebuild -scheme JapanTrip -destination 'platform=iOS Simulator,name=<un iPhone disponible>' test

# Valider le JSON
python3 -m json.tool Data/trip.json > /dev/null && echo "JSON valide"
```
