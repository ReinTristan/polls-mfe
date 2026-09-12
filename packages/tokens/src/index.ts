/**
 * The tokens as a JS object, for anyone styling from JavaScript
 * (styled-components in poll-vote, inline styles in poll-results).
 *
 * Every entry is the NAME of the custom property, not its value. The values live
 * only in `tokens.css`, which is the single source of truth.
 *
 * This is not purism: with literal hex values here, styled-components would bake
 * the light-theme value into the class it generates, and the theme toggle could
 * not change it without a reload. By emitting `var(--polls-color-bg)`, a change
 * of `data-theme` propagates through inheritance and all three microfrontends
 * switch at once.
 */
export const tokens = {
  color: {
    bg: 'var(--polls-color-bg)',
    surface: 'var(--polls-color-surface)',
    surfaceSunken: 'var(--polls-color-surface-sunken)',
    text: 'var(--polls-color-text)',
    textMuted: 'var(--polls-color-text-muted)',
    textOnAccent: 'var(--polls-color-text-on-accent)',
    border: 'var(--polls-color-border)',
    borderStrong: 'var(--polls-color-border-strong)',
    accent: 'var(--polls-color-accent)',
    accentHover: 'var(--polls-color-accent-hover)',
    accentSubtle: 'var(--polls-color-accent-subtle)',
    focus: 'var(--polls-color-focus)',
    danger: 'var(--polls-color-danger)',
    success: 'var(--polls-color-success)',
  },
  space: {
    1: 'var(--polls-space-1)',
    2: 'var(--polls-space-2)',
    3: 'var(--polls-space-3)',
    4: 'var(--polls-space-4)',
    5: 'var(--polls-space-5)',
    6: 'var(--polls-space-6)',
    7: 'var(--polls-space-7)',
    8: 'var(--polls-space-8)',
  },
  font: {
    familySans: 'var(--polls-font-family-sans)',
    familyMono: 'var(--polls-font-family-mono)',
    sizeXs: 'var(--polls-font-size-xs)',
    sizeSm: 'var(--polls-font-size-sm)',
    sizeMd: 'var(--polls-font-size-md)',
    sizeLg: 'var(--polls-font-size-lg)',
    sizeXl: 'var(--polls-font-size-xl)',
    size2xl: 'var(--polls-font-size-2xl)',
    weightRegular: 'var(--polls-font-weight-regular)',
    weightMedium: 'var(--polls-font-weight-medium)',
    weightBold: 'var(--polls-font-weight-bold)',
    lineHeightTight: 'var(--polls-line-height-tight)',
    lineHeightNormal: 'var(--polls-line-height-normal)',
  },
  radius: {
    sm: 'var(--polls-radius-sm)',
    md: 'var(--polls-radius-md)',
    lg: 'var(--polls-radius-lg)',
    full: 'var(--polls-radius-full)',
  },
  shadow: {
    sm: 'var(--polls-shadow-sm)',
    md: 'var(--polls-shadow-md)',
    lg: 'var(--polls-shadow-lg)',
  },
  motion: {
    durationFast: 'var(--polls-duration-fast)',
    durationNormal: 'var(--polls-duration-normal)',
    easingStandard: 'var(--polls-easing-standard)',
  },
} as const

export type Tokens = typeof tokens
