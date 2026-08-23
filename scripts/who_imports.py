import pathlib
root = pathlib.Path("/workspace/fx-lab/src/react-bits")
specs = ["@chakra-ui/react", "face-api.js", "@react-three/rapier", "meshline", "lenis", "lucide-react", "react-router-dom", "maath", "gl-matrix", "postprocessing"]
for spec in specs:
    print("==", spec)
    for p in root.rglob("*.jsx"):
        t = p.read_text(errors="replace")
        if spec in t:
            print(" ", p.relative_to(root))
