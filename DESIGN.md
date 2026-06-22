# Design System - Master Typing Pro

This document specifies the visual theme, color tokens, typography, layout, and component guidelines for Master Typing Pro.

## 🎨 Color Palette (OKLCH)

We use a high-end, premium dark theme by default, with custom light and colored themes.

### Default Premium Dark Theme
* **Background**: `oklch(0.12 0.01 250)` (Deep sapphire tint, avoids pure black)
* **Foreground**: `oklch(0.985 0 0)` (Near-white ink)
* **Primary (Accent)**: `oklch(0.65 0.15 250)` (Vibrant primary blue)
* **Secondary**: `oklch(0.2 0.05 250 / 0.5)`
* **Muted Foreground**: `oklch(0.708 0 0)` (Soft secondary ink)
* **Border**: `oklch(1 0 0 / 0.08)` (Transparent white boundary line)

### Glassmorphism 2.0 Tokens
* **Glass Background**: `rgba(255, 255, 255, 0.03)`
* **Glass Border**: `rgba(255, 255, 255, 0.08)`
* **Glass Shadow**: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`

---

## 🔠 Typography

* **Font Family**: Sans-serif (using Google Fonts Outfit / Inter) for modern, clean reading.
* **Line Length**: Body text is capped at `65-75ch` to optimize reading ergonomics.
* **Headings**: `text-wrap: balance` is applied on H1-H3 to prevent uneven line breaks.
* **Prose**: `text-wrap: pretty` is applied to eliminate orphans on paragraph ends.

---

## 📐 Spacing & Layout

* **Rhythm**: We use standard Tailwind spacing variables (`p-6`, `gap-6`, `space-y-8`) to maintain consistent horizontal and vertical grid rhythm.
* **Desktop App Window Drag Region**:
  * The top nav header has `.electron-drag` enabled for window moving.
  * Interactive elements have `.electron-no-drag` to ensure they receive standard click and focus events.
  * Right padding (`pr-48` and `right-[180px]` absolute layout offsets) is used in the navigation bar to prevent overlapping the system title overlay controls on Windows/macOS.

---

## ⚡ Components

### 1. SpotlightCard
* **Description**: A wrapper card with standard border borders that tracks the cursor, rendering an ambient radial glow on hover.
* **Hover State**: Perfect border-boundary stability. Content translates up by `-translate-y-1` while the outer border container remains stationary.

### 2. Custom Buttons
* **Timing**: Transition duration is `duration-150` with an `ease-out` timing curve.
* **Tactile Feedback**: Press state translates to an organic shrink compression (`active:scale-[0.97]`) instead of moving vertically.
