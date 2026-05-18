---
name: IQSTACK Core
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a3f'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a6e'
  outline-variant: '#bccabc'
  surface-tint: '#006d37'
  primary: '#006d37'
  on-primary: '#ffffff'
  primary-container: '#27ae60'
  on-primary-container: '#00391a'
  inverse-primary: '#61de8a'
  secondary: '#55615a'
  on-secondary: '#ffffff'
  secondary-container: '#d9e6dd'
  on-secondary-container: '#5b6760'
  tertiary: '#446276'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d9cb3'
  on-tertiary-container: '#133446'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7efba4'
  primary-fixed-dim: '#61de8a'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#d9e6dd'
  secondary-fixed-dim: '#bdcac1'
  on-secondary-fixed: '#131e19'
  on-secondary-fixed-variant: '#3e4943'
  tertiary-fixed: '#c7e7ff'
  tertiary-fixed-dim: '#abcbe2'
  on-tertiary-fixed: '#001e2e'
  on-tertiary-fixed-variant: '#2b4a5e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1280px
---

## Brand & Style
The brand personality is rooted in "Ethical Efficiency"—merging high-performance technology with environmental stewardship. The design system targets eco-conscious developers and sustainable enterprises who value transparency and carbon-neutral infrastructure.

The visual style is **Eco-Minimalism**. It prioritizes extreme clarity, generous white space, and a breathable interface that mirrors the openness of a natural environment. By stripping away non-essential decorative elements, the UI evokes a sense of calm, reliability, and modern sophistication. The emotional response should be one of "Digital Freshness," where the user feels their infrastructure is both powerful and ecologically responsible.

## Colors
The palette is centered on a vibrant, growth-oriented green that signifies vitality and sustainability. 

- **Primary (#27ae60):** Used for primary actions, success states, and progress indicators. It represents the "Go" signal of sustainable energy.
- **Secondary/Surface (#f0fdf4):** A soft mint used for large background areas to reduce eye strain and differentiate from standard clinical whites.
- **Tertiary/Text (#1a3a4d):** A deep navy-slate that provides high-contrast legibility without the harshness of pure black.
- **Neutral (#64748b):** Used for secondary text, borders, and inactive states to maintain a soft, professional demeanor.

## Typography
This design system utilizes **Inter** across all levels to maintain a systematic, utilitarian aesthetic that remains highly readable. 

Headlines use tight letter spacing and bold weights to ground the layout. Body text is set with generous line heights to promote scanning and reduce cognitive load. Labels utilize slightly increased letter spacing and medium weights to ensure clarity in dense dashboard environments.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Content is centered within a 1280px maximum width container on desktop, utilizing a 12-column grid. On mobile, the system shifts to a single-column layout with 16px side margins.

Spacing follows a strict 4px baseline grid. Elements are grouped using internal padding (16px or 24px) to create distinct visual clusters, while large vertical gaps (40px+) are used between sections to emphasize the minimalist, "airy" brand feel.

## Elevation & Depth
Depth is expressed through **Tonal Layering** supplemented by **Ambient Shadows**. 

The base background is the light mint surface. Elevated elements like dashboard cards use a pure white fill to "pop" from the background. Shadows are extremely soft and diffused, using the primary navy color at very low opacity (e.g., `rgba(26, 58, 77, 0.05)`) rather than black. This keeps the elevation feeling organic rather than mechanical. Hover states for interactive cards should slightly increase shadow spread and lift the element by 2px.

## Shapes
The shape language is defined by a consistent **12px radius (Rounded)**. This radius is applied to cards, buttons, and input fields to soften the technological nature of the product. 

Progress indicators and status badges may use pill-shaping (circular ends) to contrast against the structured grid of the dashboard.

## Components
- **Buttons:** Primary buttons use the Green (#27ae60) fill with white text. Secondary buttons use a subtle green outline or a faint green tint background with green text.
- **Dashboard Cards:** Pure white backgrounds with 12px rounded corners and a subtle 1px border using a 10% opacity version of the navy text color.
- **Circular Progress:** Used for server health and carbon offsets. Use the primary green for the active track and the secondary mint for the inactive track.
- **Data Visualization:** Line and bar charts should use a simplified "Eco-Palette" consisting of the primary green and complementary soft blues. Avoid harsh "Alert Red" unless a critical failure is occurring.
- **Battery Indicators:** A custom component for energy efficiency monitoring. Use a segmented 4-bar design within a rounded container to represent power usage levels.
- **Inputs:** Clean white fields with a 1px soft slate border. Focus states should trigger a 2px primary green border and a soft green outer glow.