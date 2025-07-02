# Guía de Contribución - DNO-Oracle 🤝

¡Gracias por tu interés en contribuir a DNO-Oracle! Esta guía te ayudará a entender cómo puedes participar en el desarrollo del proyecto.

## 🎯 Tipos de Contribuciones

### 🔧 Código
- Nuevas funcionalidades
- Corrección de bugs
- Optimizaciones de performance
- Mejoras en la arquitectura

### 📚 Documentación
- Mejoras en README
- Ejemplos de código
- Tutoriales
- Documentación de API

### 🧪 Testing
- Casos de prueba adicionales
- Tests de integración
- Benchmarks
- Tests para diferentes entornos

## 🚀 Comenzando

### Configuración del Entorno de Desarrollo

1. **Fork y Clone**
   ```bash
   # Fork en GitHub, luego:
   git clone https://github.com/tu-usuario/dno-oracle.git
   cd dno-oracle
   git remote add upstream https://github.com/jferreyra-dev/dno-oracle.git
   ```

2. **Configurar Entorno**
   ```bash
   # Configurar variables de entorno
   cp .env.example .env
   # Editar .env con tus datos de Oracle
   
   # Instalar y verificar
   ./run.sh install
   ./run.sh diagnose
   ```

## 🛠️ Proceso de Desarrollo

### 1. Crear Rama de Desarrollo

```bash
# Sincronizar con upstream
git checkout main
git pull upstream main

# Crear rama para tu feature
git checkout -b feature/nombre-descriptivo
# Para bugs: git checkout -b fix/descripcion-del-bug
# Para docs: git checkout -b docs/mejora-documentacion
```

### 2. Desarrollar y Probar

```bash
# Desarrollar tu funcionalidad
# Ejecutar pruebas
./run.sh test
./run.sh test:advanced

# Verificar formato
deno fmt --check
deno lint
```

### 3. Commit y Push

```bash
# Commit con mensaje descriptivo
git commit -m "feat: agregar soporte para [funcionalidad]"
git push origin feature/nombre-descriptivo
```

### 4. Crear Pull Request

- Describe claramente los cambios
- Incluye tests si es aplicable
- Referencia issues relacionados
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
