---
name: Civic Sapphire Mobility
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434655'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cea700'
  on-tertiary-container: '#4e3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffe083'
  tertiary-fixed-dim: '#eec200'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: '0'
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.625rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style
The design system establishes an empathetic, resilient, and civic-minded visual language tailored for pedestrian navigation across Indonesian urban environments. Designed specifically for wheelchair operators, motorized mobility scooter riders, and citizens with low vision, the interface prioritizes immediate spatial comprehension over decorative complexity. 

The aesthetic fuses crisp modern civic architecture with high-contrast accessibility standards. It features generous, pillowy touch surfaces, unyielding typographic clarity, and purposeful signaling colors that pierce through outdoor glare. The emotional tone conveys unwavering reliability, dignity, independence, and civic community empowerment without resembling a sterile medical diagnostic tool.

## Colors
The palette is calibrated for direct sunlight visibility and rigorous WCAG 2.1 AAA/AA conformance. 

- **Primary Sapphire (`#1D4ED8`)**: Anchors primary navigation pathways, active vehicle tracking, and fundamental interactive triggers. Ensures high contrast against white card surfaces and street-level cartography.
- **Secondary Safe Passage Green (`#16A34A`)**: Signifies confirmed barrier-free ramps, clear pedestrian ways, and verified tactile paving (guiding blocks).
- **Tertiary Caution Amber (`#FACC15`)**: Indicates surface irregularities, steep inclines, or unpaved sections. Paired strictly with Dark Charcoal text (`#111827`) to guarantee minimum 11:1 luminance contrast.
- **Critical Hazard Red (`#DC2626`)**: Communicates impassable sidewalks, missing curb ramps, open drainage channels, or active construction. Employs crisp pure white (`#FFFFFF`) text and bold iconography.
- **Backgrounds & Canvas**: Built on `#F3F4F6` for base map viewports and clean `#FFFFFF` for elevated interactive surface sheets and modals.

## Typography
Typographic selections systematically decouple wayfinding waypoints from continuous spatial instruction.

`Manrope` governs primary headings, landmark anchors, and major routing distance figures, bringing balanced geometric rhythm and strong numerals. 

`Atkinson Hyperlegible Next` handles all body text, warnings, action labels, and community descriptions. Engineered specifically for ambiguous character distinction (e.g., distinguishing 'I', 'l', '1', and '0' from 'O'), it provides effortless readability for visually impaired users at glancing distances under shaking wheelchair travel. Body copy never renders below 16px to protect low-vision legibility.

## Layout & Spacing
Built around a standard mobile viewport baseline (390px width), the layout uses a single-column stacked hierarchy over dynamic cartography.

- **Margins & Gutters**: Outer canvas margins maintain a rigid `1.25rem` (20px) boundary to avoid hardware edge tap failures. Floating sheets, cards, and modal sheets span full width minus margins.
- **Rhythm**: Spacing follows comfortable physical reachability. Critical navigation actions sit strictly within the bottom 40% of the viewport (thumb-zone accessible).
- **Reflow**: For landscape orientations or tablet environments, sheets transition to docked side-panels with a max-width of 420px, preserving the cartographic visualization surface.

## Elevation & Depth
Depth separates transient dynamic alerts from structural map backgrounds without creating confusing visual noise.

- **Base Layer (Map & Routing Canvas)**: Sits at ground elevation zero (`#F3F4F6`), desaturated to make active routes and hazard pins pop unambiguously.
- **Surface Layer (Cards, Turn Panels, Bottom Sheets)**: Sits on Pure White (`#FFFFFF`) with a dual-stage soft shadow: `box-shadow: 0 4px 12px rgba(17, 24, 39, 0.06), 0 1px 3px rgba(17, 24, 39, 0.04)`.
- **Floating Overlays & Urgent Obstacle Alerts**: Features elevated prominence: `box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12), 0 2px 4px rgba(17, 24, 39, 0.04)`.
- **Focus & Selection**: Outlines do not use low-contrast gray rings. Instead, an active keyboard/switch focus state renders a high-visibility 3px solid `#1D4ED8` offset by 2px white space.

## Shapes
In line with roundedness level 3, the shape language uses pill-like, welcoming forms that eliminate harsh edges and visually cradle high-contrast content.

- **Buttons & Interactive Chips**: Fully pill-shaped (`rounded-full` or 9999px border-radius) to signal direct physical pressability.
- **Floating Bottom Sheets & Route Summary Cards**: Feature soft 20px (`1.25rem`) to 32px (`2rem`) radii, creating a comfortable, friendly, and approachable tactile perimeter.
- **Hazard Identifiers & Waypoint Markers**: Feature circular hulls with inset geometric alerts for instantaneous recognition regardless of visual angle.

## Components

### Buttons
All buttons maintain a strict minimum bounding box of 52px height (exceeding the standard 48px baseline) to accommodate motor tremors or bumpy transit. Primary buttons utilize solid Sapphire Blue (`#1D4ED8`) with white text and bold weights. Secondary actions use pure white cards bordered by a 2px solid `#111827` stroke. Always accompany icons with clear text labels in Indonesian (e.g., "Mulai Navigasi", "Lapor Hambatan").

### Chips & Filter Pills
Filter chips for sidewalk conditions (e.g., "Pemandu Difabel / Tactile", "Trotoar Rata", "Bebas PKL") feature a 48px height, 16px horizontal internal padding, and full pill rounding. Unselected chips have a `#FFFFFF` fill with a 1.5px `#111827` border; selected states flip to solid `#111827` with crisp white text.

### Accessibility Lists & Waypoint Feeds
List items are vertically separated by `0.625rem` (`space-sm`) gaps rather than subtle hairline dividers. Each item is encapsulated in its own distinct white card with 16px internal padding. Left-aligned directional badges pair intuitive SVG glyphs with redundant high-contrast textual indicators (e.g., "Belok Kiri 50m", "Tanjakan Curam 12°").

### Checkboxes, Radio Buttons & Switches
Selection controls measure a minimum of 28x28px inside a 48x48px tap container. Radio options and toggles feature heavy borders (2.5px width) to ensure clear readability for low-vision individuals without needing zoom assist.

### Input Fields (Search & Reporting)
Search bars and obstruction reporting inputs utilize a 56px height, pure white fill, and a continuous 2px border in `#111827`. Placeholder text maintains a 4.5:1 minimum contrast ratio (`#4B5563`). Trailing actions feature clear "Hapus" (Clear) and voice-to-text triggers.

### Obstacle & Hazard Alert Cards
Hazard components (e.g., "Jalan Rusak", "Pohon Tumbang", "Tidak Ramah Kursi Roda") feature a solid 6px left accent border color-coded to the severity (`#DC2626` for blocked paths, `#FACC15` for caution points). Text is set in bold Atkinson Hyperlegible Next with unambiguous instructions on bypass alternatives ("Gunakan Sisi Kanan Jalan").