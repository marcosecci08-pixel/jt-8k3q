# Cahier des charges — « Voyage au Japon 2026 »

Application iOS personnelle qui guide Marco et Nadia au jour le jour pendant leur voyage au Japon
(26 octobre – 7 novembre 2026). Usage privé, deux utilisateurs, aucune publication sur l'App Store prévue.

## 1. Objectifs

1. Ouvrir l'app et voir **immédiatement ce qui se passe aujourd'hui** et **la prochaine étape**.
2. Fonctionner **100 % hors ligne** (données et photos embarquées dans l'app). Le Wi-Fi n'est pas garanti au Japon.
3. Ouvrir n'importe quelle adresse dans **Plans** (Apple Maps) en un tap.
4. Ne rien oublier de la logistique : **takkyubin** (envoi des bagages), check-in/out, horaires de cours d'aïkido.
5. Être **fiable et lisible** en marchant dans la rue, d'une main, au soleil : gros caractères, fort contraste, mode sombre.

## 2. Plateforme et choix techniques

| Sujet | Choix |
|---|---|
| Cible | iOS 17 minimum, iPhone uniquement (iPad non requis) |
| Langage / UI | Swift 5.9+, SwiftUI |
| Données | `Data/trip.json` embarqué dans le bundle, décodé avec `Codable`. Aucune base distante. |
| État utilisateur | Cases cochées (takkyubin envoyé, étape faite), notes perso : `SwiftData` ou `@AppStorage`/UserDefaults (le plus simple qui marche). |
| Cartes | Liens vers Plans via `MKMapItem` / `maps://?q=` à partir de `mapQuery`. Pas de carte embarquée en v1. |
| Notifications | `UserNotifications` (notifications **locales** uniquement), programmées depuis `notifications[]` du JSON. |
| Dépendances | Aucune bibliothèque tierce. |
| Langue | Interface en **français**. Identifiants de code en anglais. |

## 3. Données

`Data/trip.json` est la **source de vérité** (déjà rempli depuis `Source/Itineraire_Japon_2026.docx`).
Ne jamais coder en dur un horaire, un hôtel ou une activité dans les vues.

Structure (voir le fichier pour les valeurs) :

- `trip` : titre, voyageurs, dates, `timezone` (`Asia/Tokyo`), référence de dossier, image de couverture.
- `flights[]` : vol, aéroports (code + fuseau), départ/arrivée (date + heure **locales**).
- `hotels[]` : nom, quartier, check-in/out, nuits, `mapQuery`.
- `cities[]` : bandeau de chaque ville (nom, dates, image, note « Base : … »).
- `days[]` : un jour = `date`, `label`, `title`, `city`, `overnightHotel`, `alerts[]`, `images[]`, `events[]`.
  - `events[]` est **déjà dans l'ordre d'affichage** : ne pas retrier par heure.
  - Événement : `time` (« HH:mm » ou `null`), `approx` (heure « ~ »), `slot` (`morning`/`afternoon`/`evening` quand pas d'heure), `endTime`, `title`, `detail`, `category`, `optional`, `duration`, `cost`, `mapQuery`.
  - `category` ∈ `flight`, `transport`, `hotel`, `sightseeing`, `food`, `aikido`, `onsen`, `hike`, `shopping`, `logistics`.
- `takkyubin` : texte d'info + `shipments[]` (quand, de, vers, livraison, pourquoi, `key` pour l'envoi crucial du 2 nov).
- `aikido` : dojo (adresse, tél., site), trajet depuis l'hôtel, cours par date, avertissement.
- `attention[]` : points d'attention du dossier d'origine.
- `toVerify[]` : **incohérences relevées dans le dossier** (voir §6) — à afficher dans l'app tant qu'elles ne sont pas levées.
- `notifications[]` : rappels locaux proposés (date, heure, fuseau, titre, texte).

Les photos sont dans `Assets/` (référencées par nom de fichier dans le JSON). À importer dans le catalogue d'assets Xcode ou en ressources du bundle, et à **redimensionner à ≤ 1600 px de large** pour alléger l'app.

## 4. Écrans

Navigation : `TabView` à 5 onglets.

### 4.1 Aujourd'hui (onglet par défaut)
- Détermine le jour courant à partir de la date **dans le fuseau `Asia/Tokyo`** (et pas celui du téléphone, qui peut rester sur Paris au départ).
- **Avant le voyage** : compte à rebours en jours jusqu'au 26 oct, aperçu du premier jour, liste « à préparer » (voir `toVerify`).
- **Pendant** : titre du jour, bandeau d'alertes (`alerts`), **carte « Prochaine étape »** bien visible (première étape dont l'heure n'est pas passée), puis la chronologie du jour.
- **Après le voyage** : écran de remerciement avec `trip.farewell`.
- Bouton « Voir le jour précédent / suivant ».

### 4.2 Programme
- Liste des 13 jours groupés par ville (avec le bandeau `cities[]`), chaque ligne : date, titre, ville, nuit à l'hôtel.
- Tap → **Détail du jour** (même vue que « Aujourd'hui », pour n'importe quelle date).

### 4.3 Détail du jour / chronologie
- Une ligne par événement : heure (avec « ~ » si `approx`, plage si `endTime`), icône selon `category`, titre, détail, durée, coût.
- `optional` : style atténué + pastille « Optionnel ».
- Bouton **« Ouvrir dans Plans »** quand `mapQuery` est présent.
- Case à cocher « fait » (état local) sur chaque étape.
- Les événements `aikido` ont une couleur dédiée (🥋), les `logistics` aussi (📦).
- Photos du jour (`images[]`) en haut, en carrousel.

### 4.4 Infos pratiques
- **Vols** : numéro, horaires locaux, aéroports, référence `XRYOXU` (copiable), avertissement Haneda ≠ Osaka.
- **Hôtels** : nom, quartier, check-in/out, bouton Plans, bouton « Copier le nom » (pratique pour montrer à un chauffeur de taxi).
- Mini-lexique japonais (optionnel, v2) : « Où est… ? », « L'addition », etc.

### 4.5 Bagages (takkyubin)
- Texte d'info (coût, principe) + les 5 envois sous forme de cases à cocher « Envoyé ».
- L'envoi `key` (2 nov) mis en évidence.
- Rappel de la contrainte : toujours garder un sac cabine pour la nuit et le lendemain matin.
- L'envoi `tk2` porte le drapeau `toVerify` : afficher une pastille « à confirmer ».

### 4.6 Aïkido
- Fiche Hombu Dojo : adresse (copiable en un tap, utile pour montrer à un chauffeur), téléphone, site, bouton Plans.
- Trajet depuis l'hôtel étape par étape.
- Tableau des cours (date, heure, enseignant, note) ; mettre en avant **Doshu**.
- Avertissement : vérifier le planning d'octobre sur aikikai.or.jp.

### 4.7 « À vérifier »
- Accessible depuis un bandeau en tête de l'onglet Aujourd'hui tant qu'il reste des éléments non résolus.
- Liste `toVerify[]` avec gravité (`high`/`medium`/`info`), jours concernés et une case « Résolu » (état local).
- Tap sur un jour concerné → ouvre ce jour.

## 5. Notifications locales

- Demande d'autorisation au premier lancement, avec une phrase d'explication.
- Programmer les entrées de `notifications[]` avec `UNCalendarNotificationTrigger`, en utilisant `DateComponents` **avec le `timeZone` de l'entrée** (donc `Asia/Tokyo`, ou `Europe/Paris` pour le départ), non répétitif.
- Réglage dans l'app : activer/désactiver les rappels.
- Ne programmer que les dates futures ; reprogrammer à chaque lancement (idempotent : supprimer puis recréer).

## 6. Éléments à vérifier relevés dans le dossier Word

Ils sont déjà dans `toVerify[]`. Résumé :

1. **Vol retour AF0279** : 23h30 (vols + plan du 6 nov) contre « 01h00 » (encadré du 6 nov). Le JSON retient 23h30.
2. **Odawara → Nagoya (31 oct)** : le Nozomi ne s'arrête pas à Odawara → Hikari/Kodama. Horaire de 12h30 à recaler.
3. **Takkyubin Hakone → Nagoya livré le jour même** : douteux ; la chaîne de bagages de la suite en dépend.
4. **Ghibli Park (1er nov)** : le trajet depuis Nagoya prend ~1h, pas 30 min ; billets à acheter à l'avance.
5. **Station du Hombu Dojo** : « Wakamatsuakebonobashi » → Wakamatsu-Kawada (Oedo, sortie Kawada). Durée du trajet à recalculer.
6. **Cours Doshu** : départ hôtel 5h00 ou 5h55 ? Le JSON retient 5h55.
7. **Kyoto 2 nov** : Chemin des Philosophes (est) → Sagano (ouest) en 1h, très serré.
8. **Titre de transport** pour les Nozomi : JR Pass mentionné dans le dossier, à vérifier.

Quand l'une de ces questions est tranchée, **corriger `trip.json`** (et retirer l'entrée de `toVerify`), pas le code.

