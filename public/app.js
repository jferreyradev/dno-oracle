/**
 * DNO-Oracle Web Interface
 * Sistema de gestión de datos Oracle con interfaz web moderna
 */

class DNOOracle {
    constructor() {
        this.serverUrl = 'http://localhost:8000';
        this.currentFile = null;
        this.currentHeaders = [];
        this.currentMapping = [];
        this.tables = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.setupFileUpload();
        this.checkServerConnection();
        this.loadTables();
    }

    // Event Listeners
    setupEventListeners() {
        // Header buttons
        document.getElementById('health-check-btn').addEventListener('click', () => this.checkHealth());
        document.getElementById('api-info-btn').addEventListener('click', () => this.showApiInfo());
        
        // Import tab
        document.getElementById('auto-map-btn').addEventListener('click', () => this.autoMapColumns());
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        document.getElementById('preview-btn').addEventListener('click', () => this.previewData());
        document.getElementById('validate-btn').addEventListener('click', () => this.validateData());
        document.getElementById('remove-file-btn').addEventListener('click', () => this.removeFile());
        
        // Tables tab
        document.getElementById('refresh-tables-btn').addEventListener('click', () => this.loadTables());
        document.getElementById('table-search').addEventListener('input', (e) => this.filterTables(e.target.value));
        
        // Queries tab
        document.getElementById('execute-query-btn').addEventListener('click', () => this.executeQuery());
        document.getElementById('explain-query-btn').addEventListener('click', () => this.explainQuery());
        document.getElementById('validate-query-btn').addEventListener('click', () => this.validateQuery());
        
        // Procedures tab
        document.getElementById('execute-procedure-btn').addEventListener('click', () => this.executeProcedure());
        document.getElementById('get-procedure-info-btn').addEventListener('click', () => this.getProcedureInfo());
    }

