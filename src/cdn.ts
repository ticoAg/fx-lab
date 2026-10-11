// Public, cached read path to the R2 bucket fx-lab-svg-kits (R2 custom domain + zone cache rule, 1 day).
// Reads from here never invoke Pages Functions; see docs/deploy.md.
export const ASSET_CDN = 'https://fx-lab-cdn.ticoag.fun'

// 3D models for react-bits demos, stored under models/3d/ in the bucket.
export function modelUrl(name: string) {
  return `${ASSET_CDN}/models/3d/${name}`
}
