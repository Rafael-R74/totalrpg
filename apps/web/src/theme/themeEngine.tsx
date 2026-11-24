import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SystemId } from '@totalrpg/shared';
import { fetchUserPreferences, saveUserPreferences } from '../services/api';

export type PaletteId =
  | 'ordo-crimson'
  | 'arton-gold'
  | 'arrakis-ochre'
  | 'lodo-amber'
  | 'abyssal-verdigris'
  | 'sepia-noir';

export type ArtDirectionId = 'dossier' | 'grimoire' | 'monolith' | 'editorial';
export type AtmosphereMode = 'subtle' | 'clean';
export type DensityMode = 'comfortable' | 'compact';
export type MotionMode = 'standard' | 'reduced';
export type DiceMode = 'auto' | '3d' | '2d';

export interface SystemThemePreset {
  palette: PaletteId;
  artDirection: ArtDirectionId;
}

export interface UserThemePreferences {
  palette: PaletteId;
  artDirection: ArtDirectionId;
  autoSystemTheme: boolean;
  atmosphere: AtmosphereMode;
  density: DensityMode;
  motion: MotionMode;
  dice: DiceMode;
  systemOverrides: Record<SystemId, SystemThemePreset>;
}

export interface PaletteMeta {
  id: PaletteId;
  name: string;
  subtitle: string;
  recommendedSystemLabel: string;
  swatches: {
    bg: string;
    surface: string;
    elevated: string;
    ink: string;
    accent: string;
    secondary: string;
  };
}

export interface ArtDirectionMeta {
  id: ArtDirectionId;
  name: string;
  badge: string;
  description: string;
  fontsLabel: string;
  geometryLabel: string;
  recommendedFor: string;
}

export const PALETTE_CATALOG: PaletteMeta[] = [
  {
    id: 'ordo-crimson',
    name: 'Arquivo Escarlate',
    subtitle: 'Osso sobre grafite frio, vermelho arterial nas ações.',
    recommendedSystemLabel: 'Ordem Paranormal',
    swatches: { bg: '#14171c', surface: '#1b1f26', elevated: '#242a33', ink: '#f1ece2', accent: '#d9423f', secondary: '#5b8fd9' },
  },
  {
    id: 'arton-gold',
    name: 'Coroa de Arton',
    subtitle: 'Basalto aquecido, couro e ouro forjado.',
    recommendedSystemLabel: 'Tormenta 20',
    swatches: { bg: '#18140f', surface: '#201b15', elevated: '#2b241c', ink: '#f6f0e6', accent: '#d19e3e', secondary: '#b83b3b' },
  },
  {
    id: 'arrakis-ochre',
    name: 'Areia & Especiaria',
    subtitle: 'Calcário, pedra imperial e ocre solar.',
    recommendedSystemLabel: 'Duna',
    swatches: { bg: '#171511', surface: '#1e1c17', elevated: '#29261f', ink: '#f3efe7', accent: '#d4893a', secondary: '#2b8ca3' },
  },
  {
    id: 'lodo-amber',
    name: 'Âmbar Noir',
    subtitle: 'Ardósia e âmbar queimado de lâmpada antiga.',
    recommendedSystemLabel: 'Investigação clássica',
    swatches: { bg: '#151719', surface: '#1c1f22', elevated: '#262a2e', ink: '#f2f3f5', accent: '#da8132', secondary: '#3b8ea5' },
  },
  {
    id: 'abyssal-verdigris',
    name: 'Verdete Abissal',
    subtitle: 'Água funda e cobre oxidado.',
    recommendedSystemLabel: 'Horror oceânico',
    swatches: { bg: '#10191b', surface: '#162225', elevated: '#1e2e32', ink: '#edf4f6', accent: '#34ba9f', secondary: '#c98a3b' },
  },
  {
    id: 'sepia-noir',
    name: 'Manuscrito Noturno',
    subtitle: 'Papel antigo à luz de vela, lacre de cobre.',
    recommendedSystemLabel: 'Crônicas e grimórios',
    swatches: { bg: '#1a1612', surface: '#221d18', elevated: '#2e2720', ink: '#f7f0e7', accent: '#d46d4e', secondary: '#498c84' },
  },
];

export const ART_DIRECTION_CATALOG: ArtDirectionMeta[] = [
  {
    id: 'dossier',
    name: 'Arquivo',
    badge: 'Horror investigativo',
    description: 'Títulos numa serifa afiada de livro de horror, cantos precisos.',
    fontsLabel: 'Gloock + Archivo',
    geometryLabel: 'Cantos de 4 a 10px',
    recommendedFor: 'Ordem Paranormal',
  },
  {
    id: 'grimoire',
    name: 'Códice',
    badge: 'Fantasia heroica',
    description: 'Capitulares romanas e molduras mais suaves, como um tomo.',
    fontsLabel: 'Cinzel + Archivo',
    geometryLabel: 'Cantos de 6 a 14px',
    recommendedFor: 'Tormenta 20',
  },
  {
    id: 'monolith',
    name: 'Monólito',
    badge: 'Ficção científica austera',
    description: 'Grotesca expandida e leve, ângulos retos, nada de ornamento.',
    fontsLabel: 'Archivo Expanded + Archivo',
    geometryLabel: 'Ângulos retos',
    recommendedFor: 'Duna',
  },
  {
    id: 'editorial',
    name: 'Estúdio',
    badge: 'Leitura longa',
    description: 'Serifa de texto calma e curvas generosas para sessões longas.',
    fontsLabel: 'Newsreader + Archivo',
    geometryLabel: 'Cantos de 7 a 16px',
    recommendedFor: 'Qualquer sistema',
  },
];

