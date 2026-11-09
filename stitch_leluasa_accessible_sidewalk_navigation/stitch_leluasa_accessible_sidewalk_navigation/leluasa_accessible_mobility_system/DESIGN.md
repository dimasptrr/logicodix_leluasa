---
name: Leluasa Accessible Mobility System
colors:
  surface: '#f7f9ff'
  surface-dim: '#c1ddfb'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#d8eaff'
  surface-container-highest: '#cee5ff'
  on-surface: '#001d32'
  on-surface-variant: '#43474d'
  inverse-surface: '#16334a'
  inverse-on-surface: '#e8f2ff'
  outline: '#74777e'
  outline-variant: '#c3c6ce'
  surface-tint: '#49607c'
  primary: '#00152a'
  on-primary: '#ffffff'
  primary-container: '#102a43'
  on-primary-container: '#7a92b0'
  inverse-primary: '#b0c9e8'
  secondary: '#006a62'
  on-secondary: '#ffffff'
  secondary-container: '#83f6e7'
  on-secondary-container: '#007168'
  tertiary: '#081715'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c2b2a'
  on-tertiary-container: '#839390'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#b0c9e8'
  on-primary-fixed: '#011d35'
  on-primary-fixed-variant: '#314863'
  secondary-fixed: '#83f6e7'
  secondary-fixed-dim: '#65d9cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#d5e6e3'
  tertiary-fixed-dim: '#b9cac7'
  on-tertiary-fixed: '#0f1e1d'
  on-tertiary-fixed-variant: '#3a4a48'
  background: '#f7f9ff'
  on-background: '#001d32'
  surface-variant: '#cee5ff'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.625rem
    fontWeight: '700'
    lineHeight: 2.125rem
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  label-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.125rem
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system drives a modern, civic-minded navigation experience engineered specifically for wheelchair users, mobility-impaired pedestrians, and city strollers. The platform communicates safety, intelligent clarity, effortless dignity, and mutual community support. Visual choices prioritize spatial certainty, reducing cognitive and physical friction through generous affordances and unmistakable environmental wayfinding.

The design movement combines **Modern High-Affordance Functionalism** with **Civic Humanism**:
- **Clarity over Decorative Novelty:** Every icon, label, and obstacle signal serves immediate legibility under bright outdoor sun or low-light evening transit.
- **Friendly Authority:** Softly curved structural surfaces counter the clinical, institutional aesthetic common in accessibility tools, offering an empowering lifestyle companion.
- **Dignified Micro-Interactions:** Haptic confirmations, crisp contrast rings, and spatial anchor tags build user trust during real-time navigation.

## Colors

The palette establishes an authoritative, calming bedrock with high-energy guidance accents and deterministic safety status markers. All text and UI component combinations strictly adhere to WCAG 2.2 AA and AAA contrast standards across both outdoor mobile contexts and desktop command centers.

### System Palette
- **Primary Navy (`#102A43`):** Foundational anchor. Used for primary typography, dominant header bars, bottom navigation frames, and primary actionable states.
- **Primary Teal (`#0F9D91`):** Civic action. Signifies route progress, active turn vectors, verified community contributions, and active selection states.
- **Mint Tint (`#E4F5F2`):** Low-strain structural tint. Used for callout surfaces, map sheet backdrops, and active toggle backgrounds.
- **Canvas (`#F5F8FA`):** Soft, low-glare outdoor background, engineered to eliminate retina fatigue.
- **Surface (`#FFFFFF`):** High-contrast base for cards, bottom sheets, search overlays, and modal alerts.
- **Accessible Text Primary (`#172B4D`):** Reaches WCAG AAA 7:1+ contrast on pure white and mint surfaces.
- **Muted Slate (`#627D98`):** For distance tickers, metadata timestamps, and resting iconography.

### Semantic Mobility & Hazard Scale
- **Passable / Clear (`#168A58`):** Curb ramps deployed, level grade, clear route corridor.
- **Caution / Difficult (`#D99A19`):** Steep slope (>6%), uneven brickwork, temporary narrow corridor, construction warning.
- **Impassable / Blocked (`#D64545`):** Missing curb cuts, stairs without elevator, complete sidewalk closure, debris.

## Typography

The typography strategy leverages **Plus Jakarta Sans** for prominent navigational commands and headings, lending a friendly, contemporary civic voice. **Inter** is deployed for tactical instructions, elevation readouts, and map sheet details due to its neutral character shapes, wide counters, and exceptional optical rendering on mobile displays.

- **Legibility Guards:** Letter spacing remains neutral or slightly loose (`letter-spacing: +0.01em` on small body and labels) to accommodate visual impairments and glare conditions.
- **Dynamic Type Scalability:** Type tokens maintain proportional hierarchy across standard 100% to 200% system accessibility text scalers without breaking card boundaries.
- **Directional Clarity:** Heading weights prioritize 600 and 700 weights to immediately isolate next-step directives from auxiliary route data.

## Layout & Spacing

