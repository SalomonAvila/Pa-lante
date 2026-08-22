export const colors = {
  surface: "#fbf6ee",
  surfaceDim: "#ece2cd",
  surfaceBright: "#fbf6ee",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f5ead9",
  surfaceContainer: "#eee7da",
  surfaceContainerHigh: "#e6efe4",
  surfaceContainerHighest: "#e0d8c4",
  surfaceVariant: "#eee7da",
  onSurface: "#1c2b56",
  onSurfaceVariant: "#5b6584",
  inverseSurface: "#1c2b56",
  inverseOnSurface: "#ffffff",

  outline: "#d8cbb2",
  outlineVariant: "#e6d9c2",
  surfaceTint: "#f2a93c",

  primary: "#f2a93c",
  onPrimary: "#1c2b56",
  primaryContainer: "#f5ead9",
  onPrimaryContainer: "#96602f",
  inversePrimary: "#f2a93c",

  secondary: "#1c2b56",
  onSecondary: "#ffffff",
  secondaryContainer: "#e6d9c2",
  onSecondaryContainer: "#1c2b56",

  tertiary: "#4c8c6b",
  onTertiary: "#ffffff",
  tertiaryContainer: "#e6efe4",
  onTertiaryContainer: "#2f5943",

  error: "#c1432b",
  onError: "#ffffff",
  errorContainer: "#f7ded8",
  onErrorContainer: "#7a2716",

  mascotHappy: "#4c8c6b",
  mascotSatisfied: "#96602f",

  // Legibilidad financiera: la deuda NO usa el rojo de error/alerta
  positive: "#4c8c6b",
  debt: "#96602f",
} as const;

export const radius = {
  sm: "0.5rem",
  DEFAULT: "0.625rem",
  md: "0.75rem",
  lg: "1.25rem",
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
  headlineMd: { fontSize: "24px", fontWeight: 700, lineHeight: "32px" },
  bodyLg: { fontSize: "18px", fontWeight: 400, lineHeight: "28px" },
  bodyMd: { fontSize: "16px", fontWeight: 400, lineHeight: "24px" },
  labelMd: { fontSize: "14px", fontWeight: 600, lineHeight: "20px", letterSpacing: "0.05em" },
  labelSm: { fontSize: "12px", fontWeight: 500, lineHeight: "16px" },
} as const;
