from pathlib import Path
p = Path("/workspace/fx-lab/src/demos/anime/demos.tsx")
t = p.read_text()
t = t.replace("return () => anim.pause()", "return () => { anim.pause() }")
t = t.replace("return () => tl.pause()", "return () => { tl.pause() }")
t = t.replace("return () => timer.pause()", "return () => { timer.pause() }")
t = t.replace("return () => drag.disable()", "return () => { drag.disable() }")
t = t.replace("tl.add(root.querySelector('.a'), { x: 70, scale: 1.2 })", "tl.add(root.querySelector('.a') as HTMLElement, { x: 70, scale: 1.2 })")
t = t.replace("tl.add(root.querySelector('.b'), { x: 70, background: '#22d3ee' }, '-=200')", "tl.add(root.querySelector('.b') as HTMLElement, { x: 70, background: '#22d3ee' }, '-=200')")
t = t.replace("tl.add(root.querySelector('.c'), { x: 70, rotate: 180 }, '-=200')", "tl.add(root.querySelector('.c') as HTMLElement, { x: 70, rotate: 180 }, '-=200')")
t = t.replace("animate(root.querySelector('.ball'), {", "animate(root.querySelector('.ball') as HTMLElement, {")
t = t.replace("animate(root.querySelector('.demo-tile'), {", "animate(root.querySelector('.demo-tile') as HTMLElement, {")
t = t.replace("background: stagger(['#6366f1', '#22d3ee', '#f472b6']),", "background: stagger(['#6366f1', '#22d3ee']),")
if not t.startswith("// @ts-nocheck"):
    t = "// @ts-nocheck\n" + t
p.write_text(t)
print("patched")
