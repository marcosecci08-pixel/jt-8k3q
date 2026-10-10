# Démarrer avec Claude Code (sur le Mac)

## 0. À vérifier avant de commencer (5 min)

- **Version de macOS de l'iMac** (menu  > À propos de ce Mac). Un iMac 27 pouces de 2019 ne dépasse pas macOS Sequoia (15) : c'est à confirmer, car **la version d'Xcode installable en dépend**.
- **Version d'iOS de l'iPhone** (Réglages > Général > Informations). Xcode doit être assez récent pour piloter cet iOS. Si l'iPhone est en iOS plus récent que ce que ton Xcode supporte, l'installation sur le téléphone sera refusée (le simulateur, lui, fonctionne).
- Si ça coince : **plan B = web app** à ajouter à l'écran d'accueil de l'iPhone, sans Xcode. Les mêmes fichiers (`trip.json`, photos) servent de base.

## 1. Installer ce qu'il faut

1. **Xcode** depuis le Mac App Store (gratuit). L'ouvrir une fois pour accepter la licence et installer les composants.
2. **Claude Code** sur le Mac, en suivant la documentation officielle d'installation.
3. (Pour installer sur ton iPhone) dans Xcode : *Réglages > Comptes* → ajouter ton identifiant Apple. Un compte gratuit suffit : l'app expire au bout de 7 jours et doit être réinstallée. Le compte payant (99 $/an) supprime cette limite.

## 2. Préparer le projet

1. Copier le dossier **JapanTrip** (celui-ci) sur le Mac, par exemple dans `Documents`.
2. Dans Xcode : *File > New > Project > iOS > App*. Nom **JapanTrip**, Interface **SwiftUI**, langage **Swift**, *Include Tests* coché. L'enregistrer **dans le dossier JapanTrip** (Xcode crée un sous-dossier ; c'est normal).
   - Avec Xcode 16 et plus, les fichiers ajoutés dans ce dossier apparaissent automatiquement dans le projet, ce qui simplifie le travail de Claude Code.
3. Fermer Xcode (ou le laisser ouvert, peu importe).

## 3. Lancer Claude Code

Dans le Terminal :

```bash
cd ~/Documents/JapanTrip
claude
```

Puis coller le prompt ci-dessous.

## 4. Prompt de démarrage

```
Lis CLAUDE.md, puis SPEC.md, puis Data/trip.json.

Le projet Xcode « JapanTrip » (SwiftUI, iOS 17+) existe déjà dans ce dossier. Construis l'application décrite dans SPEC.md,
en suivant la structure du §8, par étapes. Après CHAQUE étape : compile, corrige les erreurs, lance les tests, puis passe à la suivante.

Étapes :
1. Modèles Codable pour tout trip.json + TripStore qui charge le JSON embarqué (copier Data/trip.json dans les ressources de l'app). Tests de décodage (13 jours, dates croissantes).
2. Logique « jour courant » (fuseau Asia/Tokyo) et « prochaine étape », avec la date passée en paramètre. Tests unitaires, dont : 28 oct 2026 à 9h (heure du Japon) → prochaine étape « Meiji Jingu 10h00 ».
3. Onglets Aujourd'hui, Programme, Détail d'un jour (chronologie, icônes par catégorie, bouton « Ouvrir dans Plans », cases « fait »).
4. Onglets Infos (vols, hôtels), Bagages (takkyubin avec cases à cocher), Aïkido, écran « À vérifier ».
5. Photos : copier Assets/ dans le catalogue d'assets en les redimensionnant à ≤ 1600 px, les afficher en bandeaux de ville et en carrousel du jour.
6. Notifications locales depuis notifications[] (fuseau de chaque entrée).
7. Finitions : mode sombre, Dynamic Type, VoiceOver, icône d'app simple (couleur d'accent + kanji 旅).

Dans le simulateur, vérifie visuellement les écrans principaux avec des captures d'écran et corrige ce qui est laid ou illisible.
À la fin, dis-moi exactement ce que je dois faire pour l'installer sur mon iPhone (signature, mode développeur, confiance dans le profil).
Demande-moi avant d'installer un outil ou de toucher aux réglages de signature.
```

## 5. Installer sur l'iPhone

1. Brancher l'iPhone au Mac par câble, le déverrouiller, accepter « Faire confiance à cet ordinateur ».
2. Sur l'iPhone : *Réglages > Confidentialité et sécurité > Mode développeur* → activer, redémarrer.
3. Dans Xcode : choisir l'iPhone comme destination, onglet *Signing & Capabilities* → cocher *Automatically manage signing*, choisir ton équipe (« Personal Team »), puis **Run**.
4. Sur l'iPhone : *Réglages > Général > VPN et gestion de l'appareil* → faire confiance au profil développeur.
5. Mettre l'app sur l'iPhone de Nadia : même procédure avec son téléphone branché (ou refaire l'installation après).

## 6. Pour faire évoluer le voyage

- Un horaire ou une adresse change : modifier `Data/trip.json` (ou demander à Claude, ici ou dans Claude Code), puis recompiler.
- Un doute du dossier est tranché : corriger la donnée et retirer l'entrée correspondante de `toVerify`.
