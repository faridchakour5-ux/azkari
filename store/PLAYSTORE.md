# Publier « صلاتي » sur le Google Play Store

L'application est une PWA. Pour le Play Store, on l'emballe en **TWA** (Trusted Web Activity).

## 0. Prérequis
- Compte **Google Play Developer** (25 $, une seule fois) : https://play.google.com/console
- URL publique de l'app : `https://adkar1.pages.dev/`
- URL politique de confidentialité : `https://adkar1.pages.dev/privacy.html`

## 1. Générer le package Android (le plus simple : PWABuilder)
1. Aller sur https://www.pwabuilder.com
2. Coller `https://adkar1.pages.dev/` → **Start**.
3. Onglet **Android** → **Generate Package**.
   - Package ID : `app.salaty.twa` (doit correspondre à `assetlinks.json`).
   - App name : `صلاتي`.
   - Laisser « Signing key » = **Create new** (PWABuilder génère la clé et fournit l'empreinte).
4. Télécharger le ZIP. Il contient :
   - `app-release-signed.aab`  ← à téléverser sur Play.
   - `assetlinks.json`         ← contient l'empreinte SHA‑256.
   - `signing.keystore` + mot de passe ← **À CONSERVER précieusement** (sans lui, pas de mises à jour).

## 2. Activer le lien app ↔ site (Digital Asset Links)
1. Ouvrir le `assetlinks.json` fourni par PWABuilder, copier la valeur **sha256_cert_fingerprints**.
2. La coller dans `/.well-known/assetlinks.json` du dépôt (remplacer le texte
   `REMPLACER_PAR_EMPREINTE_SHA256_DE_LA_CLE_DE_SIGNATURE`), garder `package_name` = `app.salaty.twa`.
3. Pousser → le fichier sera servi sur `https://adkar1.pages.dev/.well-known/assetlinks.json`.
   (Sinon la barre d'adresse du navigateur restera visible dans l'app.)

> ⚠️ Si Play active **« Play App Signing »** (recommandé), Google re-signe l'app : récupère
> l'empreinte SHA‑256 dans **Play Console → Release → Setup → App signing**, et ajoute-la
> AUSSI dans `sha256_cert_fingerprints` (le tableau peut contenir plusieurs empreintes).

## 3. Créer l'app dans la Play Console
- **Create app** → nom `صلاتي`, langue par défaut Arabe, type App, gratuit.
- **Téléverser l'AAB** dans une release (Internal testing d'abord, puis Production).
- Remplir les sections obligatoires :
  - **Privacy policy** : `https://adkar1.pages.dev/privacy.html`
  - **Data safety** : « Aucune donnée collectée / Aucune donnée partagée » (tout est local).
  - **Content rating** : questionnaire (app religieuse, tout public).
  - **App category** : Lifestyle (ou Books & Reference).
  - **Captures d'écran** : utiliser celles de `store/screenshots/` (≥ 2, format téléphone).
  - **Icône 512×512** : `icons/icon-512.png`.
  - **Feature graphic 1024×500** : à créer (bandeau de présentation).

## 4. Tester puis publier
- D'abord **Internal testing** : installer, vérifier que la barre d'URL a disparu (assetlinks OK) et que tout marche hors-ligne.
- Puis promouvoir en **Production**.

## Fichiers déjà préparés dans ce dépôt
- `privacy.html` — politique de confidentialité (AR + FR).
- `.well-known/assetlinks.json` — gabarit (empreinte à compléter, étape 2).
- `manifest.json` — nom = « صلاتي », icônes 192/512 + maskable.
- `store/screenshots/` — captures prêtes pour la fiche.
