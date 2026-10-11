import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SvgKitsHeader } from '../../components/svg-kits/SvgKitsHeader.tsx'
import {
  deleteSvgKit,
  fileStemToId,
  iconUrl,
  readAdminToken,
  saveSvgKit,
  seedSvgKits,
  SVG_ANIMATIONS,
  writeAdminToken,
  type SvgAnimation,
  type SvgKitIcon,
  type SvgKitTheme,
} from '../../content/svg-kits/index.ts'
import { useSvgKits } from '../../content/svg-kits/useSvgKits.ts'
import { useLang } from '../../i18n.ts'

type IconDraft = SvgKitIcon & { file?: File; hasFile: boolean }

type CatDraft = { key: string; zh: string; en: string }

const emptyTheme = (): Omit<SvgKitTheme, 'icons' | 'categories'> & { categories: CatDraft[] } => ({
  id: '',
  title: { zh: '', en: '' },
  description: { zh: '', en: '' },
  cover: '',
  sheet: 'elements.svg',
  categories: [],
})

function themeToDraft(theme: SvgKitTheme) {
  return {
    id: theme.id,
    title: { ...theme.title },
    description: { ...theme.description },
    cover: theme.cover,
    sheet: theme.sheet ?? '',
    categories: Object.entries(theme.categories ?? {}).map(([key, label]) => ({
      key,
      zh: label.zh,
      en: label.en,
    })),
  }
}

