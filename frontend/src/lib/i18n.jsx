// The interface is English only. These stubs keep existing imports working without a language switcher.
import { createContext, useContext } from 'react';

const value = { lang: 'en', t: (key, en) => en || key, setLang: () => {} };
const Ctx = createContext(value);
export const useI18n = () => useContext(Ctx);
export const I18nProvider = ({ children }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const nepDigits = (v) => String(v);
