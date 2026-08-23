from pathlib import Path
text = Path("/workspace/fx-lab/scripts/math-curves-main.js").read_text()
# extract curves array
start = text.index("const curves = [")
# find matching end of array at "];" after last curve
# the array ends before function normalizeProgress
end = text.index("function normalizeProgress")
curves_src = text[start:end].replace("const curves = ", "export const curves = ", 1).rstrip()
if not curves_src.endswith(";"):
    # it ends with ];\n\n
    pass

helpers = """
export function normalizeProgress(progress) {
  return ((progress % 1) + 1) % 1;
}

export function buildPath(config, detailScale, steps = 480) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const point = config.point(index / steps, detailScale, config);
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(" ");
}

export function getParticle(config, index, progress, detailScale) {
  const tailOffset = index / (config.particleCount - 1);
  const point = config.point(
    normalizeProgress(progress - tailOffset * config.trailSpan),
    detailScale,
    config
  );
  const fade = Math.pow(1 - tailOffset, 0.56);
  return {
    x: point.x,
    y: point.y,
    radius: 0.9 + fade * 2.7,
    opacity: 0.04 + fade * 0.96,
  };
}

export function getDetailScale(time, config, phaseOffset) {
  const pulseProgress =
    ((time + phaseOffset * config.pulseDurationMs) % config.pulseDurationMs) /
    config.pulseDurationMs;
  const pulseAngle = pulseProgress * Math.PI * 2;
  return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
}

export function getRotation(time, config, phaseOffset) {
  if (!config.rotate) return 0;
  return -(
    ((time + phaseOffset * config.rotationDurationMs) % config.rotationDurationMs) /
    config.rotationDurationMs
  ) * 360;
}
"""
out = Path("/workspace/fx-lab/src/demos/curves/official.js")
out.write_text(curves_src + "\n" + helpers)
# count names
print(curves_src.count("name:"), "name fields")
print("bytes", out.stat().st_size)
