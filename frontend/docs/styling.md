# Styling and Themes

- Use only the colors and fonts defined in `src/AMAZI_THEME_GENERATED.css`.
- Do not add, remove, or rename variables in `src/AMAZI_THEME_GENERATED.css`; only their values may be changed.
- Apply theme colors and fonts through the semantic Tailwind utilities configured in that file.
- Use the existing theme provider for fixed light, fixed dark, or switchable light and dark mode.
- Do not manage `data-theme` directly from pages or components.
- Keep component styling in Tailwind utility classes.
- Do not hardcode color or font values in components or page styles.
- Treat the unstyled primitives in `src/components/ui` as semantic starting points and style them only when the requested interface uses them.
