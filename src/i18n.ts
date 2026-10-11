import { createContext, useContext } from 'react'

export type Lang = 'zh' | 'en'

/** Bilingual text. Every user-facing content string carries both locales. */
export type LocaleText = { zh: string; en: string }

export function t(text: LocaleText, lang: Lang) {
  return text[lang]
}

export const LANG_STORAGE_KEY = 'fx-lab.lang'

export function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY)
    return v === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export type LangState = { lang: Lang; setLang: (lang: Lang) => void }

export const LangContext = createContext<LangState>({ lang: 'zh', setLang: () => {} })

export function useLang() {
  return useContext(LangContext)
}
