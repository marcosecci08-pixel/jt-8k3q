# JapanTrip — contexte projet

Guide **personnel** (Marco et Nadia) du voyage au Japon, 26 octobre – 7 novembre 2026. Réponses en **français**.
Ce n'est **pas** une app iOS native (Xcode impossible sur le Mac de Marco) : c'est une **web app installable (PWA)**
hors ligne, publiée sur GitHub Pages.

- Site : https://marcosecci08-pixel.github.io/jt-8k3q/ (dépôt public `marcosecci08-pixel/jt-8k3q`, dossier `/docs`)
- Données : **`Data/trip.json` est la source de vérité** (vols, hôtels, jours, takkyubin, aïkido + règles du Hombu,
  `attention`, `toVerify`, `notifications`, villes avec lat/lon). Aucun horaire en dur dans le code.
- `events[]` de chaque jour est déjà dans l'ordre d'affichage (ne pas retrier). Jour courant = fuseau `Asia/Tokyo`.
  Pour tester une date : `?now=2026-10-28T09:00:00+09:00` (attendu : prochaine étape « Meiji Jingu 10h00 »).

## Fichiers
| fichier | rôle |
|---|---|
| `Data/trip.json` | données du voyage (à modifier pour tout changement de contenu) |
| `make_web.py` | copie trip.json → `docs/`, redimensionne les photos (si `Assets/` + `sips`), génère `rappels.ics`, la liste de précache et la version du service worker, injecte la version dans `app.js` |
| `docs/` | site publié : `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `trip.json`, `rappels.ics`, `img/`, `icons/` |
| `Source/` (non versionné) | Word d'origine, ne pas modifier. `Itineraire_Japon_2026_MAJ.docx` = copie mise à jour à la main |
| `Assets/` (non versionné) | photos d'origine |

## Mettre à jour le voyage
1. Modifier `Data/trip.json` (JSON valide : `python3 -m json.tool Data/trip.json`).
2. `python3 make_web.py` puis (optionnel) tester en local : `cd docs && python3 -m http.server 8765`.
3. `git add -A Data docs && git commit -m "…" && git push` — le site se met à jour en 1–2 min.
4. Quand une question de `toVerify[]` est tranchée : corriger la donnée et retirer l'entrée.

Hors ligne : le service worker (`docs/sw.js`) est « réseau d'abord » (3 s) avec cache en secours. L'app se recharge
seule après une mise à jour ; onglet Infos : bouton « Forcer la mise à jour ». Les rappels se prennent en important
`rappels.ics` dans Calendrier (à réimporter après chaque changement d'horaire).
Météo : Open-Meteo (prévisions ~16 jours), dernière valeur gardée en local.

## État des décisions (11 oct 2026)
- Vols : KL1944 BSL→AMS 26/10 10h05–11h40 ; KL0861 AMS→NRT 26/10 14h15 → 27/10 11h45 ;
  AF0279 HND→CDG 6/11 22h55 → 7/11 05h50 ; AF1192 CDG→BSL 7/11 08h50–10h00. Dossier XRYOXU.
- 31/10 : Owakudani → marche Togendai → Hakone Shrine → bateau → téléphérique (9h–15h20), Shinkansen Odawara → Nagoya ~17h (non réservé). Valises Hakone → Kyoto directement (plus d'envoi Nagoya → Kyoto). 1/11 : Ghibli (entrée 10h, départ Nagoya 8h35, retour Kyoto ~18h).
- 3/11 : Kyoto → Nagoya (château, palais Hommaru 13h15–15h) → Hiroshima ~17h50, check-in ~18h10.
- Takkyubin : livraison le lendemain seulement si dépôt la veille avant midi. 2/11 matin (avant 7h45) : valises Kyoto → Mercure Osaka Namba (gardées jusqu'au 4/11, à confirmer) ; plus d'envoi Hiroshima → Osaka.
- 28/10 : cours Doshu 6h30 (hôtel 5h10, dojo 6h00). Enseignants vérifiés sur le planning officiel Hombu.
- Pas de JR Pass (non rentable, Nozomi avec supplément) : Shinkansen achetés à l'unité (smartEX/EX).
- Points encore ouverts : voir `toVerify` (station du dojo, Kyoto 2/11, billets Shinkansen,
  inscription/droit de visiteur au Hombu).

## Règles
- Aucune dépendance tierce, tout embarqué (sauf la météo). Interface en français, identifiants de code en anglais.
- Ne pas « corriger » silencieusement une incohérence : la consigner dans `toVerify`.
- Ne jamais committer `Source/`, `Assets/`, ni de secrets (le dépôt est public).
