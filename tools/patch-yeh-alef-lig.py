#!/usr/bin/env python3
"""(16 nov. 2026, demande de Farid) Retire de la police maghribi la seule règle
de ligature GSUB (lookup 6): yehwast + alefmaksuranihay -> alyehwaalefmaksura,
qui fusionnait «يحيى» en une forme ressemblant à ئ. Le mushaf imprimé marocain
(Warsh) écrit les lettres séparées. Aucun glyphe/cmap/GPOS modifié, texte inchangé.
Usage: patch-yeh-alef-lig.py in.woff2 out.woff2"""
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
for l in f['GSUB'].table.LookupList.Lookup:
    for s in l.SubTable:
        s = getattr(s, 'ExtSubTable', s)
        if hasattr(s, 'ligatures') and 'yehwast' in s.ligatures:
            s.ligatures['yehwast'] = [x for x in s.ligatures['yehwast'] if tuple(x.Component) != ('alefmaksuranihay',)]
            if not s.ligatures['yehwast']: del s.ligatures['yehwast']
f.flavor = 'woff2'; f.save(sys.argv[2])
