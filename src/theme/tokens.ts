import { Platform } from 'react-native';

export const palette = {
  mint: {
    50: '#E9FBF4',
    100: '#C9F5E4',
    200: '#96EBCB',
    300: '#5CDFAF',
    400: '#2FD39A',
    500: '#16B884',
    600: '#0D966B',
    700: '#0B7857',
    800: '#0B5F47',
    900: '#0A4D3B',
  },
  violet: {
    50: '#F3F1FF',
    100: '#E6E1FF',
    200: '#CFC5FF',
    300: '#B2A1FF',
    400: '#9179FB',
    500: '#7C5CF6',
    600: '#6941E8',
    700: '#5731C9',
    800: '#4729A3',
    900: '#3C2481',
  },
  ink: {
    50: '#F7F8FA',
    100: '#EDF0F4',
    200: '#DFE4EB',
    300: '#C6CEDA',
    400: '#98A4B5',
    500: '#6C7889',
    600: '#4E5969',
    700: '#3B4451',
    800: '#272E38',
    900: '#151A21',
    950: '#0B0E13',
  },
  coral: {
    400: '#FF7A85',
    500: '#F45563',
    600: '#DC3A48',
  },
  amber: {
    400: '#FFC24B',
    500: '#F5A623',
    600: '#D9820B',
  },
  sky: {
    400: '#4BA3F5',
    500: '#2C86E8',
    600: '#1668C4',
  },
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
  pill: 999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const fonts = {
  /** Display / numerals / headings. */
  display: 'PlusJakartaSans_700Bold',
  displaySemi: 'PlusJakartaSans_600SemiBold',
  /** Body copy. */
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
} as const;

export type AccentName = 'mint' | 'violet' | 'sky' | 'amber' | 'coral';

type AccentRamp = { 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string };

export const accents: Record<AccentName, AccentRamp> = {
  mint: palette.mint,
  violet: palette.violet,
  sky: { 50: '#EEF6FF', 100: '#D6EAFE', 200: '#AFD6FD', 300: '#7EBBFB', 400: '#4BA3F5', 500: '#2C86E8', 600: '#1668C4', 700: '#0F5199' },
  amber: { 50: '#FFF8EA', 100: '#FFEFCC', 200: '#FFDD99', 300: '#FFC85C', 400: '#FFC24B', 500: '#F5A623', 600: '#D9820B', 700: '#AC6104' },
  coral: { 50: '#FFF1F2', 100: '#FFE0E2', 200: '#FFC2C6', 300: '#FF9AA1', 400: '#FF7A85', 500: '#F45563', 600: '#DC3A48', 700: '#B32B37' },
};

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  accentOn: string;
  secondary: string;
  secondarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  tabBar: string;
  scrim: string;
  skeleton: string;
};

const lightShadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0B1F2E',
      shadowOpacity: 0.05,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0px 8px 24px rgba(11, 31, 46, 0.06)' },
  }) as object,
  raised: Platform.select({
    ios: {
      shadowColor: '#0B1F2E',
      shadowOpacity: 0.1,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 8 },
    default: { boxShadow: '0px 14px 34px rgba(11, 31, 46, 0.1)' },
  }) as object,
  tab: Platform.select({
    ios: {
      shadowColor: '#0B1F2E',
      shadowOpacity: 0.08,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 16 },
    default: { boxShadow: '0px -6px 28px rgba(11, 31, 46, 0.08)' },
  }) as object,
};

const darkShadows = {
  card: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 2 },
    default: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.4)' },
  }) as object,
  raised: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 26, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 8 },
    default: { boxShadow: '0px 14px 34px rgba(0, 0, 0, 0.5)' },
  }) as object,
  tab: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
    android: { elevation: 16 },
    default: { boxShadow: '0px -6px 28px rgba(0, 0, 0, 0.45)' },
  }) as object,
};

export const typography = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.4 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.9 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
} as const;

function buildTheme(scheme: 'light' | 'dark', accent: AccentName) {
  const ramp = accents[accent];
  const shadows = scheme === 'light' ? lightShadows : darkShadows;

  const colors: ThemeColors =
    scheme === 'light'
      ? {
          background: '#F4F6F9',
          surface: '#FFFFFF',
          surfaceAlt: '#FAFBFD',
          surfaceSunken: '#EDF0F5',
          border: '#E7EBF1',
          borderStrong: '#D3DAE4',
          text: '#151A21',
          textMuted: '#6C7889',
          textFaint: '#98A4B5',
          accent: ramp[500],
          accentSoft: ramp[50],
          accentMuted: ramp[100],
          accentOn: '#FFFFFF',
          secondary: palette.violet[500],
          secondarySoft: palette.violet[50],
          success: palette.mint[500],
          successSoft: palette.mint[50],
          danger: palette.coral[500],
          dangerSoft: '#FFF1F2',
          warning: palette.amber[500],
          warningSoft: '#FFF8EA',
          info: palette.sky[500],
          infoSoft: '#EEF6FF',
          tabBar: 'rgba(255,255,255,0.94)',
          scrim: 'rgba(16,22,30,0.42)',
          skeleton: '#E7EBF1',
        }
      : {
          background: '#0B0E13',
          surface: '#151A21',
          surfaceAlt: '#1A2029',
          surfaceSunken: '#101519',
          border: '#242C37',
          borderStrong: '#333D4B',
          text: '#F2F5F9',
          textMuted: '#98A4B5',
          textFaint: '#6C7889',
          accent: ramp[400],
          accentSoft: `${ramp[500]}1F`,
          accentMuted: `${ramp[500]}33`,
          accentOn: '#0B0E13',
          secondary: palette.violet[400],
          secondarySoft: `${palette.violet[500]}26`,
          success: palette.mint[400],
          successSoft: `${palette.mint[500]}26`,
          danger: palette.coral[400],
          dangerSoft: `${palette.coral[500]}26`,
          warning: palette.amber[400],
          warningSoft: `${palette.amber[500]}26`,
          info: palette.sky[400],
          infoSoft: `${palette.sky[500]}26`,
          tabBar: 'rgba(16,21,28,0.94)',
          scrim: 'rgba(0,0,0,0.6)',
          skeleton: '#242C37',
        };

  return { scheme, accent, colors, shadows, radius, spacing, fonts, typography };
}

export type AppTheme = ReturnType<typeof buildTheme>;

export const lightTheme = (accent: AccentName = 'mint') => buildTheme('light', accent);
export const darkTheme = (accent: AccentName = 'mint') => buildTheme('dark', accent);
