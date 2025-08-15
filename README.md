# NLP Text Classifier Web App

A simple web application for classifying text data with multi-label support, designed for NLP annotation projects.

## Features

- **CSV Upload**: Upload CSV files containing text data
- **Column Selection**: Choose which column contains the text to classify and which contains existing labels
- **Multi-label Classification**: Support for multiple labels per text item, output as JSON arrays
- **Existing Label Integration**: Automatically detects and displays existing labels from the CSV
- **Custom Labels**: Add new labels on-the-fly during classification
- **Export Results**: Download classified data as CSV with labels in JSON array format

## Usage

1. **Upload CSV**: Select and upload your CSV file
2. **Select Columns**: 
   - Choose the column containing text to classify
   - Optionally select a column with existing labels
3. **Classify**: Navigate through each text item and assign labels
4. **Export**: Download the results with classifications

## Label Format

- Multi-label classifications are output as JSON arrays: `["LABEL1", "LABEL2"]`
- Single labels are still stored as arrays: `["SINGLE_LABEL"]`
- Existing labels can be in various formats:
  - JSON arrays: `["existing", "labels"]`
  - Comma-separated: `existing, labels`
  - Single strings: `existing_label`

## File Structure

- `index.html` - Main application interface
- `styles.css` - Styling and responsive design
- `script.js` - Core functionality and CSV processing
- `README.md` - Documentation

## Getting Started

Simply open `index.html` in a web browser - no server required!

## Browser Compatibility

Works in all modern browsers that support:
- File API
- ES6+ JavaScript features
- CSS Grid/Flexbox