Layout geometry follows an adaptable 8-point spatial model mapped to an accessible column structure:
- **Mobile (< 768px):** 4-column fluid layout with `margin: 1rem` and `gutter: 1rem`. Bottom sheets and persistent route trays hug edges with vertical finger-friendly offsets.
- **Tablet (768px - 1024px):** 8-column fluid layout. Map views expand full-canvas while navigation drawers dock to an anchored 380px floating side panel.
- **Desktop (>= 1024px):** 12-column layout with max-width content container caps of 1440px, anchored by a split screen (60% interactive route map, 40% incident report feed and civic dashboard).

### Touch Target Standard
All clickable triggers, directional tags, and obstacle report pins enforce a minimum bounding box of **48px × 48px** with an active spatial perimeter of at least 8px, exceeding standard guidelines to simplify single-handed and tremor-prone navigation.

## Elevation & Depth

Visual hierarchy uses **tonal layer nesting** paired with **soft, diffused ambient drop shadows**. This approach establishes clear physical separation between the active street map, floating navigation controls, and critical alerts.

- **Level 0 (Flat Ground):** Base map canvas, static road layers, and route geometry lines.
- **Level 1 (Card Rest):** Sidewalk report items, amenity summaries, and list views resting on `#FFFFFF` with shadow `0 2px 8px -2px rgba(16, 42, 67, 0.06), 0 1px 3px rgba(16, 42, 67, 0.04)`.
- **Level 2 (Floating Controls & Bottom Sheets):** Directional action panels, locate-me buttons, and route cards resting at `0 8px 24px -4px rgba(16, 42, 67, 0.12), 0 2px 6px -1px rgba(16, 42, 67, 0.04)`.
- **Level 3 (Urgent Waypoint Overlays & Obstacle Alerts):** Impassable zone notifications and detour popovers featuring `0 16px 36px -6px rgba(16, 42, 67, 0.18), 0 4px 12px -2px rgba(16, 42, 67, 0.08)`.
- **Focus Depth & Rings:** Interactive elements receive a high-contrast dual ring on active focus: `0 0 0 2px #FFFFFF, 0 0 0 5px #0F9D91`.

## Shapes

The design system employs a **Rounded** shape model (`0.5rem` base, scaling to `1rem` on primary cards and `1.5rem` on modal sheets and persistent nav panels).

- **Standard Buttons & Inputs:** `0.75rem` (`rounded-lg`) to balance structural cohesion with a soft, friendly hand-feel.
- **Pills for States & Filters:** Full-radius pill curves (`9999px`) for slope filters, incline meters, surface type chips (Asphalt, Paved, Cobblestone), and quick-action toggles.
- **Floating Sheet Enclosures:** Top-left and top-right radii of `1.5rem` on bottom navigation drawers to visually nest over the map viewport.

## Components

### Buttons
- **Primary Action (Turn by Turn, Start Route):** Navy background (`#102A43`), crisp white text (`#FFFFFF`), `min-height: 52px`, `rounded-lg`. Focus state presents a dual teal ring.
- **Secondary Civic Action (Report Issue, Clear Filter):** Mint background (`#E4F5F2`), Teal text (`#0F9D91`), `min-height: 52px`, `border: 1px solid rgba(15, 157, 145, 0.25)`.
- **Hazard Trigger (Quick Avoid):** Impassable Red (`#D64545`), white text, bold label with obstacle icon.

### Chips & Filters
- **Resting:** Background `#FFFFFF`, border `1.5px solid #627D98` at 30% opacity, text `#172B4D`, height `40px`.
- **Active State:** Background `#E4F5F2`, border `1.5px solid #0F9D91`, text `#0F9D91`, font weight 600.
- **Severity Chips:** Pill tags carrying solid micro-badges:
  - Green Pill: `#168A58` background with `#FFFFFF` text.
  - Amber Pill: `#D99A19` background with `#102A43` text.
  - Red Pill: `#D64545` background with `#FFFFFF` text.

### Inputs & Search Bars
- Floating destination search inputs utilize white surfaces (`#FFFFFF`), height `56px`, `rounded-xl`, with ambient Level 2 shadow.
- Placeholder text: `#627D98` with high-contrast icon adornment (48px tap targets for speech input and wheelchair filter buttons).
- Border: `1.5px solid transparent`, transitioning to `#0F9D91` on focus.

### Lists & Incident Feeds
- Spaced with `space-md` gaps. Each list element has an explicit minimum vertical height of 64px.
- List items include left-aligned tactile status indicators (grade percentage, obstruction icon) and a clear chevron with high-contrast metadata.

### Checkboxes, Radios, and Toggles
- Sized at `24px × 24px` with a hit area padded out to `48px`.
- Checkboxes use `rounded-md` with `#0F9D91` fill and `#FFFFFF` heavy checkmarks.
- Radio buttons feature a 3px interior clearance ring when selected.

### Route & Incline Cards
- Surfaces feature pure white backgrounds with a subtle `1px solid rgba(98, 125, 152, 0.12)` border.
- Cards host an Incline Profile Graph accompanied by visual elevation cues (e.g., maximum slope grades, surface changes, audible ramp verification).
- High visual separation between the route summary and community confidence score badges.