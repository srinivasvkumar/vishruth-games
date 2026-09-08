# Contributing to Cluster Rush

We welcome contributions to Cluster Rush! Here's how to get started.

## Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

## Code Standards

### TypeScript
- Use strict TypeScript configuration
- Add types for all function parameters and returns
- Use interfaces for complex objects
- Avoid `any` type - use `unknown` if needed

### Code Style
- 2-space indentation
- Single quotes for strings
- Semicolons at end of statements
- Trailing commas in multi-line objects/arrays
- CamelCase for variables and functions
- PascalCase for classes and interfaces

### Documentation
- Document public APIs with JSDoc comments
- Update README.md for significant changes
- Add comments for complex algorithms
- Keep documentation in sync with code

## Testing Requirements

### Unit Tests
- Test all public methods
- Mock dependencies appropriately
- Test edge cases and error conditions
- Aim for >80% code coverage

### Integration Tests
- Test interactions between components
- Test game systems working together
- Use realistic test data

### E2E Tests
- Test complete user workflows
- Verify game loads and runs
- Test input and UI interactions

## Pull Request Checklist

- [ ] Code follows project standards
- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] Changes are focused and minimal
- [ ] No breaking changes without discussion

## Issue Reporting
- Use the issue template
- Include steps to reproduce
- Add screenshots if relevant
- Specify browser/OS version
- Include error messages

Thank you for contributing! 🎮
