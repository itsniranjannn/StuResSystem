import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get } from './api';

// Institution details are edited by the admin (Admin > Institution) and read here by every screen, so nothing is hard-coded.
const FALLBACK = { name: '', short: '', tagline: '', address: '', email: '', phone: '', website: '' };
const Ctx = createContext({ inst: FALLBACK, refresh: () => {} });
export const useInstitution = () => useContext(Ctx);

export function InstitutionProvider({ children }) {
  const [inst, setInst] = useState(FALLBACK);
  const refresh = useCallback(() => get('/auth/institution').then((d) => setInst({ ...FALLBACK, ...d.institution })).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { document.title = inst.name ? `${inst.name} · Anka` : 'Anka - Result system'; }, [inst.name]);
  return <Ctx.Provider value={{ inst, refresh }}>{children}</Ctx.Provider>;
}
