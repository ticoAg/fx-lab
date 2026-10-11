import { useEffect, useState, type ReactNode } from 'react'
import { LANG_STORAGE_KEY, LangContext, readStoredLang, type Lang } from './i18n.ts'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang)
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function LangToggle() {
  return (
    <LangContext.Consumer>
      {({ lang, setLang }) => (
        <div className="lang-toggle">
          <button type="button" className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
            中
          </button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            EN
          </button>
        </div>
      )}
    </LangContext.Consumer>
  )
}
