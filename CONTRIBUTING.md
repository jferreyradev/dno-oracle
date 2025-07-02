# Contributing to DNO-Oracle 🤝

Thank you for your interest in contributing to DNO-Oracle! We welcome contributions from the community.

## 🚀 Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/jferreyradev/dno-oracle.git
   cd dno-oracle
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Oracle database credentials
   ```

3. **Install Oracle Client** (if needed)
   ```bash
   ./scripts/oracle-setup.sh
   ```

4. **Run Tests**
   ```bash
   ./run.sh test
   ```

## 📋 Development Guidelines

### Code Style
- Use consistent indentation (2 spaces)
- Follow TypeScript best practices
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Testing
- Write tests for new features
- Ensure all tests pass before submitting PR
- Include both unit and integration tests
- Test against Oracle 11g+ compatibility

### Documentation
- Update README.md for new features
- Add examples in the `examples/` directory
- Document API changes in `docs/API.md`
- Update CHANGELOG.md

## 🔧 Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Run all tests
   ./run.sh test
   
   # Test API endpoints
   ./run.sh api &
   # Test API calls...
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "✨ Add: description of your feature"
   ```

## 📝 Commit Message Format

Use conventional commits format:
- `✨ Add:` for new features
- `🐛 Fix:` for bug fixes
- `📚 Docs:` for documentation changes
- `🧪 Test:` for adding tests
- `♻️ Refactor:` for code refactoring
- `🔧 Config:` for configuration changes

## 🎯 Areas for Contribution

### High Priority
- 🔒 Enhanced authentication and authorization
- 📊 More database monitoring and metrics
- 🚀 Performance optimizations
- 🧪 Additional test coverage
- 📱 Client SDK/wrapper libraries

### Medium Priority
- 🌍 Internationalization support
- 📋 Database migration tools
- 🔄 Real-time features (WebSockets)
- 📈 Enhanced logging and debugging
- 🛠️ Development tools and utilities

### Documentation
- 📖 Tutorials and guides
- 🎥 Video demonstrations
- 💡 Usage examples
- 🔍 Troubleshooting guides
- 🌐 Multi-language documentation

## 🐛 Reporting Issues

When reporting issues, please include:
- Deno version
- Oracle database version
- Operating system
- Error messages and stack traces
- Steps to reproduce
- Expected vs actual behavior

## 📞 Getting Help

- 📚 Check the [documentation](docs/)
- 🔍 Search existing [issues](https://github.com/jferreyradev/dno-oracle/issues)
- 💬 Open a [discussion](https://github.com/jferreyradev/dno-oracle/discussions)
- 📧 Contact: j.ferreyra.dev@gmail.com

## 📜 License

By contributing to DNO-Oracle, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to DNO-Oracle! 🙏**
