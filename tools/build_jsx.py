"""Gera ae/scripts/MotionFrame_FX.jsx a partir do .src.jsx + dados medidos (ae/data)."""
import json
sigs=json.load(open('ae/data/shake_signatures.json')); on=json.load(open('ae/data/onsets_30fps.json'))
src=open('ae/scripts/MotionFrame_FX.src.jsx',encoding='utf-8').read()
out=src.replace('/*__SIGS__*/',json.dumps(sigs,separators=(',',':'))).replace('/*__ONSETS__*/',json.dumps(on))
open('ae/scripts/MotionFrame_FX.jsx','w',encoding='utf-8').write('﻿'+out)
print('ok',len(out))
