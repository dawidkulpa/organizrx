# Frontend Conventions

## React & Routing
- **Functional Components:** Use functional components and hooks for all state and effects.
- **Routing:** Use React Router v7.
- **Routes:** `/login`, `/` (dashboard), `/settings/*`, `/tabs`, `/users`, `/wizard`.

## Data Fetching & API
- **API Client:** Use an Axios-based client that automatically injects the auth header.
- **Handling:** Always use `async/await` and provide proper error handling for every API call.

## State Management
- **Global:** Use Zustand for global state management (e.g., authentication, theme, and global UI).
- **Local:** Use React's built-in state for component-local state.
- **Auth State:** Store auth state in the Zustand store. Keep tokens in memory; do not store them in `localStorage` to prevent XSS. Refresh tokens via the API.

## Form Handling
- Use controlled components for all forms.
- **Validation:** Use Zod schemas from `@organizrx/shared` for all frontend form validation.

## Styling (Tailwind CSS v4)
- **Config:** Use CSS-first configuration. Use `@import 'tailwindcss'`, `@theme {}` in your CSS, and the `@tailwindcss/vite` plugin.
- **Dark Mode:** Implement dark mode using the class strategy.
- **Accessibility:** Ensure semantic HTML, proper ARIA labels on all interactive elements, and full keyboard navigation support.

## Component Structure
- Co-locate components with their styles and tests in the same directory.
- Test files must follow the `*.spec.tsx` naming convention.

## Prohibited Patterns (Do Not)
- No jQuery or direct DOM manipulation.
- No inline styles for layout: Use Tailwind utility classes.
- No class components: Use hooks exclusively.
- No `any` types: Use the shared types from `@organizrx/shared`.
- No storage of tokens in `localStorage`.
- No untyped props.
