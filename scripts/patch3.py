from pathlib import Path
p = Path("/workspace/fx-lab/vite.config.ts")
t = p.read_text()
if "cssMinify" not in t:
    t = t.replace(
        "  optimizeDeps: {",
        "  build: { cssMinify: false },\n  optimizeDeps: {",
    )
    p.write_text(t)
print(p.read_text())