export const DEFAULT_SYSTEM_OVERRIDES: Record<SystemId, SystemThemePreset> = {
  'ordem-paranormal': { palette: 'ordo-crimson', artDirection: 'dossier' },
  tormenta20: { palette: 'arton-gold', artDirection: 'grimoire' },
  duna: { palette: 'arrakis-ochre', artDirection: 'monolith' },
};

export const DEFAULT_USER_THEME_PREFERENCES: UserThemePreferences = {
  palette: 'ordo-crimson',
  artDirection: 'dossier',
  autoSystemTheme: true,
  atmosphere: 'subtle',
  density: 'comfortable',
  motion: 'standard',
  dice: 'auto',
  systemOverrides: { ...DEFAULT_SYSTEM_OVERRIDES },
};

const GUEST_STORAGE_KEY = 'totalrpg_ui_prefs_guest';
const LAST_ACTIVE_STORAGE_KEY = 'totalrpg_ui_prefs_active';

function getStorageKey(userId?: string | null): string {
  return userId ? `totalrpg_ui_prefs_${userId}` : GUEST_STORAGE_KEY;
}

export function sanitizePreferences(raw: any): UserThemePreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_THEME_PREFERENCES };

  const validPalettes = new Set<PaletteId>(PALETTE_CATALOG.map((p) => p.id));
  const validDirections = new Set<ArtDirectionId>(ART_DIRECTION_CATALOG.map((d) => d.id));

  const palette: PaletteId = validPalettes.has(raw.palette)
    ? raw.palette
    : DEFAULT_USER_THEME_PREFERENCES.palette;
  const artDirection: ArtDirectionId = validDirections.has(raw.artDirection)
    ? raw.artDirection
    : DEFAULT_USER_THEME_PREFERENCES.artDirection;

  const rawOverrides = raw.systemOverrides || {};
  const systemOverrides: Record<SystemId, SystemThemePreset> = {
    'ordem-paranormal': {
      palette: validPalettes.has(rawOverrides['ordem-paranormal']?.palette)
        ? rawOverrides['ordem-paranormal'].palette
        : DEFAULT_SYSTEM_OVERRIDES['ordem-paranormal'].palette,
      artDirection: validDirections.has(rawOverrides['ordem-paranormal']?.artDirection)
        ? rawOverrides['ordem-paranormal'].artDirection
        : DEFAULT_SYSTEM_OVERRIDES['ordem-paranormal'].artDirection,
    },
    tormenta20: {
      palette: validPalettes.has(rawOverrides.tormenta20?.palette)
        ? rawOverrides.tormenta20.palette
        : DEFAULT_SYSTEM_OVERRIDES.tormenta20.palette,
      artDirection: validDirections.has(rawOverrides.tormenta20?.artDirection)
        ? rawOverrides.tormenta20.artDirection
        : DEFAULT_SYSTEM_OVERRIDES.tormenta20.artDirection,
    },
    duna: {
      palette: validPalettes.has(rawOverrides.duna?.palette)
        ? rawOverrides.duna.palette
        : DEFAULT_SYSTEM_OVERRIDES.duna.palette,
      artDirection: validDirections.has(rawOverrides.duna?.artDirection)
        ? rawOverrides.duna.artDirection
        : DEFAULT_SYSTEM_OVERRIDES.duna.artDirection,
    },
  };

  return {
    palette,
    artDirection,
    autoSystemTheme:
      typeof raw.autoSystemTheme === 'boolean'
        ? raw.autoSystemTheme
        : DEFAULT_USER_THEME_PREFERENCES.autoSystemTheme,
    atmosphere: raw.atmosphere === 'clean' ? 'clean' : 'subtle',
    density: raw.density === 'compact' ? 'compact' : 'comfortable',
    motion: raw.motion === 'reduced' ? 'reduced' : 'standard',
    dice: raw.dice === '3d' || raw.dice === '2d' ? raw.dice : 'auto',
    systemOverrides,
  };
}

function readStoredPreferences(userId?: string | null): UserThemePreferences {
  try {
    const primary = localStorage.getItem(getStorageKey(userId));
    if (primary) return sanitizePreferences(JSON.parse(primary));
    const fallback = localStorage.getItem(LAST_ACTIVE_STORAGE_KEY);
    if (fallback) return sanitizePreferences(JSON.parse(fallback));
  } catch {
    // ignore corrupted storage
  }
  return { ...DEFAULT_USER_THEME_PREFERENCES };
}

