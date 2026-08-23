import json, pathlib, subprocess, concurrent.futures
root = pathlib.Path("/workspace/fx-lab")
names = (root / "scripts" / "jscss-names.txt").read_text().strip().splitlines()
out = root / "src" / "react-bits"
out.mkdir(parents=True, exist_ok=True)
deps = set()
ok = 0
fail = []

def fetch(name):
    url = f"https://reactbits.dev/r/{name}.json"
    p = subprocess.run(
        ["curl", "-sL", "-A", "Mozilla/5.0 fx-lab", "-o", "-", url],
        capture_output=True, text=True, timeout=40,
    )
    if p.returncode != 0 or not p.stdout.startswith("{"):
        raise RuntimeError(f"{name} {p.returncode} {p.stdout[:80]!r}")
    return name, json.loads(p.stdout)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    futs = [ex.submit(fetch, n) for n in names]
    for fut in concurrent.futures.as_completed(futs):
        try:
            name, data = fut.result()
            for dep in data.get("dependencies") or []:
                pkg = dep
                if "@" in dep[1:]:
                    pkg = dep.rsplit("@", 1)[0]
                deps.add(pkg)
            for f in data.get("files") or []:
                rel = f.get("path") or f.get("name")
                content = f.get("content") or ""
                dest = out / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(content)
            print("ok", name)
            ok += 1
        except Exception as e:
            fail.append(str(e))
            print("fail", e)

(root / "scripts" / "rb-deps.txt").write_text("\n".join(sorted(deps)))
(root / "scripts" / "rb-fail.txt").write_text("\n".join(fail))
print("DONE", ok, "fail", len(fail), "deps", len(deps))
