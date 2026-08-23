from pathlib import Path
p = Path("/workspace/fx-lab/src/demos/reactbits/ReactBitsMount.tsx")
t = p.read_text()
old = "const modules = import.meta.glob([\n  '../../react-bits/**/*.jsx',\n  '!../../react-bits/Lanyard/**',\n])"
new = "const modules = import.meta.glob([\n  '../../react-bits/**/*.jsx',\n  '!../../react-bits/Lanyard/**',\n  '!../../react-bits/ElasticSlider/**',\n  '!../../react-bits/GridScan/**',\n])"
if old not in t:
    raise SystemExit('pattern not found')
p.write_text(t.replace(old, new))
print("ok")