function applyThemeAttributesToDocument(
  effectivePalette: PaletteId,
  effectiveArtDirection: ArtDirectionId,
  prefs: UserThemePreferences,
  activeSystem: SystemId | null
) {
  const root = document.documentElement;
  root.setAttribute('data-palette', effectivePalette);
  root.setAttribute('data-art-direction', effectiveArtDirection);
  root.setAttribute('data-atmosphere', prefs.atmosphere);
  root.setAttribute('data-density', prefs.density);
  root.setAttribute('data-motion', prefs.motion);
  if (activeSystem) {
    root.setAttribute('data-active-system', activeSystem);
  } else {
    root.removeAttribute('data-active-system');
  }

  const palMeta = PALETTE_CATALOG.find((p) => p.id === effectivePalette);
  if (palMeta) {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', palMeta.swatches.bg);
    }
  }
}

interface ThemeContextValue {
  preferences: UserThemePreferences;
  activeSystem: SystemId | null;
  effectivePalette: PaletteId;
  effectiveArtDirection: ArtDirectionId;
  setActiveSystem: (sys: SystemId | null) => void;
  updatePreferences: (patch: Partial<UserThemePreferences>) => void;
  updateSystemOverride: (system: SystemId, preset: Partial<SystemThemePreset>) => void;
  resetPreferences: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preferences: DEFAULT_USER_THEME_PREFERENCES,
  activeSystem: null,
  effectivePalette: DEFAULT_USER_THEME_PREFERENCES.palette,
  effectiveArtDirection: DEFAULT_USER_THEME_PREFERENCES.artDirection,
  setActiveSystem: () => {},
  updatePreferences: () => {},
  updateSystemOverride: () => {},
  resetPreferences: () => {},
});

export function ThemeProvider({
  userId,
  children,
}: {
  userId?: string | null;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<UserThemePreferences>(() =>
    readStoredPreferences(userId)
  );
  const [activeSystem, setActiveSystem] = useState<SystemId | null>(null);

  // Recarrega do localStorage e sincroniza com o servidor quando o usuário autenticado muda
  useEffect(() => {
    const localPrefs = readStoredPreferences(userId);
    setPreferences(localPrefs);

    if (!userId) return;
    let active = true;
    fetchUserPreferences()
      .then((res) => {
        if (!active || !res?.preferences) return;
        const merged = sanitizePreferences(res.preferences);
        setPreferences(merged);
        localStorage.setItem(getStorageKey(userId), JSON.stringify(merged));
        localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, JSON.stringify(merged));
      })
      .catch(() => {
        // Servidor pode ainda não ter preferências salvas; mantém local
      });

    return () => {
      active = false;
    };
  }, [userId]);

  // Escuta mudanças entre abas (ex.: Mestre altera paleta no Dashboard e o 2º Monitor reflete na hora!)
  useEffect(() => {
    function handleStorage(ev: StorageEvent) {
      if (
        ev.key === getStorageKey(userId) ||
        ev.key === LAST_ACTIVE_STORAGE_KEY
      ) {
        if (ev.newValue) {
          try {
            setPreferences(sanitizePreferences(JSON.parse(ev.newValue)));
          } catch {
            // ignore
          }
        }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId]);

  const effectivePreset = useMemo<SystemThemePreset>(() => {
    if (preferences.autoSystemTheme && activeSystem) {
      return (
        preferences.systemOverrides[activeSystem] ||
        DEFAULT_SYSTEM_OVERRIDES[activeSystem]
      );
    }
    return {
      palette: preferences.palette,
      artDirection: preferences.artDirection,
    };
  }, [preferences, activeSystem]);

  useEffect(() => {
    applyThemeAttributesToDocument(
      effectivePreset.palette,
      effectivePreset.artDirection,
      preferences,
      activeSystem
    );
  }, [effectivePreset, preferences, activeSystem]);

  function persistNext(next: UserThemePreferences) {
    setPreferences(next);
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
      localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
    if (userId) {
      saveUserPreferences(next).catch(() => {});
    }
  }

  function updatePreferences(patch: Partial<UserThemePreferences>) {
    persistNext(sanitizePreferences({ ...preferences, ...patch }));
  }

  function updateSystemOverride(system: SystemId, preset: Partial<SystemThemePreset>) {
    const nextOverrides = {
      ...preferences.systemOverrides,
      [system]: {
        ...preferences.systemOverrides[system],
        ...preset,
      },
    };
    persistNext(sanitizePreferences({ ...preferences, systemOverrides: nextOverrides }));
  }

  function resetPreferences() {
    persistNext({
      ...DEFAULT_USER_THEME_PREFERENCES,
      systemOverrides: { ...DEFAULT_SYSTEM_OVERRIDES },
    });
  }

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        activeSystem,
        effectivePalette: effectivePreset.palette,
        effectiveArtDirection: effectivePreset.artDirection,
        setActiveSystem,
        updatePreferences,
        updateSystemOverride,
        resetPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
