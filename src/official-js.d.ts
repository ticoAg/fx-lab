declare module './demos/curves/official.js' {
  export const curves: Array<Record<string, unknown> & {
    name: string
    tag: string
    descriptionZh: string
    descriptionEn: string
    point: (progress: number, detailScale: number, config: Record<string, unknown>) => { x: number; y: number }
  }>
  export function normalizeProgress(progress: number): number
  export function buildPath(config: unknown, detailScale: number, steps?: number): string
  export function getParticle(
    config: unknown,
    index: number,
    progress: number,
    detailScale: number,
  ): { x: number; y: number; radius: number; opacity: number }
  export function getDetailScale(time: number, config: unknown, phaseOffset: number): number
  export function getRotation(time: number, config: unknown, phaseOffset: number): number
}
