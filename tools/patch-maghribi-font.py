#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trousse de réparation de fonts/maghribi.woff2 (police du mushaf Mohammadi).

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
Vérification: uharfbuzz (shaping) + captures Chromium sur les versets
contenant chaque signe. Zéro caractère non couvert sur les 3 sources.
"""
print(__doc__)
