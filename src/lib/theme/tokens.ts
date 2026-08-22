export const colors = {
  surface: "#fbf9f7",
  surfaceDim: "#dbdad8",
  surfaceBright: "#fbf9f7",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f5f3f1",
  surfaceContainer: "#efedec",
  surfaceContainerHigh: "#eae8e6",
  surfaceContainerHighest: "#e4e2e0",
  surfaceVariant: "#e4e2e0",
  onSurface: "#1b1c1b",
  onSurfaceVariant: "#534439",
  inverseSurface: "#30302f",
  inverseOnSurface: "#f2f0ee",

  outline: "#867467",
  outlineVariant: "#d8c2b4",
  surfaceTint: "#8e4e10",

  primary: "#8b4c0d",
  onPrimary: "#ffffff",
  primaryContainer: "#a96425",
  onPrimaryContainer: "#fffbff",
  inversePrimary: "#ffb77e",

  secondary: "#5f5e5e",
  onSecondary: "#ffffff",
  secondaryContainer: "#e4e2e1",
  onSecondaryContainer: "#656464",

  tertiary: "#006577",
  onTertiary: "#ffffff",
  tertiaryContainer: "#008096",
  onTertiaryContainer: "#f9fdff",

  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  mascotHappy: "#4ade80",
  mascotSatisfied: "#a78bfa",

  // Legibilidad financiera: la deuda NO usa el rojo de error/alerta
  positive: "#4ade80",
  debt: "#6e3900",
} as const;

export const radius = {
  sm: "0.25rem",
  DEFAULT: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  full: "9999px",
} as const;

export const spacing = {
  base: "8px",
  containerMargin: "24px",
  gutter: "16px",
  stackSm: "4px",
  stackMd: "12px",
  stackLg: "24px",
  sectionGap: "48px",
} as const;

export const typography = {
  headlineXl: { fontSize: "40px", fontWeight: 700, lineHeight: "48px", letterSpacing: "-0.02em" },
  headlineLg: { fontSize: "32px", fontWeight: 700, lineHeight: "40px", letterSpacing: "-0.02em" },
  headlineMd: { fontSize: "24px", fontWeight: 600, lineHeight: "32px" },
  bodyLg: { fontSize: "18px", fontWeight: 400, lineHeight: "28px" },
  bodyMd: { fontSize: "16px", fontWeight: 400, lineHeight: "24px" },
  labelMd: { fontSize: "14px", fontWeight: 600, lineHeight: "20px", letterSpacing: "0.05em" },
  labelSm: { fontSize: "12px", fontWeight: 500, lineHeight: "16px" },
} as const;
