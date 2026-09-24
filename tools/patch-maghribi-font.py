#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trousse de réparation de la police maghribi (fonts/maghribi-<hash>.woff2,
police du mushaf Mohammadi).

Problème: la police d'origine ne couvrait pas 17 signes coraniques présents
dans wird_warsh.js / wird_hafs.js / data.js (~24 000 occurrences). Le
navigateur basculait alors la GRAPPE ENTIÈRE (lettre + signe) vers une autre
police: liaisons cassées, signes en forme de ✕/◇/tofu selon l'appareil.

Réparations (script déjà appliqué — conservé pour référence):
1. Copie depuis fonts/amiri-quran.woff2 (mise à l'échelle 1000→2048 UPM):
   U+06D6..06D8, 06DB, 06DC, 06DE ۞, 06E0, 06E4, 06E5 ۥ, 06E6 ۦ,
   06E8, 06E9 ۩, FDFA ﷺ
2. Nouveau glyphe «lowstop» (U+06EA ۪): cercle du soukoun maghribi réduit et
   descendu sous la ligne + ancrage GPOS hérité de la kasra.
3. Alias cmap (héritage TOTAL des formes/liaisons/ancrages natifs):
   U+06D2 ے → ى (ya sans points, liaison complète)
   U+06DF ۟ et U+06E1 ۡ → cercle du soukoun maghribi
   U+00A0 → espace
4. (16 sept. 2026) U+065E — تنوين الضمّ المتراكب.
   La cmap le faisait pointer vers «alefmhdofwamed», un ALIF: «عَظِيمٞ»
   s'affichait «عَظِيمآ» dans 1 815 positions. Or la police CONTIENT déjà
   le bon glyphe, dessiné par son auteur — «bidammatan» (deux dammas
   superposées, 2 contours, hauteur 628, classe GDEF 3 = mark, ancré dans
   GPOS: MarkBasePos, MarkLigPos, MarkMarkPos) — mais il n'était relié
   qu'à U+0658. Correction: U+065E → bidammatan dans les 3 sous-tables
   cmap. Aucun contour ajouté ni modifié; U+0658 conserve son lien.
   Conséquence: la substitution QTNW de qFix (index.html) devient inutile
   et a été supprimée — les trois tanwins superposés (U+0656/0657/065E,
   6 666 positions) arrivent désormais intacts à l'écran.

    # le patch appliqué en 4:
    from fontTools.ttLib import TTFont
    f = TTFont('fonts/maghribi.woff2')
    for t in f['cmap'].tables:
        t.cmap[0x065E] = 'bidammatan'
    f.flavor = 'woff2'
    f.save('fonts/maghribi.woff2')

5. (24 sept. 2026) LA LEÇON DU POINT 4 — NE JAMAIS RÉÉCRIRE UNE POLICE
   SOUS LE MÊME NOM. _headers sert /fonts/* en «immutable, 1 an»: le
   navigateur ne redemande JAMAIS un fichier déjà vu. Le patch 4 a gardé
   le nom «maghribi.woff2», donc tout appareil ayant ouvert l'app avant le
   16 sept. a gardé l'ancienne police — et comme QTNW avait été supprimé,
   les 1 824 تنوين ضمّ متراكب s'y affichaient en ALIF («آ»). Signalé par
   l'utilisateur sur سورة الملك.
   Règle: le nom du fichier porte les 8 premiers caractères de son SHA-1
   (maghribi-7d058b2e.woff2). Toute modification => nouveau nom => mettre à
   jour index.html (@font-face + quranFontFile), sw.js (ASSETS) et
   store/feature.html. tools/fahs-khatt-warsh.py vérifie cette règle et
   refuse une police dont le nom ne correspond pas à son contenu.

Vérification: uharfbuzz (shaping) + captures Chromium sur les versets
contenant chaque signe. Zéro caractère non couvert sur les 3 sources.
"""
print(__doc__)
