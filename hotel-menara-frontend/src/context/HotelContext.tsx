import { createContext, useContext, useMemo, type ReactNode } from "react";
import { api } from "../api";
import type { HotelSettings } from "../api/types";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../i18n/LanguageContext";
import { resolveHotel, type HotelInfo } from "../lib/hotel";

interface HotelValue {
  hotel: HotelInfo;
  settings: HotelSettings | undefined;
  settingsLoading: boolean;
  settingsError: unknown;
  reloadSettings: () => void;
}

const HotelContext = createContext<HotelValue | null>(null);

/** Loads GET /settings once for the whole site. */
export function HotelProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const settings = useApi("settings", api.settings);
  const value = useMemo(
    () => ({
      hotel: resolveHotel(settings.data, lang),
      settings: settings.data,
      settingsLoading: settings.loading,
      settingsError: settings.error,
      reloadSettings: settings.reload,
    }),
    [settings.data, settings.loading, settings.error, settings.reload, lang],
  );
  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotel(): HotelValue {
  const value = useContext(HotelContext);
  if (!value) throw new Error("useHotel must be used inside <HotelProvider>");
  return value;
}
