# Contributing to T4U

Thank you for your interest in contributing to T4U! This document provides guidelines and instructions for contributing.

## 🌟 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/t4u-automation/t4u-frontend/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (OS, Node version, browser)

### Suggesting Features

1. Check [Discussions](https://github.com/t4u-automation/t4u-frontend/discussions) for similar ideas
2. Create a new discussion with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Set up your development environment**:
   ```bash
   npm install
   cp .env.example .env.local
   # Add your Firebase credentials to .env.local
   npm run dev
   ```
3. **Make your changes**:
   - Write clear, self-documenting code
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
4. **Test your changes**:
   - Ensure the app builds: `npm run build`
   - Test in development mode: `npm run dev`
   - Check for TypeScript errors: `npm run type-check`
5. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference issues: `Fix #123: Description of fix`
6. **Push and create a PR**:
   - Push to your fork
   - Create a Pull Request with a clear description
   - Link any related issues

## 📝 Code Style

### TypeScript

- Use TypeScript for all new files
- Define interfaces for all data structures
- Avoid `any` types when possible
- Use meaningful variable and function names

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props

### File Structure

```
components/     # Reusable React components
app/           # Next.js app router pages
lib/           # Utility functions and API calls
hooks/         # Custom React hooks
contexts/      # React context providers
types/         # TypeScript type definitions
```

### Naming Conventions

- **Files**: PascalCase for components (`MyComponent.tsx`), camelCase for utilities (`myUtil.ts`)
- **Components**: PascalCase (`MyComponent`)
- **Functions**: camelCase (`handleClick`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`UserData`)

## 🧪 Testing

Currently, we're working on expanding our test coverage. When adding new features:

1. Manually test all user flows
2. Test on different browsers (Chrome, Firefox, Safari)
3. Test responsive design on mobile devices
4. Check console for errors or warnings

## 🎨 UI/UX Guidelines

- Follow the existing design patterns
- Use Tailwind CSS classes
- Respect CSS custom properties (variables)
- Ensure accessibility (ARIA labels, keyboard navigation)
- Test on different screen sizes

## 📦 Dependencies

- Keep dependencies up to date
- Use exact versions in `package.json` when possible
- Document why new dependencies are needed
- Prefer lightweight libraries

## 🔒 Security

- Never commit API keys, secrets, or credentials
- Use environment variables for sensitive data
- Follow Firebase security best practices
- Report security issues privately to the maintainers

## 📚 Documentation

- Update README.md for user-facing changes
- Update T4U_ARCHITECTURE.md for architectural changes
- Add JSDoc comments for complex functions
- Include examples in documentation

## 🚀 Release Process

1. Version bump in `package.json`
2. Update CHANGELOG.md
3. Create a new release tag
4. Deploy to production

## 💬 Communication

- Be respectful and constructive
- Ask questions if you're unsure
- Help others in discussions
- Celebrate contributions

## ✅ Checklist

Before submitting a PR, ensure:

- [ ] Code follows the style guidelines
- [ ] No TypeScript errors
- [ ] App builds successfully
- [ ] Changes are tested
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] PR description is detailed

## 🙏 Thank You!

Your contributions make T4U better for everyone. We appreciate your time and effort!

---

For questions, reach out in [Discussions](https://github.com/t4u-automation/t4u-frontend/discussions) or open an issue.

