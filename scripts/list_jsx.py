import pathlib
root = pathlib.Path("/workspace/fx-lab/src/react-bits")
for p in sorted(root.rglob("*.jsx")):
    print(p.relative_to(root))