    setupTabs() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        // Click to select file
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
    }

    // File Handling
    handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showToast('Error', 'Solo se permiten archivos CSV', 'error');
            return;
        }
        
        this.currentFile = file;
        this.showFileInfo(file);
        this.parseHeaders(file);
    }

    showFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = fileInfo.querySelector('.file-name');
        const fileSize = fileInfo.querySelector('.file-size');
        
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        
        document.getElementById('upload-area').style.display = 'none';
        fileInfo.style.display = 'flex';
        document.getElementById('config-section').style.display = 'block';
    }

    removeFile() {
        this.currentFile = null;
        this.currentHeaders = [];
        this.currentMapping = [];
        
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('config-section').style.display = 'none';
        document.getElementById('mapping-section').style.display = 'none';
        document.getElementById('import-actions').style.display = 'none';
        document.getElementById('results-card').style.display = 'none';
        document.getElementById('file-input').value = '';
    }

    async parseHeaders(file) {
        try {
            this.showLoading(true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.serverUrl}/api/import/headers`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentHeaders = result.data.headers;
                this.showMappingSection();
                this.showToast('Éxito', 'Headers parseados correctamente', 'success');
            } else {
                this.showToast('Error', result.error || 'Error parseando headers', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showMappingSection() {
        const mappingSection = document.getElementById('mapping-section');
        const mappingContainer = document.getElementById('mapping-container');
        
        mappingContainer.innerHTML = '';
        
        this.currentHeaders.forEach((header, index) => {
            const row = document.createElement('div');
            row.className = 'mapping-row';
            row.innerHTML = `
                <select class="form-control" data-index="${index}">
                    <option value="">Seleccionar columna destino...</option>
                </select>
                <div class="mapping-arrow">→</div>
                <div class="mapping-source">${header}</div>
            `;
            mappingContainer.appendChild(row);
        });
        
        mappingSection.style.display = 'block';
        document.getElementById('import-actions').style.display = 'block';
    }

    async autoMapColumns() {
        const tableName = document.getElementById('table-select').value;
        if (!tableName) {
            this.showToast('Error', 'Selecciona una tabla primero', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('tableName', tableName);
            
            const response = await fetch(`${this.serverUrl}/api/import/mapping`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentMapping = result.data.mapping;
                this.updateMappingUI();
                this.showToast('Éxito', 'Mapeo automático completado', 'success');
            } else {
                this.showToast('Error', result.error || 'Error generando mapeo', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateMappingUI() {
        const selects = document.querySelectorAll('.mapping-row select');
        selects.forEach((select, index) => {
            if (this.currentMapping[index]) {
                select.value = this.currentMapping[index].tableColumn;
            }
        });
    }

    // Import Operations
    async importData() {
        const tableName = document.getElementById('table-select').value;
        if (!tableName || !this.currentFile) {
            this.showToast('Error', 'Selecciona una tabla y archivo', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('tableName', tableName);
            formData.append('skipFirstRow', document.getElementById('skip-first-row').checked);
            formData.append('validateOnly', document.getElementById('validate-only').checked);
            formData.append('truncateTable', document.getElementById('truncate-table').checked);
            formData.append('batchSize', document.getElementById('batch-size').value);
            
            // Add mapping
            const mapping = this.getCurrentMapping();
            formData.append('mapping', JSON.stringify(mapping));
            
            const response = await fetch(`${this.serverUrl}/api/import/csv`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showResults(result.data);
                this.showToast('Éxito', 'Datos importados correctamente', 'success');
            } else {
                this.showToast('Error', result.error || 'Error importando datos', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async validateData() {
        const tableName = document.getElementById('table-select').value;
        if (!tableName || !this.currentFile) {
            this.showToast('Error', 'Selecciona una tabla y archivo', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('tableName', tableName);
            formData.append('skipFirstRow', document.getElementById('skip-first-row').checked);
            
            const response = await fetch(`${this.serverUrl}/api/import/validate`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showResults(result.data);
                this.showToast('Éxito', 'Validación completada', 'success');
            } else {
                this.showToast('Error', result.error || 'Error validando datos', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getCurrentMapping() {
        const selects = document.querySelectorAll('.mapping-row select');
        const mapping = [];
        
        selects.forEach((select, index) => {
            if (select.value) {
                mapping.push({
                    fileColumn: this.currentHeaders[index],
                    tableColumn: select.value
                });
            }
        });
        
        return mapping;
    }

    // Tables Management
    async loadTables() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/info`);
            const result = await response.json();
            
            if (result.success) {
                this.tables = result.data.entities || [];
                this.updateTablesUI();
                this.updateTableSelect();
                this.showToast('Éxito', 'Tablas cargadas correctamente', 'success');
            } else {
                this.showToast('Error', 'Error cargando tablas', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateTablesUI() {
        const grid = document.getElementById('tables-grid');
        grid.innerHTML = '';
        
        this.tables.forEach(table => {
            const card = document.createElement('div');
            card.className = 'table-card';
            const tableName = table.tableName || table.name;
            const displayName = table.displayName || table.name;
            
            card.innerHTML = `
                <div class="table-name">${displayName}</div>
                <div class="table-info">
                    Entidad: ${table.name}<br>
                    Tabla: ${tableName}<br>
                    Endpoints: ${table.endpoints ? table.endpoints.length : 0}
                    ${table.description ? `<br>Descripción: ${table.description}` : ''}
                </div>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline" onclick="app.viewTableData('${tableName}')">
                        <span class="btn-icon">👁️</span>
                        Ver Datos
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.getTableColumns('${tableName}')">
                        <span class="btn-icon">🔍</span>
                        Columnas
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    updateTableSelect() {
        const select = document.getElementById('table-select');
        select.innerHTML = '<option value="">Selecciona una tabla...</option>';
        
        this.tables.forEach(table => {
            const option = document.createElement('option');
            const tableName = table.tableName || table.name;
            const displayName = table.displayName || table.name;
            option.value = tableName;
            option.textContent = `${displayName} (${tableName})`;
            select.appendChild(option);
        });
    }

    filterTables(query) {
        const cards = document.querySelectorAll('.table-card');
        cards.forEach(card => {
            const name = card.querySelector('.table-name').textContent.toLowerCase();
            const visible = name.includes(query.toLowerCase());
            card.style.display = visible ? 'block' : 'none';
        });
    }

    async getTableColumns(tableName) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/import/columns/${tableName}`);
            const result = await response.json();
            
            if (result.success) {
                this.showResults(result.data);
                this.showToast('Éxito', 'Columnas obtenidas correctamente', 'success');
            } else {
                this.showToast('Error', result.error || 'Error obteniendo columnas', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async viewTableData(tableName) {
        if (!tableName || tableName === 'undefined') {
            this.showToast('Error', 'Nombre de tabla inválido', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            // Encontrar la entidad que corresponde a esta tabla
            const entity = this.tables.find(t => (t.tableName || t.name) === tableName);
            const entityName = entity ? entity.name : tableName;
            
            const response = await fetch(`${this.serverUrl}/api/${entityName}?limit=10`);
            const result = await response.json();
            
            if (result.success) {
                // Los datos están en result.data.data debido a la estructura de paginación
                const tableData = result.data.data || result.data;
                this.showResults(tableData);
                this.showToast('Éxito', `Datos de ${tableName} obtenidos correctamente (${tableData.length} registros)`, 'success');
            } else {
                this.showToast('Error', result.message || 'Error obteniendo datos', 'error');
            }
        } catch (_error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Query Operations
    async executeQuery() {
        const sql = document.getElementById('sql-editor').value.trim();
        if (!sql) {
            this.showToast('Error', 'Ingresa una consulta SQL', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sql })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showQueryResults(result.data);
                this.showToast('Éxito', 'Consulta ejecutada correctamente', 'success');
            } else {
                this.showToast('Error', result.error || 'Error ejecutando consulta', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async explainQuery() {
        const sql = document.getElementById('sql-editor').value.trim();
        if (!sql) {
            this.showToast('Error', 'Ingresa una consulta SQL', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/query/explain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sql })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showQueryResults(result.data);
                this.showToast('Éxito', 'Plan de ejecución obtenido', 'success');
            } else {
                this.showToast('Error', result.error || 'Error obteniendo plan', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async validateQuery() {
        const sql = document.getElementById('sql-editor').value.trim();
        if (!sql) {
            this.showToast('Error', 'Ingresa una consulta SQL', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/query/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sql })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showQueryResults(result.data);
                this.showToast('Éxito', 'Consulta validada correctamente', 'success');
            } else {
                this.showToast('Error', result.error || 'Error validando consulta', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Procedures
    async executeProcedure() {
        const procedureName = document.getElementById('procedure-name').value.trim();
        if (!procedureName) {
            this.showToast('Error', 'Ingresa el nombre del procedimiento', 'error');
            return;
        }
        
        let params = {};
        const paramsText = document.getElementById('procedure-params').value.trim();
        
        if (paramsText) {
            try {
                params = JSON.parse(paramsText);
            } catch (error) {
                this.showToast('Error', 'Formato JSON inválido en parámetros', 'error');
                return;
            }
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/procedures/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ procedureName, params })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showProcedureResults(result.data);
                this.showToast('Éxito', 'Procedimiento ejecutado correctamente', 'success');
            } else {
                this.showToast('Error', result.error || 'Error ejecutando procedimiento', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async getProcedureInfo() {
        const procedureName = document.getElementById('procedure-name').value.trim();
        if (!procedureName) {
            this.showToast('Error', 'Ingresa el nombre del procedimiento', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/procedures/info/${procedureName}`);
            const result = await response.json();
            
            if (result.success) {
                this.showProcedureResults(result.data);
                this.showToast('Éxito', 'Información del procedimiento obtenida', 'success');
            } else {
                this.showToast('Error', result.error || 'Error obteniendo información', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // UI Helpers
    showResults(data) {
        const resultsCard = document.getElementById('results-card');
        const resultsContent = document.getElementById('results-content');
        
        if (Array.isArray(data)) {
            resultsContent.innerHTML = this.createDataTable(data);
        } else {
            resultsContent.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
        
        resultsCard.style.display = 'block';
    }

    showQueryResults(data) {
        const resultsContainer = document.getElementById('query-results');
        
        if (Array.isArray(data)) {
            resultsContainer.innerHTML = this.createDataTable(data);
        } else {
            resultsContainer.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    }

    showProcedureResults(data) {
        const resultsContainer = document.getElementById('procedure-results');
        
        if (Array.isArray(data)) {
            resultsContainer.innerHTML = this.createDataTable(data);
        } else {
            resultsContainer.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    }

    createDataTable(data) {
        if (!data || data.length === 0) {
            return '<p>No hay datos para mostrar</p>';
        }
        
        const headers = Object.keys(data[0]);
        let html = '<table class="data-table"><thead><tr>';
        
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        
        html += '</tr></thead><tbody>';
        
        data.forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                const value = row[header];
                html += `<td>${value !== null && value !== undefined ? value : ''}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        return html;
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.toggle('show', show);
    }

    showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/health`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.status === 'ok') {
                document.getElementById('connection-status').textContent = 'Conectado';
                document.getElementById('connection-status').className = 'status-value text-success';
            } else {
                throw new Error('Server not healthy');
            }
        } catch (error) {
            console.error('Error checking server connection:', error);
            document.getElementById('connection-status').textContent = 'Desconectado';
            document.getElementById('connection-status').className = 'status-value text-error';
        }
    }

    async checkHealth() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/health`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.status === 'ok') {
                this.showToast('Éxito', 'Servidor funcionando correctamente', 'success');
            } else {
                this.showToast('Warning', 'Servidor responde pero puede tener problemas', 'warning');
            }
        } catch (_error) {
            this.showToast('Error', 'No se pudo conectar al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async showApiInfo() {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/info`);
            const result = await response.json();
            
            if (result.success) {
                this.showResults(result.data);
                this.showToast('Éxito', 'Información de API obtenida', 'success');
            } else {
                this.showToast('Error', 'Error obteniendo información de API', 'error');
            }
        } catch (_error) {
            this.showToast('Error', 'Error de conexión al servidor', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize the application
const app = new DNOOracle();

// Make app globally available for onclick handlers
globalThis.app = app;
