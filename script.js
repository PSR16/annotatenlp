class TextClassifier {
    constructor() {
        this.csvData = [];
        this.headers = [];
        this.currentIndex = 0;
        this.textColumn = '';
        this.labelColumn = '';
        this.classifications = [];
        this.customLabels = new Set();
        this.filteredIndices = [];
        this.currentFilteredIndex = 0;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('csvFile').addEventListener('change', this.handleFileUpload.bind(this));
        document.getElementById('analyzeLables').addEventListener('click', this.analyzeLabels.bind(this));
        document.getElementById('startClassification').addEventListener('click', this.startClassification.bind(this));
        document.getElementById('customLabelInput').addEventListener('keypress', this.handleCustomLabelInput.bind(this));
        document.getElementById('setupLabelInput').addEventListener('keypress', this.handleSetupLabelInput.bind(this));
        document.getElementById('prevButton').addEventListener('click', () => this.navigateToIndex(this.currentFilteredIndex - 1));
        document.getElementById('nextButton').addEventListener('click', () => this.navigateToIndex(this.currentFilteredIndex + 1));
        document.getElementById('exportButton').addEventListener('click', this.exportResults.bind(this));
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.parseCSVResults(results);
                this.displayFileInfo(file);
                this.setupColumnSelection();
            },
            error: (error) => {
                alert(`Error parsing CSV: ${error.message}`);
            }
        });
    }
    
    parseCSVResults(results) {
        this.csvData = results.data;
        this.headers = results.meta.fields || Object.keys(this.csvData[0] || {});
        this.classifications = new Array(this.csvData.length).fill(null).map(() => []);
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
        
        this.updateFilterCounts();
    }
    
    updateFilterCounts() {
        const withLabels = this.csvData.filter((_, index) => 
            this.classifications[index] && this.classifications[index].length > 0
        ).length;
        const withoutLabels = this.csvData.length - withLabels;
        
        document.getElementById('allRowsCount').textContent = this.csvData.length;
        document.getElementById('withLabelsCount').textContent = withLabels;
        document.getElementById('withoutLabelsCount').textContent = withoutLabels;
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
        
        this.applyFilter();
        this.currentFilteredIndex = 0;
        this.displayClassificationInterface();
        this.displayCurrentText();
    }
    
    applyFilter() {
        const filterMode = document.querySelector('input[name="filterMode"]:checked').value;
        
        this.filteredIndices = [];
        for (let i = 0; i < this.csvData.length; i++) {
            const hasLabels = this.classifications[i] && this.classifications[i].length > 0;
            
            if (filterMode === 'all' || 
                (filterMode === 'with-labels' && hasLabels) ||
                (filterMode === 'without-labels' && !hasLabels)) {
                this.filteredIndices.push(i);
            }
        }
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
        if (this.currentFilteredIndex >= this.filteredIndices.length) {
            this.showExportOption();
            return;
        }
        
        this.currentIndex = this.filteredIndices[this.currentFilteredIndex];
        const currentRow = this.csvData[this.currentIndex];
        const text = currentRow[this.textColumn];
        
        document.getElementById('textContent').textContent = text;
        document.getElementById('progressText').textContent = `Item ${this.currentFilteredIndex + 1} of ${this.filteredIndices.length}`;
        document.getElementById('progressFill').style.width = `${((this.currentFilteredIndex + 1) / this.filteredIndices.length) * 100}%`;
        
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
    
    navigateToIndex(filteredIndex) {
        if (filteredIndex < 0 || filteredIndex >= this.filteredIndices.length) return;
        
        this.currentFilteredIndex = filteredIndex;
        this.displayCurrentText();
    }
    
    updateNavigationButtons() {
        document.getElementById('prevButton').disabled = this.currentFilteredIndex === 0;
        document.getElementById('nextButton').disabled = this.currentFilteredIndex >= this.filteredIndices.length - 1;
        
        if (this.currentFilteredIndex >= this.filteredIndices.length - 1) {
            document.getElementById('exportButton').style.display = 'inline-block';
        }
    }
    
    showExportOption() {
        document.getElementById('textContent').textContent = 'Classification complete!';
        document.getElementById('exportButton').style.display = 'inline-block';
        document.getElementById('nextButton').style.display = 'none';
    }
    
    exportResults() {
        // Always export ALL rows from original data, not just filtered ones
        const results = this.csvData.map((row, index) => ({
            ...row,
            classifications: this.classifications[index] || []
        }));
        
        const csvContent = this.convertToCSV(results);
        this.downloadCSV(csvContent, 'classified_data.csv');
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const exportData = data.map(row => ({
            ...row,
            classifications: JSON.stringify(row.classifications)
        }));
        
        return Papa.unparse(exportData, {
            header: true,
            quotes: true
        });
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
