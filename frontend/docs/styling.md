# Styling and Themes

- Use only the colors and fonts defined in `src/AMAZI_THEME_GENERATED.css`.
- Do not add, remove, or rename variables in `src/AMAZI_THEME_GENERATED.css`; only their values may be changed.
- Apply theme colors and fonts through the semantic Tailwind utilities configured in that file.
- Use the existing theme provider for a preferred light, dark, or system theme. Both project
  palettes remain available in the generated theme file regardless of that preference. The theme
  toggle remains available so visitors can override the preferred theme on their device.
- Do not manage `data-theme` directly from pages or components.
- Keep component styling in Tailwind utility classes.
- Do not hardcode color or font values in components or page styles.
- Reuse the styled primitives in `src/components/ui` before introducing page-specific controls.

## Visual system

- Use `page` for the canvas, `panel` for primary surfaces, and a low-opacity `muted-ui` for inset or secondary regions.
- Prefer subtle borders and restrained shadows over stacking multiple fully outlined containers.
- Keep interactive controls at least 2.75rem tall and use the shared focus treatment from the existing primitives.
- Use a consistent radius hierarchy: `rounded-xl` for controls, `rounded-2xl` for inset groups, and `rounded-3xl` for major cards and overlays.
- Use the segmented `Tabs` style for peer views. Reserve underlines for navigation that truly belongs to the page header.
- Preserve comfortable responsive spacing. Start with compact mobile padding and increase it at `sm` and `lg` breakpoints.
- Keep structural navigation visually separate from the viewport edges. The default `Shell` uses floating, translucent surfaces so product content remains the primary visual layer.
