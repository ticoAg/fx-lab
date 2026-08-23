from pathlib import Path
p = Path("/workspace/fx-lab/src/demos/reactbits/ReactBitsMount.tsx")
t = p.read_text()
t = t.replace(
    "const modules = import.meta.glob('../../react-bits/**/*.jsx')",
    "const modules = import.meta.glob([\n  '../../react-bits/**/*.jsx',\n  '!../../react-bits/Lanyard/**',\n])",
)
p.write_text(t)
print("ok")
