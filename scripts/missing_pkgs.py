import pathlib, re, os
root = pathlib.Path("/workspace/fx-lab/src/react-bits")
nm = pathlib.Path("/workspace/fx-lab/node_modules")
missing = {}
for p in root.rglob("*.jsx"):
    text = p.read_text(errors="replace")
    for m in re.finditer(r'''from\s+['"]([^'"./][^'"]*)['"]''', text):
        spec = m.group(1)
        pkg = spec
        if spec.startswith("@"):
            parts = spec.split("/")
            pkg = "/".join(parts[:2])
        else:
            pkg = spec.split("/")[0]
        if not (nm / pkg).exists():
            missing.setdefault(pkg, []).append(str(p.relative_to(root)))
for pkg, files in sorted(missing.items()):
    print(pkg, "->", ", ".join(files[:6]))
