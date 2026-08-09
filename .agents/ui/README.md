# UI Reference Notes

## Sources reviewed

- Refero Styles (`https://styles.refero.design/`): generous whitespace, editorial display
  type, quiet borders, and controls without decorative containers.
- Local `imber-frontend`: deep green-black canvas, layered green surfaces, mint primary
  interaction, and warm secondary hover accents.
- GSAP project dependency: reserve motion for entrance or state transitions that improve
  hierarchy; avoid perpetual or ornamental animation.

## Blog rules

- A page should have one clear visual focus. Do not add a second information band when it
  does not change navigation or content discovery.
- Desktop navigation is text-first. Use a hover state rather than a permanent pill
  container.
- A mobile menu is an opaque, isolated screen. It must completely cover underlying page
  content while open.
- Motion should be short and functional: opacity and small vertical movement for menu
  entry; respect reduced-motion preferences when adding future GSAP timelines.
- Keep mint for primary interaction and warm for small hover details. Do not spread either
  accent across large backgrounds.