## 7. Design

- Sobre et japonisant : fond clair chaud / mode sombre complet, une couleur d'accent (rouge vermillon `#C8102E` ou proche), typographie système (SF) en grande taille, **Dynamic Type** respecté.
- Mettre les photos en valeur (bandeaux de ville, carrousel du jour) sans nuire à la lisibilité.
- Cibles tactiles ≥ 44 pt, contraste AA minimum, VoiceOver correct sur les lignes d'événements.
- Texte japonais : `良い旅を！` en pied de page ; prévoir la police système japonaise (automatique).

## 8. Structure du projet suggérée

```
JapanTrip/
├─ JapanTripApp.swift            // @main, TabView, injection du TripStore
├─ Models/
│  ├─ Trip.swift                 // Codable : Trip, Flight, Hotel, City, Day, Event, Takkyubin, Aikido…
│  └─ Category+UI.swift          // icône SF Symbol + couleur par catégorie
├─ Services/
│  ├─ TripStore.swift            // charge trip.json, jour courant (Asia/Tokyo), prochain événement
│  ├─ UserState.swift            // cases cochées, « résolu », notes
│  ├─ NotificationScheduler.swift
│  └─ MapsLauncher.swift         // ouvrir Plans à partir d'un mapQuery
├─ Views/
│  ├─ TodayView.swift
│  ├─ ProgramView.swift
│  ├─ DayDetailView.swift
│  ├─ EventRow.swift
│  ├─ InfoView.swift             // vols + hôtels
│  ├─ LuggageView.swift          // takkyubin
│  ├─ AikidoView.swift
│  └─ ToVerifyView.swift
├─ Resources/
│  ├─ trip.json                  // copie de Data/trip.json
│  └─ Assets.xcassets            // photos redimensionnées
└─ JapanTripTests/
   ├─ TripDecodingTests.swift    // le JSON se décode, 13 jours, ordre des dates
   └─ TodayLogicTests.swift      // jour courant / prochain événement avec des dates injectées
```

