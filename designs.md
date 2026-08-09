# Blog UI Design System

## Scope

This document records the visual contract for the public blog routes. It is kept with the
source code so future changes can be reviewed alongside implementation. It is not a
cross-project memory.

## Foundation

- Theme: dark by default, aligned with the `imber-frontend` product palette; light mode
  remains available.
- Font stack: `Geist`, `Inter`, system sans-serif.
- Content width: 1280px maximum; reading views may use a narrower content column.
- Density: compact, with a 4px spacing unit.

## Tokens

| Token                 | Dark value | Use                                |
| --------------------- | ---------- | ---------------------------------- |
| `--color-canvas`      | `#101211`  | Page background                    |
| `--color-paper`       | `#191c1a`  | Raised surfaces and navigation     |
| `--color-surface-alt` | `#222623`  | Quiet secondary surface            |
| `--color-ink`         | `#f4f6f3`  | Primary text and icon stroke       |
| `--color-mid-gray`    | `#aeb6b0`  | Supporting text and labels         |
| `--color-hairline`    | `#343a36`  | Borders and separators             |
| `--accent-mint`       | `#71e6bd`  | Primary actions and active states  |
| `--accent-warm`       | `#ff9f76`  | Small secondary interaction accent |

## Component Rules

- Use the local shadcn/ui `Button` for commands and icon actions.
- Primary buttons use mint with a high-contrast dark label; secondary buttons use the
  alternate surface; outline buttons use a hairline boundary.
- Surfaces have a 1px hairline border, an 8px maximum radius, and only a quiet shadow.
- Do not introduce decorative gradients, redundant information bands, or saturated
  status-like accents. Content imagery must remain useful to the page.
- Desktop navigation is text-first; mobile navigation is an opaque full-screen layer that
  never exposes the underlying page.
- Keep body text at 14px, supporting labels at 12px, and display headings between 36px and
  48px.
- Motion is entrance-only: short line expansion, low-amplitude vertical reveal, and subtle
  media scale. Do not add perpetual decorative animation.

## Acceptance Checklist

- Verify the home page at desktop and mobile widths after a production build.
- Confirm navigation, primary calls to action, the theme toggle, and mobile menu are
  reachable and do not overlap.
- Check that text wraps without clipping and the next content band remains visible after
  the initial hero on common viewport heights.