export function SvgKitsAdminPage() {
  const { lang } = useLang()
  const zh = lang === 'zh'
  const { data, loading, error, reload } = useSvgKits({ fresh: true })
  const [token, setToken] = useState(readAdminToken)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(emptyTheme)
  const [icons, setIcons] = useState<IconDraft[]>([])
  const [sheetFile, setSheetFile] = useState<File | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    document.title = zh ? '上传 SVG 套件 · fx-lab' : 'Upload SVG Kits · fx-lab'
  }, [zh])

  const store = data?.store

  const loadTheme = (theme: SvgKitTheme) => {
    setDraft(themeToDraft(theme))
    setIcons(theme.icons.map((icon) => ({ ...icon, hasFile: true })))
    setSheetFile(null)
    setEditing(true)
    setStatus(null)
  }

  const reset = () => {
    setDraft(emptyTheme())
    setIcons([])
    setSheetFile(null)
    setEditing(false)
    setStatus(null)
  }

  const addFiles = (fileList: FileList | File[]) => {
    const next = [...icons]
    for (const file of fileList) {
      if (!file.name.toLowerCase().endsWith('.svg')) continue
      const id = fileStemToId(file.name)
      if (!id) continue
      const existing = next.findIndex((i) => i.id === id)
      const row: IconDraft = {
        id,
        title: existing >= 0 ? next[existing].title : { zh: id, en: id },
        description: existing >= 0 ? next[existing].description : { zh: '', en: '' },
        animation: existing >= 0 ? next[existing].animation : 'none',
        category: existing >= 0 ? next[existing].category : undefined,
        file,
        hasFile: true,
      }
      if (existing >= 0) next[existing] = { ...next[existing], ...row }
      else next.push(row)
    }
    setIcons(next)
    if (!draft.cover && next[0]) setDraft((d) => ({ ...d, cover: next[0].id }))
  }

  const save = async () => {
    setBusy(true)
    setStatus(null)
    try {
      writeAdminToken(token)
      const categories = Object.fromEntries(
        draft.categories.filter((c) => c.key.trim()).map((c) => [c.key.trim(), { zh: c.zh, en: c.en }]),
      )
      const theme: SvgKitTheme = {
        id: draft.id.trim(),
        title: draft.title,
        description: draft.description,
        cover: draft.cover || icons[0]?.id || '',
        ...(draft.sheet ? { sheet: draft.sheet } : {}),
        ...(Object.keys(categories).length ? { categories } : {}),
        icons: icons.map((icon) => ({
          id: icon.id,
          title: icon.title,
          description: icon.description,
          animation: icon.animation,
          ...(icon.category ? { category: icon.category } : {}),
        })),
      }
      const files: Record<string, string> = {}
      for (const icon of icons) {
        if (icon.file) files[icon.id] = await icon.file.text()
      }
      const sheet = sheetFile ? await sheetFile.text() : undefined
      await saveSvgKit(theme, files, sheet, token)
      setStatus(zh ? '已保存。画廊会立刻读到新主题。' : 'Saved. The gallery will pick this up immediately.')
      setEditing(true)
      reload()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const seed = async () => {
    setBusy(true)
    setStatus(null)
    try {
      writeAdminToken(token)
      const result = await seedSvgKits(token)
      setStatus(
        zh
          ? `已写入种子主题：${(result.copied ?? []).join(', ')}`
          : `Seeded: ${(result.copied ?? []).join(', ')}`,
      )
      reload()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const removeTheme = async (id: string) => {
    if (!window.confirm(zh ? `删除主题 ${id}？` : `Delete theme ${id}?`)) return
    setBusy(true)
    try {
      writeAdminToken(token)
      await deleteSvgKit(id, token)
      if (draft.id === id) reset()
      reload()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const categoryKeys = useMemo(() => draft.categories.map((c) => c.key).filter(Boolean), [draft.categories])

  return (
    <div className="app kit-page">
      <SvgKitsHeader crumb={zh ? '上传' : 'Upload'} />
      <main className="kit-main kit-admin">
        <section className="kit-hero">
          <h2>{zh ? '上传 SVG 套件' : 'Upload SVG kits'}</h2>
          <p>
            {zh
              ? '创建主题、上传一个或多个 SVG，并填写每个图标的中英文标题和描述。资源写到对象存储（本地 .data，生产为 R2），不提交 git。'
              : 'Create a theme, upload one or more SVGs, and fill zh/en titles and descriptions per icon. Assets go to object storage (local .data, R2 in production), not git.'}
          </p>
        </section>

        <section className="kit-admin-card">
          <h3>{zh ? '存储与口令' : 'Store and token'}</h3>
          <p className="kit-admin-note">
            {loading
              ? zh
                ? '正在探测存储…'
                : 'Checking store…'
              : store
                ? `${store.backend}${store.writable ? '' : zh ? ' · 只读（未绑定 R2）' : ' · read-only (R2 not bound)'}`
                : error}
          </p>
          <label className="kit-field">
            <span>{zh ? '管理口令' : 'Admin token'}</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={zh ? '本地默认 dev' : 'local default: dev'}
              autoComplete="off"
            />
          </label>
          <div className="kit-toolbar">
            <button type="button" className="kit-btn ghost" disabled={busy} onClick={() => writeAdminToken(token)}>
              {zh ? '记住口令' : 'Remember token'}
            </button>
            <button type="button" className="kit-btn" disabled={busy} onClick={seed}>
              {zh ? '写入 basics + cthulhu-mythos 种子' : 'Seed basics + cthulhu-mythos'}
            </button>
          </div>
          <p className="kit-admin-note">
            {zh
              ? '本地 npm run dev 默认口令是 dev。生产需要在 Cloudflare Pages 设置 SVG_KITS_ADMIN_TOKEN，并绑定 R2 桶 SVG_KITS。'
              : 'Local npm run dev defaults the token to dev. Production needs SVG_KITS_ADMIN_TOKEN and an R2 bucket bound as SVG_KITS.'}{' '}
            <Link to="/svg-kits">{zh ? '返回画廊' : 'Back to gallery'}</Link>
          </p>
        </section>

        <section className="kit-admin-card">
          <h3>{zh ? '已有主题' : 'Existing themes'}</h3>
          <ul className="kit-admin-list">
            {(data?.themes ?? []).map((theme) => (
              <li key={theme.id}>
                <img src={iconUrl(theme.id, theme.cover)} alt="" width={28} height={28} />
                <strong>{theme.id}</strong>
                <span>
                  {theme.icons.length} {zh ? '个图标' : 'icons'}
                </span>
                <button type="button" className="kit-btn ghost" onClick={() => loadTheme(theme)}>
                  {zh ? '编辑' : 'Edit'}
                </button>
                <button type="button" className="kit-btn ghost" onClick={() => removeTheme(theme.id)}>
                  {zh ? '删除' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="kit-btn ghost" onClick={reset}>
            {zh ? '新建主题' : 'New theme'}
          </button>
        </section>

        <section className="kit-admin-card">
          <h3>{editing ? (zh ? `编辑 ${draft.id}` : `Edit ${draft.id}`) : zh ? '新建主题' : 'New theme'}</h3>
          <div className="kit-admin-grid">
            <label className="kit-field">
              <span>id</span>
              <input
                value={draft.id}
                disabled={editing}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="cthulhu-mythos"
              />
            </label>
            <label className="kit-field">
              <span>{zh ? '封面图标 id' : 'Cover icon id'}</span>
              <input value={draft.cover} onChange={(e) => setDraft({ ...draft, cover: e.target.value })} />
            </label>
            <label className="kit-field">
              <span>{zh ? '标题（中）' : 'Title (zh)'}</span>
              <input value={draft.title.zh} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, zh: e.target.value } })} />
            </label>
            <label className="kit-field">
              <span>{zh ? '标题（英）' : 'Title (en)'}</span>
              <input value={draft.title.en} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, en: e.target.value } })} />
            </label>
            <label className="kit-field kit-span-2">
              <span>{zh ? '描述（中）' : 'Description (zh)'}</span>
              <textarea value={draft.description.zh} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, zh: e.target.value } })} />
            </label>
            <label className="kit-field kit-span-2">
              <span>{zh ? '描述（英）' : 'Description (en)'}</span>
              <textarea value={draft.description.en} onChange={(e) => setDraft({ ...draft, description: { ...draft.description, en: e.target.value } })} />
            </label>
          </div>

          <h4>{zh ? '分类（可选）' : 'Categories (optional)'}</h4>
          {draft.categories.map((cat, idx) => (
            <div className="kit-admin-row" key={idx}>
              <input placeholder="key" value={cat.key} onChange={(e) => {
                const categories = [...draft.categories]
                categories[idx] = { ...cat, key: e.target.value }
                setDraft({ ...draft, categories })
              }} />
              <input placeholder="zh" value={cat.zh} onChange={(e) => {
                const categories = [...draft.categories]
                categories[idx] = { ...cat, zh: e.target.value }
                setDraft({ ...draft, categories })
              }} />
              <input placeholder="en" value={cat.en} onChange={(e) => {
                const categories = [...draft.categories]
                categories[idx] = { ...cat, en: e.target.value }
                setDraft({ ...draft, categories })
              }} />
              <button type="button" className="kit-btn ghost" onClick={() => setDraft({ ...draft, categories: draft.categories.filter((_, i) => i !== idx) })}>
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="kit-btn ghost"
            onClick={() => setDraft({ ...draft, categories: [...draft.categories, { key: '', zh: '', en: '' }] })}
          >
            {zh ? '添加分类' : 'Add category'}
          </button>

          <h4>{zh ? '图标 SVG' : 'Icon SVGs'}</h4>
          <label className="kit-drop">
            <input
              type="file"
              accept=".svg,image/svg+xml"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {zh ? '选择或拖入一个或多个 .svg' : 'Choose or drop one or more .svg files'}
          </label>
          <label className="kit-field">
            <span>{zh ? '总览图（可选）' : 'Overview sheet (optional)'}</span>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setSheetFile(file)
                if (file) setDraft({ ...draft, sheet: file.name.toLowerCase().endsWith('.svg') ? file.name : 'elements.svg' })
              }}
            />
          </label>

          <div className="kit-admin-table-wrap">
            <table className="kit-admin-table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>{zh ? '标题中' : 'Title zh'}</th>
                  <th>{zh ? '标题英' : 'Title en'}</th>
                  <th>{zh ? '描述中' : 'Desc zh'}</th>
                  <th>{zh ? '描述英' : 'Desc en'}</th>
                  <th>{zh ? '分类' : 'Cat'}</th>
                  <th>{zh ? '动画' : 'Anim'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {icons.map((icon, idx) => (
                  <tr key={icon.id}>
                    <td>
                      <code>{icon.id}</code>
                      {!icon.hasFile && <span className="kit-warn">!</span>}
                    </td>
                    <td>
                      <input value={icon.title.zh} onChange={(e) => {
                        const next = [...icons]
                        next[idx] = { ...icon, title: { ...icon.title, zh: e.target.value } }
                        setIcons(next)
                      }} />
                    </td>
                    <td>
                      <input value={icon.title.en} onChange={(e) => {
                        const next = [...icons]
                        next[idx] = { ...icon, title: { ...icon.title, en: e.target.value } }
                        setIcons(next)
                      }} />
                    </td>
                    <td>
                      <textarea value={icon.description.zh} onChange={(e) => {
                        const next = [...icons]
                        next[idx] = { ...icon, description: { ...icon.description, zh: e.target.value } }
                        setIcons(next)
                      }} />
                    </td>
                    <td>
                      <textarea value={icon.description.en} onChange={(e) => {
                        const next = [...icons]
                        next[idx] = { ...icon, description: { ...icon.description, en: e.target.value } }
                        setIcons(next)
                      }} />
                    </td>
                    <td>
                      <select
                        value={icon.category ?? ''}
                        onChange={(e) => {
                          const next = [...icons]
                          next[idx] = { ...icon, category: e.target.value || undefined }
                          setIcons(next)
                        }}
                      >
                        <option value="">{zh ? '（无）' : '(none)'}</option>
                        {categoryKeys.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={icon.animation}
                        onChange={(e) => {
                          const next = [...icons]
                          next[idx] = { ...icon, animation: e.target.value as SvgAnimation }
                          setIcons(next)
                        }}
                      >
                        {SVG_ANIMATIONS.map((anim) => (
                          <option key={anim} value={anim}>
                            {anim}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button type="button" className="kit-btn ghost" onClick={() => setIcons(icons.filter((_, i) => i !== idx))}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="kit-toolbar">
            <button type="button" className="kit-btn" disabled={busy} onClick={save}>
              {busy ? (zh ? '保存中…' : 'Saving…') : zh ? '保存到存储' : 'Save to store'}
            </button>
          </div>
          {status && <pre className="kit-admin-status">{status}</pre>}
        </section>
      </main>
    </div>
  )
}
