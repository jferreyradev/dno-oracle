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
        this.connections = [];
        this.currentConnection = null; // Conexión seleccionada
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.setupFileUpload();
        this.checkServerConnection();
        this.loadConnections();
        this.loadTables();
        this.loadEntities();
    }

    // Event Listeners
    setupEventListeners() {
        // Header buttons
        document.getElementById('health-check-btn').addEventListener('click', () => this.checkHealth());
        document.getElementById('api-info-btn').addEventListener('click', () => this.showApiInfo());
        
        // Connection selector
        document.getElementById('connection-select').addEventListener('change', (e) => this.changeConnection(e.target.value));
        document.getElementById('refresh-connections-btn').addEventListener('click', () => this.loadConnections());
        
        // Import tab
        document.getElementById('auto-map-btn').addEventListener('click', () => this.autoMapColumns());
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        document.getElementById('preview-btn').addEventListener('click', () => this.previewData());
        document.getElementById('validate-btn').addEventListener('click', () => this.validateData());
        document.getElementById('remove-file-btn').addEventListener('click', () => this.removeFile());
        
        // Tables tab
        document.getElementById('refresh-tables-btn').addEventListener('click', () => this.loadTables());
        document.getElementById('table-search').addEventListener('input', (e) => this.filterTables(e.target.value));
        document.getElementById('close-table-details-btn').addEventListener('click', () => this.closeTableDetails());
        
        // Entities tab
        document.getElementById('create-entity-btn').addEventListener('click', () => this.showEntityEditor());
        document.getElementById('generate-entity-btn').addEventListener('click', () => this.showEntityGenerator());
        document.getElementById('save-entity-btn').addEventListener('click', () => this.saveEntity());
        document.getElementById('cancel-entity-btn').addEventListener('click', () => this.hideEntityEditor());
        document.getElementById('validate-entity-btn').addEventListener('click', () => this.validateEntityJSON());
        
        // Entity Generator tab
        document.getElementById('generate-entity-action-btn').addEventListener('click', () => this.generateEntityFromTable());
        document.getElementById('cancel-generator-btn').addEventListener('click', () => this.hideEntityGenerator());
        document.getElementById('refresh-generator-tables-btn').addEventListener('click', () => this.loadTablesForGenerator());
        document.getElementById('generator-connection').addEventListener('change', () => this.loadTablesForGenerator());
        document.getElementById('preview-entity-btn').addEventListener('click', () => this.showEntityPreview());
        document.getElementById('save-generated-entity-btn').addEventListener('click', () => this.saveGeneratedEntity());
        document.getElementById('edit-generated-entity-btn').addEventListener('click', () => this.editGeneratedEntity());
        
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
            let url = `${this.serverUrl}/api/db/tables`;
            if (this.currentConnection) {
                url += `?connection=${this.currentConnection}`;
            }
            const response = await fetch(url);
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                // Si el backend devuelve un array de strings (nombres de tablas)
                this.tables = result.data.map(name => ({ name, tableName: name }));
                this.updateTablesUI();
                this.updateTableSelect();
                
                // Mostrar información de la conexión usada
                const connectionInfo = result.connectionUsed ? ` (conexión: ${result.connectionUsed})` : '';
                this.showToast('Tablas Cargadas', `${this.tables.length} tablas físicas cargadas correctamente${connectionInfo}`, 'success');
            } else {
                // Manejar error específico
                if (result.error && result.error.includes('ORA-')) {
                    this.showToast('Error de Base de Datos', 
                        `Error Oracle en conexión '${this.currentConnection || 'default'}': ${result.error}`, 
                        'error');
                } else {
                    this.showToast('Error', result.error || 'Error cargando tablas físicas', 'error');
                }
                this.tables = [];
                this.updateTablesUI();
                this.updateTableSelect();
            }
        } catch (error) {
            console.error('Error cargando tablas:', error);
            this.showToast('Error de Conexión', 'No se pudo conectar al servidor para cargar tablas', 'error');
            this.tables = [];
            this.updateTablesUI();
            this.updateTableSelect();
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
            // Si solo hay nombre de tabla física, mostrar solo el nombre
            if (!table.displayName && !table.description && !table.endpoints) {
                card.innerHTML = `
                    <div class="table-name">${tableName}</div>
                    <div class="table-info">
                        Tabla física: ${tableName}
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
            } else {
                // ...código original para entidades configuradas...
                card.innerHTML = `
                    <div class="table-name">${table.displayName || table.name}</div>
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
            }
            grid.appendChild(card);
        });
    }

    updateTableSelect() {
        const select = document.getElementById('table-select');
        select.innerHTML = '<option value="">Selecciona una tabla...</option>';
        this.tables.forEach(table => {
            const tableName = table.tableName || table.name;
            const displayName = table.displayName || tableName;
            const option = document.createElement('option');
            option.value = tableName;
            option.textContent = displayName;
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
            
            // Construir URL con query parameter de conexión si hay una seleccionada
            let url = `${this.serverUrl}/api/import/columns/${tableName}`;
            if (this.currentConnection) {
                url += `?connection=${this.currentConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.showTableDetails(tableName, 'columns', result.data, result.meta?.connectionUsed);
                
                // Mostrar información de la conexión usada
                const connectionInfo = result.meta?.connectionUsed ? ` (conexión: ${result.meta.connectionUsed})` : '';
                this.showToast('Columnas Obtenidas', `Columnas de ${tableName} obtenidas correctamente${connectionInfo}`, 'success');
            } else {
                this.showToast('Error', result.error || result.message || 'Error obteniendo columnas', 'error');
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
            
            // Construir URL con query parameter de conexión si hay una seleccionada
            let url = `${this.serverUrl}/api/${entityName}?limit=10`;
            if (this.currentConnection) {
                url += `&connection=${this.currentConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                // Los datos están en result.data.data debido a la estructura de paginación
                const tableData = result.data.data || result.data;
                this.showTableDetails(tableName, 'data', tableData, result.meta?.connectionUsed);
                
                // Mostrar información de la conexión usada
                const connectionInfo = result.meta?.connectionUsed ? ` (conexión: ${result.meta.connectionUsed})` : '';
                this.showToast('Datos Cargados', `Datos de ${tableName} obtenidos correctamente (${tableData.length} registros)${connectionInfo}`, 'success');
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
                headers: this.getRequestHeaders(),
                body: JSON.stringify({ sql })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showQueryResults(result.data);
                
                // Mostrar información de la conexión usada
                const connectionInfo = result.connectionUsed ? ` (conexión: ${result.connectionUsed})` : '';
                this.showToast('Consulta Ejecutada', `Consulta ejecutada correctamente${connectionInfo}`, 'success');
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
        if (!Array.isArray(data) || data.length === 0) {
            return '<p>No hay datos para mostrar</p>';
        }
        // Unir todas las claves posibles para soportar arrays con claves inconsistentes
        const allKeys = new Set();
        data.forEach(row => {
            if (row && typeof row === 'object') {
                Object.keys(row).forEach(k => allKeys.add(k));
            }
        });
        const headers = Array.from(allKeys);
        let html = '<table class="data-table"><thead><tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        // Limitar a 20 filas para evitar tablas enormes
        data.slice(0, 20).forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                let value = row ? row[header] : '';
                if (typeof value === 'object' && value !== null) {
                    value = `<pre style="white-space:pre-wrap;max-width:300px;">${JSON.stringify(value)}</pre>`;
                }
                html += `<td>${value !== null && value !== undefined ? value : ''}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        if (data.length > 20) {
            html += `<div style="margin-top:8px;color:#718096;font-size:0.95em;">Mostrando solo los primeros 20 registros de ${data.length}.</div>`;
        }
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

    // === CONNECTION MANAGEMENT ===
    
    async loadConnections() {
        try {
            const response = await fetch(`${this.serverUrl}/api/query/connections`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.connections = result.data;
                this.populateConnectionSelector();
                
                // Si no hay conexión seleccionada, usar la primera disponible
                if (!this.currentConnection && this.connections.length > 0) {
                    this.currentConnection = this.connections[0].name;
                    document.getElementById('connection-select').value = this.currentConnection;
                    this.updateConnectionDisplay();
                }
                
                this.showToast('Conexiones Cargadas', `${this.connections.length} conexiones disponibles`, 'success');
            } else {
                throw new Error(result.error || 'Error loading connections');
            }
        } catch (error) {
            console.error('Error loading connections:', error);
            this.showToast('Error', 'No se pudieron cargar las conexiones', 'error');
            
            // Fallback: mostrar selector deshabilitado
            const select = document.getElementById('connection-select');
            select.innerHTML = '<option value="">Sin conexiones</option>';
            select.disabled = true;
        }
    }
    
    populateConnectionSelector() {
        const select = document.getElementById('connection-select');
        select.innerHTML = '';
        select.disabled = false;
        
        this.connections.forEach(conn => {
            const option = document.createElement('option');
            option.value = conn.name;
            
            // Crear descripción más informativa
            const status = conn.isActive ? '🟢' : '🔴';
            const description = conn.config.description || `${conn.config.user}@${conn.config.connectString}`;
            
            option.textContent = `${status} ${conn.name} - ${description}`;
            option.title = `Usuario: ${conn.config.user}\nServidor: ${conn.config.connectString}\nEstado: ${conn.isActive ? 'Activa' : 'Inactiva'}`;
            
            select.appendChild(option);
        });
    }
    
    updateConnectionDisplay() {
        const displayElement = document.getElementById('current-connection-display');
        const connectionSelect = document.getElementById('connection-select');
        
        if (displayElement) {
            if (this.currentConnection) {
                const conn = this.connections.find(c => c.name === this.currentConnection);
                if (conn) {
                    const description = conn.config.description || `${conn.config.user}@${conn.config.connectString.split(':')[0]}`;
                    displayElement.textContent = `${this.currentConnection} (${description})`;
                    displayElement.style.color = '#4CAF50';
                    if (connectionSelect) connectionSelect.style.border = '2px solid #4CAF50';
                } else {
                    displayElement.textContent = `${this.currentConnection} (No disponible)`;
                    displayElement.style.color = '#ff4444';
                    if (connectionSelect) connectionSelect.style.border = '2px solid #ff4444';
                    this.showToast('Conexión No Válida', 
                        `La conexión '${this.currentConnection}' no está disponible. Selecciona una conexión válida.`, 
                        'warning');
                }
            } else {
                displayElement.textContent = 'No seleccionada';
                displayElement.style.color = '#666';
                if (connectionSelect) connectionSelect.style.border = '1px solid #ddd';
            }
        }
    }
    
    changeConnection(connectionName) {
        if (connectionName !== this.currentConnection) {
            const oldConnection = this.currentConnection;
            this.currentConnection = connectionName;
            
            console.log(`🔄 Cambiando conexión: ${oldConnection} → ${connectionName}`);
            
            // Actualizar el display de conexión
            this.updateConnectionDisplay();
            
            const conn = this.connections.find(c => c.name === connectionName);
            if (conn) {
                const description = conn.config.description || `${conn.config.user}@${conn.config.connectString}`;
                this.showToast('Conexión Cambiada', `Ahora usando: ${description}`, 'info');
                
                // Refrescar datos si es necesario
                if (document.querySelector('.nav-btn[data-tab="tables"]').classList.contains('active')) {
                    this.loadTables();
                }
            } else {
                this.showToast('Conexión Cambiada', `Conexión seleccionada: ${connectionName}`, 'info');
            }
        }
    }
    
    getRequestHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Agregar header de conexión si hay una seleccionada
        if (this.currentConnection) {
            headers['X-Database-Connection'] = this.currentConnection;
        }
        
        return headers;
    }
    
    // === END CONNECTION MANAGEMENT ===

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

    // Table Details Management
    showTableDetails(tableName, type, data, connectionUsed) {
        const card = document.getElementById('table-details-card');
        const title = document.getElementById('table-details-title');
        const content = document.getElementById('table-details-content');
        
        // Etiqueta de tipo
        const typeLabel = type === 'columns' ? 'Columnas' : 'Datos';
        const connectionInfo = connectionUsed ? `<span class="connection-badge ${connectionUsed}">${connectionUsed}</span>` : '';
        title.innerHTML = `📊 ${typeLabel} de <b>${tableName}</b> ${connectionInfo}`;
        
        // Mostrar tabla de columnas o datos
        if (type === 'columns') {
            content.innerHTML = this.createColumnsTable(data);
        } else {
            content.innerHTML = this.createDataTable(data);
        }
        
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    closeTableDetails() {
        const card = document.getElementById('table-details-card');
        card.style.display = 'none';
    }

    createColumnsTable(columns) {
        if (!columns || columns.length === 0) {
            return '<p>No hay columnas para mostrar</p>';
        }
        
        let html = '<table class="data-table"><thead><tr>';
        html += '<th>Nombre</th><th>Tipo</th><th>Requerido</th><th>Longitud</th><th>Valor por Defecto</th>';
        html += '</tr></thead><tbody>';
        
        columns.forEach(col => {
            html += '<tr>';
            html += `<td><strong>${col.name}</strong></td>`;
            html += `<td><span class="type-badge">${col.type}</span></td>`;
            html += `<td>${col.required ? '✅ Sí' : '❌ No'}</td>`;
            html += `<td>${col.length || '-'}</td>`;
            html += `<td>${col.defaultValue || '-'}</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }

    // Entity Management
    showEntityEditor() {
        const editor = document.getElementById('entity-editor');
        const jsonTextarea = document.getElementById('entity-json');
        const tableSelect = document.getElementById('entity-table-select');
        const connectionSelect = document.getElementById('entity-connection');
        // Función para cargar tablas físicas (USER_TABLES) según la conexión seleccionada
        const loadTablesForConnection = async () => {
            tableSelect.innerHTML = '<option value="">Selecciona una tabla...</option>';
            let url = `${this.serverUrl}/api/db/tables`;
            const selectedConnection = connectionSelect.value;
            if (selectedConnection) {
                url += `?connection=${selectedConnection}`;
            }
            try {
                const response = await fetch(url);
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    result.data.forEach(tableName => {
                        const opt = document.createElement('option');
                        opt.value = tableName;
                        opt.textContent = tableName;
                        tableSelect.appendChild(opt);
                    });
                }
            } catch (e) {}
        };
        // Recargar tablas al cambiar la conexión
        connectionSelect.onchange = async () => {
            await loadTablesForConnection();
            // Limpiar tableName en el JSON
            try {
                const json = JSON.parse(jsonTextarea.value);
                const key = Object.keys(json)[0];
                json[key].tableName = '';
                jsonTextarea.value = JSON.stringify(json, null, 2);
            } catch {}
        };
        loadTablesForConnection();
        // Template JSON para nueva entidad
        const template = {
            "entity_name": {
                "name": "entity_name",
                "tableName": "",
                "displayName": "Display Name",
                "description": "Descripción de la entidad",
                "primaryKey": "ID",
                "fields": {
                    "ID": {
                        "type": "NUMBER",
                        "required": true
                    },
                    "NAME": {
                        "type": "VARCHAR2",
                        "length": 100,
                        "required": false
                    }
                },
                "endpoints": [
                    "GET /api/entity_name",
                    "GET /api/entity_name/:id",
                    "POST /api/entity_name",
                    "PUT /api/entity_name/:id",
                    "DELETE /api/entity_name/:id"
                ]
            }
        };
        jsonTextarea.value = JSON.stringify(template, null, 2);
        editor.style.display = 'block';
        editor.scrollIntoView({ behavior: 'smooth' });
        // Autocompletar tableName y fields al seleccionar tabla
        tableSelect.onchange = async () => {
            try {
                const json = JSON.parse(jsonTextarea.value);
                const key = Object.keys(json)[0];
                json[key].tableName = tableSelect.value;
                // Si hay tabla seleccionada, obtener columnas y autocompletar fields
                if (tableSelect.value) {
                    let url = `${this.serverUrl}/api/import/columns/${tableSelect.value}`;
                    const selectedConnection = connectionSelect.value;
                    if (selectedConnection) {
                        url += `?connection=${selectedConnection}`;
                    }
                    const resp = await fetch(url);
                    const result = await resp.json();
                    if (result.success && Array.isArray(result.data)) {
                        const fields = {};
                        result.data.forEach(col => {
                            fields[col.name] = {
                                type: col.type,
                                required: !!col.required
                            };
                            if (col.length) fields[col.name].length = col.length;
                            if (col.defaultValue !== undefined) fields[col.name].default = col.defaultValue;
                        });
                        json[key].fields = fields;
                    }
                }
                jsonTextarea.value = JSON.stringify(json, null, 2);
            } catch {}
        };
    }

    hideEntityEditor() {
        const editor = document.getElementById('entity-editor');
        editor.style.display = 'none';
    }

    validateEntityJSON() {
        const jsonTextarea = document.getElementById('entity-json');
        try {
            const parsed = JSON.parse(jsonTextarea.value);
            
            // Validación básica
            if (typeof parsed !== 'object') {
                throw new Error('El JSON debe ser un objeto');
            }
            
            // Validar que tiene al menos una entidad
            const entityKeys = Object.keys(parsed);
            if (entityKeys.length === 0) {
                throw new Error('Debe definir al menos una entidad');
            }
            
            // Validar estructura de la primera entidad
            const firstEntity = parsed[entityKeys[0]];
            const requiredFields = ['name', 'tableName', 'primaryKey', 'fields'];
            
            for (const field of requiredFields) {
                if (!firstEntity[field]) {
                    throw new Error(`Campo requerido faltante: ${field}`);
                }
            }
            
            this.showToast('Validación', 'JSON válido ✅', 'success');
        } catch (error) {
            this.showToast('Error de Validación', `JSON inválido: ${error.message}`, 'error');
        }
    }

    async saveEntity() {
        const connectionSelect = document.getElementById('entity-connection');
        const jsonTextarea = document.getElementById('entity-json');
        const selectedConnection = connectionSelect.value;
        
        try {
            const entityData = JSON.parse(jsonTextarea.value);
            
            // Validar antes de enviar
            this.validateEntityJSON();
            
            this.showLoading(true);
            
            const response = await fetch(`${this.serverUrl}/api/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-connection': selectedConnection
                },
                body: JSON.stringify({
                    connection: selectedConnection,
                    entities: entityData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Éxito', 'Entidad guardada correctamente', 'success');
                this.hideEntityEditor();
                this.loadEntities();
                this.loadTables(); // Recargar tablas también
            } else {
                this.showToast('Error', result.message || 'Error guardando entidad', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Error procesando la entidad: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadEntities() {
        try {
            let url = `${this.serverUrl}/api/info`;
            if (this.currentConnection) {
                url += `?connection=${this.currentConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.updateEntitiesUI(result.data.entities || [], result.meta?.connectionUsed);
            }
        } catch (error) {
            console.error('Error cargando entidades:', error);
        }
    }

    updateEntitiesUI(entities, connectionUsed) {
        const grid = document.getElementById('entities-grid');
        grid.innerHTML = '';
        
        if (!entities || entities.length === 0) {
            grid.innerHTML = '<p>No hay entidades configuradas</p>';
            return;
        }
        
        entities.forEach(entity => {
            const card = document.createElement('div');
            card.className = 'entity-card';
            
            const connectionBadge = connectionUsed || 'default';
            
            card.innerHTML = `
                <div class="connection-badge ${connectionBadge}">${connectionBadge}</div>
                <div class="entity-name">${entity.displayName || entity.name}</div>
                <div class="entity-info">
                    Nombre: ${entity.name}<br>
                    Tabla: ${entity.tableName}<br>
                    Clave: ${entity.primaryKey}<br>
                    Endpoints: ${entity.endpoints ? entity.endpoints.length : 0}
                    ${entity.description ? `<br>Descripción: ${entity.description}` : ''}
                </div>
                <div class="entity-actions">
                    <button class="btn btn-sm btn-outline" onclick="app.viewEntityData('${entity.name}')">
                        <span class="btn-icon">👁️</span>
                        Ver Datos
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.viewEntityColumns('${entity.name}')">
                        <span class="btn-icon">🔍</span>
                        Columnas
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // === FUNCIONES DE GENERACIÓN DE ENTIDADES ===
    
    showEntityGenerator() {
        this.hideEntityEditor(); // Asegurar que el editor manual esté oculto
        const generator = document.getElementById('entity-generator');
        generator.style.display = 'block';
        
        // Cargar conexiones en el selector
        this.loadConnectionsIntoSelect('generator-connection');
        
        // Cargar tablas para la conexión actual
        this.loadTablesForGenerator();
        
        // Limpiar valores previos
        document.getElementById('generator-entity-name').value = '';
        document.getElementById('entity-preview').style.display = 'none';
        document.getElementById('preview-entity-btn').style.display = 'none';
    }

    hideEntityGenerator() {
        const generator = document.getElementById('entity-generator');
        generator.style.display = 'none';
        
        // Limpiar valores
        document.getElementById('generator-table-select').innerHTML = '<option value="">Selecciona una tabla...</option>';
        document.getElementById('generator-entity-name').value = '';
        document.getElementById('entity-preview').style.display = 'none';
        document.getElementById('entity-preview-json').value = '';
        this.generatedEntityData = null;
    }

    async loadTablesForGenerator() {
        const connectionSelect = document.getElementById('generator-connection');
        const tableSelect = document.getElementById('generator-table-select');
        const selectedConnection = connectionSelect.value || 'default';
        
        try {
            tableSelect.innerHTML = '<option value="">Cargando tablas...</option>';
            
            let url = `${this.serverUrl}/api/db/tables`;
            if (selectedConnection) {
                url += `?connection=${selectedConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                tableSelect.innerHTML = '<option value="">Selecciona una tabla...</option>';
                
                result.data.forEach(tableName => {
                    const option = document.createElement('option');
                    option.value = tableName;
                    option.textContent = tableName;
                    tableSelect.appendChild(option);
                });
                
                this.showToast('Éxito', `${result.data.length} tablas cargadas para ${selectedConnection}`, 'success');
            } else {
                tableSelect.innerHTML = '<option value="">Error cargando tablas</option>';
                this.showToast('Error', 'No se pudieron cargar las tablas', 'error');
            }
        } catch (error) {
            console.error('Error cargando tablas para generator:', error);
            tableSelect.innerHTML = '<option value="">Error de conexión</option>';
            this.showToast('Error', 'Error de conexión al cargar tablas', 'error');
        }
    }

    async generateEntityFromTable() {
        const connectionSelect = document.getElementById('generator-connection');
        const tableSelect = document.getElementById('generator-table-select');
        const entityNameInput = document.getElementById('generator-entity-name');
        
        const selectedConnection = connectionSelect.value || 'default';
        const selectedTable = tableSelect.value;
        const entityName = entityNameInput.value.trim();
        
        if (!selectedTable) {
            this.showToast('Error', 'Debes seleccionar una tabla', 'error');
            return;
        }
        
        // Validar que la conexión existe
        const connectionExists = this.connections.some(conn => conn.name === selectedConnection);
        if (!connectionExists) {
            this.showToast('Error de Conexión', 
                `La conexión '${selectedConnection}' no está disponible. Verifica que esté configurada correctamente.`, 
                'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const requestBody = {
                tableName: selectedTable,
                connectionName: selectedConnection
            };
            
            if (entityName) {
                requestBody.entityName = entityName;
            }
            
            const response = await fetch(`${this.serverUrl}/api/entities/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-connection': selectedConnection
                },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.generatedEntityData = result.data;
                
                // Mostrar vista previa
                document.getElementById('entity-preview-json').value = JSON.stringify(result.data.preview, null, 2);
                document.getElementById('entity-preview').style.display = 'block';
                document.getElementById('preview-entity-btn').style.display = 'inline-block';
                
                this.showToast('Éxito', `Entidad generada exitosamente para la tabla '${selectedTable}'`, 'success');
            } else {
                this.showToast('Error', result.message || 'Error generando entidad', 'error');
            }
        } catch (error) {
            console.error('Error generando entidad:', error);
            this.showToast('Error', 'Error procesando la generación: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showEntityPreview() {
        if (!this.generatedEntityData) {
            this.showToast('Error', 'No hay datos de entidad para mostrar', 'error');
            return;
        }
        
        const preview = document.getElementById('entity-preview');
        preview.style.display = 'block';
        
        // Scroll hasta la vista previa
        preview.scrollIntoView({ behavior: 'smooth' });
    }

    async saveGeneratedEntity() {
        if (!this.generatedEntityData) {
            this.showToast('Error', 'No hay entidad generada para guardar', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const connectionSelect = document.getElementById('generator-connection');
            const selectedConnection = connectionSelect.value || 'default';
            
            const response = await fetch(`${this.serverUrl}/api/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-connection': selectedConnection
                },
                body: JSON.stringify({
                    connection: selectedConnection,
                    entities: this.generatedEntityData.preview
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Éxito', 'Entidad guardada correctamente', 'success');
                this.hideEntityGenerator();
                this.loadEntities();
                this.loadTables(); // Recargar tablas también
            } else {
                this.showToast('Error', result.message || 'Error guardando entidad', 'error');
            }
        } catch (error) {
            console.error('Error guardando entidad generada:', error);
            this.showToast('Error', 'Error procesando la entidad: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editGeneratedEntity() {
        if (!this.generatedEntityData) {
            this.showToast('Error', 'No hay entidad generada para editar', 'error');
            return;
        }
        
        // Cambiar al editor manual con los datos generados
        this.hideEntityGenerator();
        this.showEntityEditor();
        
        // Poblar el editor con los datos generados
        const connectionSelect = document.getElementById('entity-connection');
        const jsonTextarea = document.getElementById('entity-json');
        
        connectionSelect.value = document.getElementById('generator-connection').value;
        jsonTextarea.value = JSON.stringify(this.generatedEntityData.preview, null, 2);
        
        this.showToast('Información', 'Entidad cargada en el editor para modificación manual', 'info');
    }

    // === FUNCIONES PARA VER DATOS Y COLUMNAS DE ENTIDADES ===
    
    async viewEntityData(entityName) {
        try {
            this.showLoading(true);
            
            let url = `${this.serverUrl}/api/entities/${entityName}/data`;
            if (this.currentConnection) {
                url += `?connection=${this.currentConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.showEntityDataModal(result.data);
            } else {
                // Mejor manejo de errores específicos
                if (result.message && result.message.includes('no existe')) {
                    this.showToast('Tabla No Disponible', 
                        `La tabla '${entityName}' no existe en la conexión '${this.currentConnection || 'default'}'. Verifica la configuración de conexiones válidas.`, 
                        'warning');
                } else {
                    this.showToast('Error', result.message || 'Error obteniendo datos de entidad', 'error');
                }
            }
        } catch (error) {
            console.error('Error obteniendo datos de entidad:', error);
            this.showToast('Error de Conexión', 'No se pudo conectar al servidor: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async viewEntityColumns(entityName) {
        try {
            this.showLoading(true);
            
            let url = `${this.serverUrl}/api/entities/${entityName}/columns`;
            if (this.currentConnection) {
                url += `?connection=${this.currentConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.showEntityColumnsModal(result.data);
            } else {
                // Mejor manejo de errores específicos
                if (result.message && result.message.includes('no existe')) {
                    this.showToast('Tabla No Disponible', 
                        `La tabla '${entityName}' no existe en la conexión '${this.currentConnection || 'default'}'. Verifica la configuración de conexiones válidas.`, 
                        'warning');
                } else {
                    this.showToast('Error', result.message || 'Error obteniendo columnas de entidad', 'error');
                }
            }
        } catch (error) {
            console.error('Error obteniendo columnas de entidad:', error);
            this.showToast('Error de Conexión', 'No se pudo conectar al servidor: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showEntityDataModal(data) {
        // Crear modal para mostrar datos
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content entity-data-modal">
                <div class="modal-header">
                    <h3>📊 Datos de ${data.entityName}</h3>
                    <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">❌</button>
                </div>
                <div class="modal-body">
                    <div class="entity-data-info">
                        <p><strong>Tabla:</strong> ${data.tableName}</p>
                        <p><strong>Conexión:</strong> ${data.connectionUsed}</p>
                        <p><strong>Total de registros:</strong> ${data.pagination.totalRecords}</p>
                        <p><strong>Página:</strong> ${data.pagination.page} de ${data.pagination.totalPages}</p>
                    </div>
                    
                    <div class="entity-data-table-container">
                        <table class="entity-data-table">
                            <thead>
                                <tr>
                                    ${data.records.length > 0 ? Object.keys(data.records[0])
                                        .filter(key => key !== 'rn' && key !== 'RN')
                                        .map(key => `<th>${key}</th>`).join('') : '<th>Sin datos</th>'}
                                </tr>
                            </thead>
                            <tbody>
                                ${data.records.map(record => `
                                    <tr>
                                        ${Object.entries(record)
                                            .filter(([key]) => key !== 'rn' && key !== 'RN')
                                            .map(([key, value]) => `<td>${value ?? 'NULL'}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="pagination-controls">
                        ${data.pagination.hasPrevious ? 
                            `<button class="btn btn-outline" onclick="app.loadEntityDataPage('${data.entityName}', ${data.pagination.page - 1})">⬅️ Anterior</button>` : ''}
                        ${data.pagination.hasNext ? 
                            `<button class="btn btn-outline" onclick="app.loadEntityDataPage('${data.entityName}', ${data.pagination.page + 1})">Siguiente ➡️</button>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showEntityColumnsModal(data) {
        // Crear modal para mostrar columnas
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content entity-columns-modal">
                <div class="modal-header">
                    <h3>🔍 Columnas de ${data.entityName}</h3>
                    <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">❌</button>
                </div>
                <div class="modal-body">
                    <div class="entity-columns-info">
                        <p><strong>Tabla:</strong> ${data.tableName}</p>
                        <p><strong>Conexión:</strong> ${data.connectionUsed}</p>
                        <p><strong>Total de columnas:</strong> ${data.totalColumns}</p>
                    </div>
                    
                    <div class="entity-columns-table-container">
                        <table class="entity-columns-table">
                            <thead>
                                <tr>
                                    <th>Posición</th>
                                    <th>Nombre</th>
                                    <th>Tipo</th>
                                    <th>Longitud</th>
                                    <th>Nullable</th>
                                    <th>Valor por Defecto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.columns.map(column => `
                                    <tr>
                                        <td>${column.position}</td>
                                        <td><strong>${column.name}</strong></td>
                                        <td><span class="type-badge">${column.type}</span></td>
                                        <td>${column.length || (column.precision ? `${column.precision}${column.scale ? `,${column.scale}` : ''}` : '-')}</td>
                                        <td><span class="nullable-badge ${column.nullable ? 'nullable' : 'not-nullable'}">${column.nullable ? 'SÍ' : 'NO'}</span></td>
                                        <td>${column.defaultValue || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async loadEntityDataPage(entityName, page) {
        // Cerrar modal actual
        const currentModal = document.querySelector('.modal-overlay');
        if (currentModal) {
            currentModal.remove();
        }
        
        try {
            this.showLoading(true);
            
            let url = `${this.serverUrl}/api/entities/${entityName}/data?page=${page}`;
            if (this.currentConnection) {
                url += `&connection=${this.currentConnection}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.showEntityDataModal(result.data);
            } else {
                this.showToast('Error', result.message || 'Error obteniendo datos de entidad', 'error');
            }
        } catch (error) {
            console.error('Error obteniendo página de datos:', error);
            this.showToast('Error', 'Error de conexión: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    loadConnectionsIntoSelect(selectId) {
        const select = document.getElementById(selectId);
        
        // Limpiar opciones existentes
        select.innerHTML = '';
        
        // Agregar conexiones disponibles
        const connections = ['default', 'desa', 'prod'];
        connections.forEach(conn => {
            const option = document.createElement('option');
            option.value = conn;
            option.textContent = conn;
            if (conn === this.currentConnection) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
}

// Initialize the application
const app = new DNOOracle();

// Make app globally available for onclick handlers
globalThis.app = app;
