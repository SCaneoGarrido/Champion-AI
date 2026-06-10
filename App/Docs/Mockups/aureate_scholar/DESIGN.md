# Design System Specification

## 1. Overview & Creative North Star: "The Scholarly Architect"

This design system moves away from the sterile, institutional feel of traditional educational software. Our Creative North Star is **"The Scholarly Architect."** It treats the student not as a passive consumer, but as a builder of knowledge. 

The aesthetic is characterized by **Editorial Sophistication**: high-contrast typography, intentional asymmetry, and a "layered paper" philosophy. We reject the "boxed-in" look of standard grids. Instead, we use breathing room, overlapping elements, and tonal depth to create a focused, premium environment that feels like a modern digital atelier for the mind.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

The palette is anchored in **Ink-950** for authority and **Gold-500** for achievement. To maintain a high-end feel, we follow a strict hierarchy of surfaces rather than relying on structural lines.

### The "No-Line" Rule
**1px solid borders are prohibited for sectioning.** Boundaries between content areas must be defined solely through background color shifts or subtle tonal transitions. Use `surface_container_low` (#f6f3f2) for page sections sitting on a `surface` (#fcf9f8) background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create "nested" depth:
*   **Base Layer:** `surface` (#fcf9f8)
*   **Section Layer:** `surface_container_low` (#f6f3f2)
*   **Card/Content Layer:** `surface_container_lowest` (#ffffff)
*   **Interactive Layer (Hover):** `surface_bright`

### Glass & Gradient (The Signature Soul)
To elevate the experience beyond flat design:
*   **Floating Elements:** Use Glassmorphism. Apply `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur for sidebars or floating headers.
*   **Signature CTAs:** Main buttons should use a subtle linear gradient (135°) transitioning from `primary` (#7c5800) to `primary_container` (#c9920a). This adds a "forged gold" metallic depth that feels earned.

---

## 3. Typography: The Editorial Voice

We utilize **Sora** for headers to provide a geometric, modern authority, and **Plus Jakarta Sans** for body text to ensure high-performance legibility during long study sessions.

*   **Display Scale:** Use `display-lg` (3.5rem) for milestone achievements or "Good Morning" greetings. This scale is meant to break the grid and command attention.
*   **Headlines:** `headline-lg` (2rem) and `title-lg` (1.375rem) should always use **Sora Bold (700)** with a tight 1.2 line-height. This creates a "blocky," editorial feel that looks intentional and prestigious.
*   **Body Copy:** Utilize `body-md` (0.875rem) for primary reading. Ensure a generous 1.6 line-height to reduce cognitive load during intense study.
*   **Labels:** Use `label-sm` (0.6875rem) in **Ink-400** for metadata. These should be tracked out slightly (5-10%) to maintain a premium, airy feel.

---

## 4. Elevation & Depth: Tonal Layering

Hierarchy is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background to create a soft, natural lift. This mimics fine stationery layered on a desk.
*   **Ambient Shadows:** For floating action buttons (FABs) or high-priority modals, use "Light-Leaking Shadows." The shadow must be extra-diffused (Blur: 16px+) and low-opacity (4%-8%). Use a tinted version of the **Gold-500** color (#C9920A) for the shadow to mimic natural light reflecting off a gold surface.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use a **Ghost Border**: `outline_variant` (#d4c4ae) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons & Pills
*   **Primary:** 12px radius. Gradient fill (Gold). Shadow Level 3 on hover.
*   **Secondary:** Glassmorphism style. `surface_container_lowest` at 40% opacity with a "Ghost Border."
*   **Action Pills:** 20px radius. Use for tags or status indicators.

### Study Cards
*   **Radii:** Always 16px. 
*   **Constraint:** Forbid the use of divider lines within cards. Use `1.5rem` (Spacing-6) of vertical white space to separate the question from the answer. Use a subtle `Gold-50` background shift for the "active" card in a deck.

### Input Fields
*   **State Styling:** Forgo the traditional bottom line or heavy border. Use a `surface_container_high` fill. On focus, transition the background to `surface_container_lowest` and apply a 2px "Ghost Border" in Gold.

### Knowledge Nodes (Custom Component)
For the AI-generated study paths, use overlapping "Nodes." These are 14px rounded cards that partially overlap each other vertically, using the Layering Principle to show progression without using connecting lines.

---

## 6. Do’s and Don’ts

### Do
*   **Use White Space as Structure:** If a section feels cluttered, add more space (Spacing-10 or Spacing-12) instead of adding a line.
*   **Embrace Asymmetry:** Align headings to the left while keeping CTAs to the far right to create a sophisticated, editorial "zig-zag" flow.
*   **Prioritize Typography:** Let the size and weight of **Sora** do the work of a header, not a background color block.

### Don't
*   **Don't use pure grey shadows:** Always tint your shadows with the brand's Ink or Gold tones.
*   **Don't center-align long-form text:** High-end editorial design is almost always left-aligned for readability and a modern edge.
*   **Don't use 100% opacity for borders:** It breaks the "Scholarly Architect" illusion of layered paper and feels like a generic template.