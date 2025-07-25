# Coding Rules

These rules supplement the information in `AGENTS.md` and apply to all contributions.

1. Use **TypeScript** for all new code.
2. Indent with **2 spaces**; avoid tabs.
3. Keep imports ordered: external modules first, then internal paths.
4. Run `pnpm lint` before committing.
5. Group related changes in a single commit with a descriptive message.
6. Ensure the app builds with `pnpm build` before opening a PR.
7. Verify new dependencies with `pnpm info` and `pnpm audit` before adding them.

## File structure

- Organize route folders under `app/<segment>` with a `page.tsx` and optional `layout.tsx`.
- Keep shared building blocks in `components/shared`.
- Group feature components under `components/<feature>`. For multi-file features, create:

  ```
  components/<feature>/<ComponentName>/
    index.tsx
  ```

- Re-export components from `components/<feature>/index.ts` for concise import paths.
- Store helper functions in `utils/` and shared types in `types/`.

## Styling

- **Use Chakra UI components and styling system** for all UI elements. Chakra UI is the primary styling framework for this project.
- Apply styling via Chakra UI props (e.g., `bg`, `color`, `p`, `m`, `w`, `h`) directly to components for consistency.
- **Never hardcode colors.** Always use values from the Chakra theme (e.g., `color="primary.500"` or `bg="background"`). Define and reference all colors in the `themes/` directory.
- Leverage Chakra UI's theme system for colors, fonts, and spacing.
- **Avoid custom CSS files** whenever possible. Chakra UI's styling props should cover the vast majority of styling needs.

### Chakra UI vs Tailwind CSS

- **Chakra UI is the primary styling system** — use Chakra components (`Box`, `Text`, `Button`, etc.) and their styling props.
- **Tailwind CSS provides basic utilities** — only use for simple utilities that Chakra doesn't provide or for third-party component integration.
- **When in doubt, use Chakra UI** — it integrates with the theme system and provides consistent component behavior.

## Global CSS usage

- `app/globals.css` should primarily contain Tailwind imports for basic utilities and minimal global overrides.
- Use `globals.css` only for extreme cases like:

  - Third-party component styling that cannot be controlled via props (e.g., Aioha modal customization)
  - Global resets or animations that require global scope
  - Scrollbar hiding and other browser-specific styles

## Conventions

- Use 2-space indentation and keep TypeScript `strict` mode on.
- UI components use Chakra UI; prefer existing patterns from `components/`.
- Avoid inline or hardcoded styles for colors or spacing — always use theme tokens.
- When adding new packages, update `pnpm-lock.yaml` via pnpm.
- Commit clean code and ensure the project still builds with `pnpm build`.

## Best practices

- Keep files small and focused; prefer multiple short modules over a single large file.
- Limit line length to around 100 characters for readability.
- Write clear comments for complex logic and keep stateful code in hooks or contexts.
- Ensure visual consistency across the app by **always using theme-based tokens for colors, spacing, and fonts**.

## Next.js patterns

- Default to server components. Add `"use client"` at the top of a file only when browser APIs or React state are required.
- Export `metadata` from each `page.tsx` to manage SEO tags and sharing cards.
- Keep route directories under `app/` with their own `page.tsx` and optional `layout.tsx` for nested layouts.
- Place API handlers in `app/api/<route>/route.ts`.
- Use `next/dynamic` to lazily load heavy client components.

## React patterns

- Use functional components with typed props.
- Extract reusable logic into hooks under `hooks/` and prefix them with `use`.
- Store cross-cutting state in context providers under `contexts/`.
- Name components with `PascalCase`; name hooks in `camelCase` with a `use` prefix.
- Clean up side effects in the return function of `useEffect`.

## Commit and testing

- Always run `pnpm lint` and `pnpm build` before committing changes.
- Use descriptive commit messages so history is easy to follow.

## AI tools

- **Cursor, Copilot, Claude** or other agents should follow these guidelines.
- Provide clear commit messages and keep related changes in a single commit.
- Run lint before committing.
- **Do not hardcode any color values. Always reference the theme colors using Chakra’s `colorScheme` or token keys.**
