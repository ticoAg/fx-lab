import pathlib, re
root = pathlib.Path("/workspace/fx-lab/src/react-bits")
imports = set()
exports = []
for p in root.rglob("*"):
    if p.suffix not in {".js", ".jsx", ".ts", ".tsx"}:
        continue
    text = p.read_text(errors="replace")
    for m in re.finditer(r'''from\s+['"]([^'"./][^'"]*)['"]''', text):
        imports.add(m.group(1).split("/")[0] if not m.group(1).startswith("@") else "/".join(m.group(1).split("/")[:2]) if m.group(1).startswith("@") else m.group(1))
    # better @scope
    for m in re.finditer(r'''from\s+['"]([^'"]+)['"]''', text):
        spec = m.group(1)
        if spec.startswith("."):
            continue
        imports.add(spec)
    kind = "unknown"
    if re.search(r"export\s+default", text):
        kind = "default"
    names = re.findall(r"export\s+(?:const|function|class)\s+(\w+)", text)
    names += re.findall(r"export\s+\{([^}]+)\}", text)
    exports.append((str(p.relative_to(root)), kind, names[:4]))
print("IMPORTS")
for i in sorted(imports):
    print(i)
print("----")
print("sample exports")
for e in exports[:15]:
    print(e)
print("files", len(exports))
