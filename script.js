class TextClassifier {
    constructor() {
        this.csvData = [];
        this.headers = [];
        this.currentIndex = 0;
        this.textColumn = '';
        this.labelColumn = '';
        this.classifications = [];
        this.customLabels = new Set();
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('csvFile').addEventListener('change', this.handleFileUpload.bind(this));
        document.getElementById('analyzeLables').addEventListener('click', this.analyzeLabels.bind(this));
        document.getElementById('startClassification').addEventListener('click', this.startClassification.bind(this));
        document.getElementById('customLabelInput').addEventListener('keypress', this.handleCustomLabelInput.bind(this));
        document.getElementById('setupLabelInput').addEventListener('keypress', this.handleSetupLabelInput.bind(this));
        document.getElementById('prevButton').addEventListener('click', () => this.navigateToIndex(this.currentIndex - 1));
        document.getElementById('nextButton').addEventListener('click', () => this.navigateToIndex(this.currentIndex + 1));
        document.getElementById('exportButton').addEventListener('click', this.exportResults.bind(this));
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseCSV(e.target.result);
            this.displayFileInfo(file);
            this.setupColumnSelection();
        };
        reader.readAsText(file);
    }
    
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        this.headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        
        this.csvData = lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const row = {};
            this.headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        });
        
        this.classifications = new Array(this.csvData.length).fill(null).map(() => []);
    }
    
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/"/g, ''));
        return values;
    }
    
    displayFileInfo(file) {
        document.getElementById('fileInfo').innerHTML = `
            <strong>File:</strong> ${file.name}<br>
            <strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
            <strong>Rows:</strong> ${this.csvData.length}
        `;
    }
    
    setupColumnSelection() {
        const textSelect = document.getElementById('textColumn');
        const labelSelect = document.getElementById('labelColumn');
        
        textSelect.innerHTML = '';
        labelSelect.innerHTML = '<option value="">-- None --</option>';
        
        this.headers.forEach(header => {
            const option1 = new Option(header, header);
            const option2 = new Option(header, header);
            textSelect.appendChild(option1);
            labelSelect.appendChild(option2);
        });
        
        document.getElementById('columnSelection').style.display = 'block';
    }
    
    analyzeLabels() {
        this.textColumn = document.getElementById('textColumn').value;
        this.labelColumn = document.getElementById('labelColumn').value;
        
        if (!this.textColumn) {
            alert('Please select a text column');
            return;
        }
        
        this.loadExistingLabels();
        this.displayLabelSetup();
    }
    
    displayLabelSetup() {
        document.getElementById('labelSetup').style.display = 'block';
        
        if (this.existingLabels && this.existingLabels.length > 0) {
            document.getElementById('existingLabelsPreview').style.display = 'block';
            this.displayFoundLabels();
        }
    }
    
    displayFoundLabels() {
        const container = document.getElementById('foundLabelsList');
        const countElement = document.getElementById('labelCount');
        
        container.innerHTML = '';
        countElement.textContent = this.existingLabels.length;
        
        this.existingLabels.forEach(label => {
            const labelElement = document.createElement('span');
            labelElement.className = 'label';
            labelElement.textContent = label;
            container.appendChild(labelElement);
        });
    }
    
    handleSetupLabelInput(event) {
        if (event.key === 'Enter' && event.target.value.trim()) {
            const labelText = event.target.value.trim();
            
            // Add to existing labels if not already present
            if (!this.existingLabels.includes(labelText)) {
                this.existingLabels.push(labelText);
                this.displayFoundLabels();
            }
            
            // Also add to custom labels
            this.customLabels.add(labelText);
            this.displaySetupCustomLabels();
            event.target.value = '';
        }
    }
    
    displaySetupCustomLabels() {
        const container = document.getElementById('setupCustomLabelsList');
        container.innerHTML = '';
        
        Array.from(this.customLabels).forEach(label => {
            const labelElement = document.createElement('span');
            labelElement.className = 'label removable';
            labelElement.textContent = label;
            labelElement.onclick = () => this.removeSetupCustomLabel(label);
            container.appendChild(labelElement);
        });
    }
    
    removeSetupCustomLabel(labelText) {
        this.customLabels.delete(labelText);
        
        // Remove from existing labels if it was added as custom
        const index = this.existingLabels.indexOf(labelText);
        if (index !== -1) {
            this.existingLabels.splice(index, 1);
            this.displayFoundLabels();
        }
        
        this.displaySetupCustomLabels();
    }
    
    startClassification() {
        if (!this.textColumn) {
            alert('Please select a text column first');
            return;
        }
        
        this.currentIndex = 0;
        this.displayClassificationInterface();
        this.displayCurrentText();
    }
    
    loadExistingLabels() {
        if (!this.labelColumn) return;
        
        const allLabels = new Set();
        this.csvData.forEach((row, index) => {
            const labelText = row[this.labelColumn];
            if (labelText && labelText.trim()) {
                let labels = [];
                
                try {
                    // Try parsing as JSON first
                    const parsed = JSON.parse(labelText);
                    if (Array.isArray(parsed)) {
                        labels = parsed.map(l => String(l).trim()).filter(l => l);
                    } else {
                        labels = [String(parsed).trim()].filter(l => l);
                    }
                } catch {
                    // If JSON parsing fails, try other formats
                    const trimmed = labelText.trim();
                    
                    // Check if it looks like an array format ['item1', 'item2']
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                        try {
                            // Remove brackets and split by comma, then clean up quotes
                            const content = trimmed.slice(1, -1);
                            labels = content.split(',')
                                .map(l => l.trim().replace(/^['"]|['"]$/g, ''))
                                .filter(l => l);
                        } catch {
                            // If that fails, treat as single label
                            labels = [trimmed];
                        }
                    } else {
                        // Split by comma for comma-separated values
                        labels = trimmed.split(',')
                            .map(l => l.trim())
                            .filter(l => l);
                    }
                }
                
                // Add individual labels to the set and store for this row
                labels.forEach(label => allLabels.add(label));
                this.classifications[index] = [...labels];
            }
        });
        
        this.existingLabels = Array.from(allLabels);
    }
    
    displayClassificationInterface() {
        document.getElementById('classificationSection').style.display = 'block';
        
        if (this.existingLabels && this.existingLabels.length > 0) {
            document.getElementById('existingLabels').style.display = 'block';
            this.displayExistingLabels();
        }
    }
    
    displayExistingLabels() {
        const container = document.getElementById('existingLabelsList');
        container.innerHTML = '';
        
        this.existingLabels.forEach(label => {
            const labelElement = this.createLabelElement(label, 'existing');
            container.appendChild(labelElement);
        });
    }
    
    displayCurrentText() {
        if (this.currentIndex >= this.csvData.length) {
            this.showExportOption();
            return;
        }
        
        const currentRow = this.csvData[this.currentIndex];
        const text = currentRow[this.textColumn];
        
        document.getElementById('textContent').textContent = text;
        document.getElementById('progressText').textContent = `Item ${this.currentIndex + 1} of ${this.csvData.length}`;
        document.getElementById('progressFill').style.width = `${((this.currentIndex + 1) / this.csvData.length) * 100}%`;
        
        this.updateSelectedLabels();
        this.updateNavigationButtons();
    }
    
    createLabelElement(text, type = 'existing') {
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = text;
        
        if (type === 'custom') {
            label.className += ' removable';
            label.onclick = () => this.removeCustomLabel(text);
        } else {
            label.onclick = () => this.toggleLabel(text);
        }
        
        return label;
    }
    
    toggleLabel(labelText) {
        const currentLabels = this.classifications[this.currentIndex];
        const index = currentLabels.indexOf(labelText);
        
        if (index === -1) {
            currentLabels.push(labelText);
        } else {
            currentLabels.splice(index, 1);
        }
        
        this.updateSelectedLabels();
    }
    
    handleCustomLabelInput(event) {
        if (event.key === 'Enter' && event.target.value.trim()) {
            const labelText = event.target.value.trim();
            this.customLabels.add(labelText);
            this.displayCustomLabels();
            event.target.value = '';
        }
    }
    
    displayCustomLabels() {
        const container = document.getElementById('customLabelsList');
        container.innerHTML = '';
        
        Array.from(this.customLabels).forEach(label => {
            const labelElement = this.createLabelElement(label, 'custom');
            container.appendChild(labelElement);
        });
    }
    
    removeCustomLabel(labelText) {
        this.customLabels.delete(labelText);
        this.classifications.forEach(labels => {
            const index = labels.indexOf(labelText);
            if (index !== -1) labels.splice(index, 1);
        });
        this.displayCustomLabels();
        this.updateSelectedLabels();
    }
    
    updateSelectedLabels() {
        const container = document.getElementById('selectedLabelsList');
        const currentLabels = this.classifications[this.currentIndex];
        
        container.innerHTML = '';
        
        currentLabels.forEach(label => {
            const labelElement = document.createElement('span');
            labelElement.className = 'label selected';
            labelElement.textContent = label;
            labelElement.onclick = () => this.toggleLabel(label);
            container.appendChild(labelElement);
        });
        
        document.getElementById('labelOutput').textContent = JSON.stringify(currentLabels);
        
        this.updateExistingLabelsDisplay();
    }
    
    updateExistingLabelsDisplay() {
        const existingLabels = document.querySelectorAll('#existingLabelsList .label');
        const currentLabels = this.classifications[this.currentIndex];
        
        existingLabels.forEach(labelEl => {
            const isSelected = currentLabels.includes(labelEl.textContent);
            labelEl.classList.toggle('selected', isSelected);
        });
    }
    
    navigateToIndex(index) {
        if (index < 0 || index >= this.csvData.length) return;
        
        this.currentIndex = index;
        this.displayCurrentText();
    }
    
    updateNavigationButtons() {
        document.getElementById('prevButton').disabled = this.currentIndex === 0;
        document.getElementById('nextButton').disabled = this.currentIndex >= this.csvData.length - 1;
        
        if (this.currentIndex >= this.csvData.length - 1) {
            document.getElementById('exportButton').style.display = 'inline-block';
        }
    }
    
    showExportOption() {
        document.getElementById('textContent').textContent = 'Classification complete!';
        document.getElementById('exportButton').style.display = 'inline-block';
        document.getElementById('nextButton').style.display = 'none';
    }
    
    exportResults() {
        const results = this.csvData.map((row, index) => ({
            ...row,
            classifications: this.classifications[index]
        }));
        
        const csvContent = this.convertToCSV(results);
        this.downloadCSV(csvContent, 'classified_data.csv');
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = [...this.headers, 'classifications'];
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = this.headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            
            // Properly escape the JSON array to stay in one column
            const jsonString = JSON.stringify(row.classifications);
            const escapedJson = jsonString.replace(/"/g, '""');
            values.push(`"${escapedJson}"`);
            
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Initialize the application
const classifier = new TextClassifier();
