# Réponses prêtes pour les questionnaires de Play Console — «صلاتي» (app.salaty.twa)

Dernière mise à jour : 6 octobre 2026. Chaque réponse est tirée du comportement réel de l'application (code + `privacy.html`).
Si l'application change (nouvelle permission, nouvelle collecte), ce fichier doit être mis à jour avant d'envoyer une nouvelle version.

Politique de confidentialité à indiquer : **https://salatee.org/privacy.html**

## 1. Contenu de l'application

| Question | Réponse |
|---|---|
| Accès à l'application | Tout est accessible sans compte ni identifiant (aucun accès restreint). |
| Publicités | **Non**, l'application ne contient aucune publicité. |
| Public cible | 13 ans et plus (adolescents et adultes). Pas conçue pour les enfants. |
| Application d'actualités | Non |
| Application gouvernementale | Non |
| Fonctionnalités financières | Aucune |
| Application de santé | Non |
| ID de publicité (Advertising ID) | **Non utilisé** (aucune bibliothèque publicitaire). |
| Vente / paiements / achats intégrés | Aucun |

## 2. Classification du contenu (questionnaire IARC)

Catégorie : **Référence / Utilitaire** (application religieuse : Coran, invocations, horaires de prière).
Violence : non · Sexualité : non · Langage grossier : non · Substances : non · Jeux d'argent : non ·
Fonction de partage d'**informations de localisation avec d'autres utilisateurs** : non ·
Interaction entre utilisateurs : non (le partage du score du quiz passe par le menu de partage du système, sans compte).
Contenu généré par les utilisateurs : non.

## 3. Sécurité des données (Data safety)

**Application Android (celle publiée sur Play)** :
- Collecte de données : **aucune donnée n'est envoyée à nos serveurs.** Position, réglages, progression et favoris restent sur le téléphone.
  La position sert uniquement à calculer les horaires de prière **sur l'appareil**.
- Partage de données avec des tiers : **non**.
- Chiffrement en transit : oui (HTTPS) pour le contenu récupéré (écoute audio depuis mp3quran.net, archive.org, Google Drive ; aucune donnée utilisateur n'y est envoyée).
- Demande de suppression des données : sans objet (rien n'est collecté ; désinstaller l'application efface les données locales).
- Pas de comptes, pas d'analytique, pas de bibliothèque de suivi, pas de cookies.

Remarque de transparence : les serveurs audio (mp3quran.net, archive.org, Google Drive) voient comme tout serveur l'adresse IP de l'appareil qui télécharge un fichier. Cela est indiqué dans la politique de confidentialité (§6–7).

**Version web uniquement** (non concernée par Play) : l'option «rappels application fermée» enregistre sur Netlify l'adresse de notification du navigateur, la position arrondie à ~11 km, le fuseau horaire et les choix de rappel — décrit au §4 de `privacy.html`.

## 4. Permissions sensibles (déclarations demandées par Play)

| Permission | Pourquoi (à écrire dans la déclaration) |
|---|---|
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` (facultatives) | Calculer sur l'appareil les horaires de prière selon la position de l'utilisateur. Rien n'est envoyé à un serveur. |
| `POST_NOTIFICATIONS` | Rappels des prières et des invocations (facultatif). |
| `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` | Déclencher l'adhan à la minute exacte de l'heure de prière. Fonction principale de l'application (rappel/alarme de prière). |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Type **mediaPlayback** : (1) lire l'adhan en entier avec une notification « Arrêter » ; (2) garder la récitation du Coran / la mémorisation en lecture quand l'écran est éteint, avec une notification « Arrêter » (démarrée seulement quand l'utilisateur lance la lecture). |
| `RECEIVE_BOOT_COMPLETED` | Reprogrammer les adhans après un redémarrage du téléphone. |
| `WAKE_LOCK` | Garder l'appareil éveillé pendant la lecture de l'adhan. |

Point d'attention honnête : `USE_EXACT_ALARM` est réservé par Google aux applications dont la fonction principale est une alarme/horloge/calendrier. L'adhan à l'heure exacte est le cœur de l'application ; si Google refuse, il faudra retirer `USE_EXACT_ALARM` et ne garder que `SCHEDULE_EXACT_ALARM` (autorisation à accorder par l'utilisateur).

## 5. Questionnaire de demande d'accès à la production (test fermé)

Faits vérifiables côté application :
- Application : lecture du Coran (Hafs et Warsh), invocations du matin et du soir, tasbih, fiqh pratique, quiz, horaires de prière et adhan.
- Fonctionne hors ligne ; aucune connexion requise ; aucune publicité.
- Versions publiées sur la piste de test fermé «salatee» : 2.0.4 à 2.0.9 (la 2.0.11 est en cours d'examen).

À compléter par le propriétaire (ce sont des faits que seul lui connaît — ne pas inventer) :
- Nombre de testeurs ayant accepté l'invitation et date du début du test (Play exige au moins 12 testeurs pendant 14 jours consécutifs).
- Retours reçus des testeurs et corrections faites (exemples réels de ce projet : horaires de prière du Maroc corrigés ville par ville d'après le ministère des Habous ; icône de l'application corrigée ; PDF qui ne s'ouvrait pas ; lecture du Coran qui s'interrompait).

Retour terrain rapporté par le propriétaire (6 octobre 2026) : l'adhan sonne à l'heure exacte dans plusieurs villes du Maroc, sur différents modèles de téléphones, confirmé par des proches et des amis testeurs. (Déclaration du propriétaire, non mesurée par un outil : à reformuler avec le nombre réel de testeurs au moment de répondre au questionnaire.)

## 6. إضافاتٌ في الإصدارات التالية (للمراجعة عند الإرسال)

- **ويدجت الصلاة القادمة (أندرويد):** لا أذونات جديدة؛ يقرأ جدولَ الأذان المحفوظ على الجهاز.
- **النسخ الاحتياطيّ التلقائيّ (Auto Backup):** يُنسَخ تخزينُ الصفحة المحلّيّ فقط إلى حساب Google للمستخدم بتحكّم النظام. هذا ليس «جمعًا» من المطوّر؛ تبقى إجابةُ Data safety «لا بيانات تُجمَع». حُدِّثت `privacy.html`.
- **ترجمة المعاني (فرنسيّة/إنجليزيّة):** من quranenc.com (مشروعٌ يُتيح ترجماتِه مجّانًا للتطبيقات)، مُضمَّنةٌ في التطبيق بلا طلبٍ شبكيّ؛ نَسبُها في `credits.html`.
- **صور القرّاء:** صورٌ حرّةُ الترخيص (CC BY-SA/CC0/ملك عامّ) من ويكيميديا كومنز، نَسبُها في `credits.html`.
- **الواجهة الفرنسيّة:** اختياريّة؛ وفي بطاقة المتجر يُذكر أنّ المحتوى الدينيّ عربيّ.
