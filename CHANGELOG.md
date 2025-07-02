# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 🖥️ **Multiplataform Scripts** - Separate Windows (.ps1) and Linux (.sh) scripts
- 📁 **Organized Structure** - `scripts/windows/`, `scripts/linux/`, `scripts/common/`
- ✅ **Structure Verification** - Script to verify installation and setup
- 📝 **Enhanced Documentation** - Detailed contribution guidelines and improvement management
- 🔧 **SQL Executor Fix** - Corrected import paths for reorganized structure
- 🌐 **Contribution Workflow** - Complete guide for managing improvements and merges

### Changed
- 🔄 **Script Organization** - Moved platform-specific scripts to dedicated folders
- 📍 **Import Paths** - Updated JavaScript import paths for new structure
- 📖 **README Updates** - Enhanced with contribution guidelines and contact info
- 🗂️ **Project Structure** - Better organization for maintainability

### Fixed
- 🐛 **Import Path Errors** - Fixed module import paths in sql-executor.js and test files
- 📋 **Roadmap Consistency** - Removed duplicate items from project roadmap
- 🔗 **Script References** - Updated all script references to use new folder structure

## [1.0.0] - 2024-07-02

### Added
- ✨ **Initial Release** - Professional Deno + Oracle Database API
- 🔗 **Oracle Connection Module** with connection pooling
- 🌐 **Complete REST API** with TypeScript controllers
- 📊 **CRUD Operations** for users and logs tables
- 🔧 **SQL Script Executor** with Oracle compatibility
- 🧪 **Comprehensive Testing Suite** with multiple test scenarios
- 📚 **Professional Documentation** with installation guides
- 🛠️ **Setup Scripts** for Oracle Client installation
- 🔍 **Health Check Endpoints** for monitoring
- 🛡️ **Error Handling** and logging middleware
- 🌍 **CORS Support** for web applications
- 🔐 **Authentication Middleware** (ready for implementation)
- 📦 **Connection Pooling** with automatic management
- 🏗️ **Oracle 11g/12c Compatibility** with sequences and triggers
- 💾 **Stored Procedures Support** with IN/OUT parameters
- 🔄 **Transaction Management** with rollback capabilities
- 📖 **Postman Collection** for API testing
- 🎯 **Type Definitions** with comprehensive TypeScript support

### Features
- **Database Layer**: Robust Oracle connection with pooling
- **API Server**: Complete REST API with all CRUD operations
- **SQL Executor**: Execute SQL scripts directly from command line
- **Testing**: Comprehensive test suite for all components
- **Documentation**: Complete guides for installation and usage
- **Examples**: Multiple usage examples and demos
- **Scripts**: Automated setup and testing scripts
- **Middleware**: CORS, authentication, error handling, and logging

### Technical Specifications
- **Runtime**: Deno 1.40+
- **Database**: Oracle 11g/12c/19c/21c
- **Language**: JavaScript/TypeScript
- **API**: REST with JSON responses
- **Architecture**: Modular design with separation of concerns
- **Testing**: Unit and integration tests included
- **Documentation**: Markdown with examples and guides