Principe : la logique du « jour courant » et du « prochain événement » prend la date **en paramètre**
(`now: Date`) pour être testable sans attendre le voyage.

## 9. Critères de réussite (v1)

- [ ] L'app compile sans avertissement bloquant et se lance dans le simulateur iPhone.
- [ ] `trip.json` se décode ; les tests unitaires passent.
- [ ] Avec une date simulée au 28 oct 2026 à 9h (heure du Japon), « Aujourd'hui » affiche le jour 28 oct et la prochaine étape « Meiji Jingu 10h00 ».
- [ ] Mode avion : tout s'affiche, photos comprises.
- [ ] Chaque `mapQuery` ouvre Plans avec une recherche pertinente.
- [ ] Les notifications se programment aux bonnes heures japonaises (vérifier avec `getPendingNotificationRequests`).
- [ ] Installée sur l'iPhone de Marco (compte Apple gratuit : expire au bout de 7 jours, à réinstaller ; compte payant : sans limite).

## 10. Hors périmètre v1 (idées pour plus tard)

- Widget écran d'accueil / écran verrouillé « prochaine étape » (WidgetKit).
- Live Activity pour les jours de transport (Shinkansen, Haneda).
- Cartes hors ligne et coordonnées GPS précises (compléter `mapQuery` par `lat`/`lon`).
- Adresses complètes des hôtels (à reprendre des confirmations de réservation).
- Partage de l'état (cases cochées) entre les iPhones de Marco et Nadia via iCloud.
- Convertisseur yen ↔ euro, lexique, numéros utiles.
