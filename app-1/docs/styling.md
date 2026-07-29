# Styling and themes

- Use only the colors and fonts defined in `src/index.css`.
- Keep the single light palette fixed; do not add theme selectors, theme providers, or theme toggles.
- Apply the palette through the semantic Tailwind utilities configured in `src/index.css`.
- Do not manage `data-theme` from pages or components.
- Keep component styling in Tailwind utility classes.
- Do not hardcode color or font values in components or page styles.
- Reuse the product primitives in `src/components/ui` before introducing page-specific controls.

## Visual system

- Use `page` for the canvas, `panel` for primary surfaces, and a low-opacity `muted-ui` for inset or secondary regions.
- Prefer subtle borders and restrained shadows over stacking multiple fully outlined containers.
- Keep interactive controls at least 2.75rem tall and use the shared focus treatment from the existing primitives.
- Use a consistent radius hierarchy: `rounded-xl` for controls, `rounded-2xl` for inset groups, and `rounded-3xl` for major cards and overlays.
- Preserve comfortable responsive spacing. Start with compact mobile padding and increase it at `sm` and `lg` breakpoints.
- Keep structural navigation visually separate from the viewport edges so product content remains the primary visual layer.
