# Contributing to the Project

Thanks for taking the time to contribute. This project thrives on community involvement, and we appreciate your help in making it better.

## Table of Contents

- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Plugin Development](#plugin-development)
- [Documentation](#documentation)
- [Changelog Policy](#changelog-policy)

## Development Setup

To get started with development, ensure you have the following installed:

- **Bun**: >=1.x (Primary runtime and package manager)
- **Node.js**: >=20 (Optional, for specific tool compatibility)
- **Docker**: Optional, for containerized testing

### Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run the development server or tests:
   ```bash
   bun run dev
   bun test
   ```

## Branching Strategy

We use specific prefixes for branch names to keep the repository organized. Use the following naming convention:

- `feature/`: New features or enhancements
- `fix/`: Bug fixes
- `refactor/`: Code restructuring without changing behavior
- `docs/`: Documentation updates
- `test/`: Adding or updating tests

Example: `feature/add-plugin-loader`

## Commit Message Guidelines

We follow the Conventional Commits specification. This helps in generating automated changelogs and understanding the project history.

| Type | Description |
| :--- | :--- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that don't affect code meaning (white-space, formatting, etc) |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A code change that improves performance |
| `test` | Adding missing tests or correcting existing tests |
| `chore` | Changes to the build process or auxiliary tools and libraries |

Example: `feat(api): add new authentication endpoint`

## Pull Request Process

1. Create a new branch from `main`.
2. Make your changes, ensuring they follow the project's coding style.
3. Add or update tests as necessary.
4. Ensure all tests pass (`bun test`).
5. Open a Pull Request with a clear description of the changes.
6. A maintainer will review your PR and provide feedback.
7. Once approved, your PR will be merged.

## Plugin Development

If you're building a plugin, follow these steps:

1. Look at existing plugins in the `plugins/` directory for reference.
2. Implement the required interface for your plugin type.
3. Ensure your plugin includes unit tests.
4. Document any configuration options your plugin introduces.
5. Use `bun run build` to verify the plugin compiles correctly.

## Documentation

Documentation is built using Docusaurus. If you're contributing to the docs:

1. Navigate to the documentation directory (if separate) or the root.
2. Start the development server:
   ```bash
   bun run docs:dev
   ```
3. Preview your changes at `http://localhost:3000`.
4. Submit your changes as a PR with the `docs/` prefix.

## Changelog Policy

The changelog is automatically updated based on commit messages. Ensure your commit messages accurately reflect the work done.

- Only `feat` and `fix` commits will appear in the user-facing changelog by default.
- Breaking changes must be marked with a `!` after the type (e.g., `feat!: remove deprecated api`) and include a `BREAKING CHANGE:` footer.
- Avoid using "slop" or filler words in commit messages. Keep them concise and descriptive.

---

By contributing to this project, you agree that your contributions will be licensed under the GNU General Public License v3.0.
