import json, pathlib, re
print("rb folders", sum(1 for p in pathlib.Path("/workspace/fx-lab/src/react-bits").iterdir() if p.is_dir()))
print("rb jsx", len(list(pathlib.Path("/workspace/fx-lab/src/react-bits").rglob("*.jsx"))))
print("three", open("/workspace/fx-lab/src/demos/threeui/loaders.ts").read().count(": () => import"))
print("anime", open("/workspace/fx-lab/src/demos/anime/demos.tsx").read().count("id: 'anime-"))
print("curves names", open("/workspace/fx-lab/src/demos/curves/official.js").read().count("\n    name:"))
print("isolated", "Lanyard ElasticSlider GridScan")
