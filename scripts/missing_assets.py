import pathlib, re
root = pathlib.Path("/workspace/fx-lab/src/react-bits")
for p in root.rglob("*.jsx"):
    text = p.read_text(errors="replace")
    for m in re.finditer(r'''from\s+['"](\./[^'"]+)['"]''', text):
        rel = m.group(1)
        dest = (p.parent / rel).resolve()
        if not dest.exists():
            # try with common extensions already in path
            print(f"{p.relative_to(root)} -> {rel}")
