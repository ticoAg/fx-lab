import { validateSvgKitViews, type SvgKitViewsStore } from './model.ts'

// The subset of the D1 binding used here, matching the R2 binding convention.
export type SvgKitViewsDatabase = {
  prepare(sql: string): {
    all<T>(): Promise<{ results: T[] }>
    bind(value: string): { run(): Promise<unknown> }
  }
}

export function d1ViewsStore(db: SvgKitViewsDatabase): SvgKitViewsStore {
  return {
    async readViews() {
      const { results } = await db.prepare('SELECT theme_id, views FROM svg_kit_views')
        .all<{ theme_id: string; views: number }>()
      return validateSvgKitViews(Object.fromEntries(results.map((row) => [row.theme_id, row.views])))
    },
    async recordView(themeId) {
      await db.prepare(`
        INSERT INTO svg_kit_views (theme_id, views) VALUES (?1, 1)
        ON CONFLICT(theme_id) DO UPDATE SET views = views + 1
      `).bind(themeId).run()
    },
  }
}
