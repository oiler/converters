/**
 * CSV to HTML Table Converter
 * Vanilla JS implementation with functional patterns
 */

/**
 * Parse CSV text into a 2D array
 * Handles quoted fields and embedded commas
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Array<string>>} 2D array of parsed values
 */
const parseCSV = (csvText) => {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter(row => row.some(cell => cell !== ''));
};

/**
 * Create an HTML table element from parsed CSV data
 * @param {Array<Array<string>>} data - 2D array of CSV data
 * @param {Object} options - Configuration options
 * @param {boolean} options.hasHeader - First row is header
 * @param {string} options.className - CSS class for table
 * @returns {HTMLTableElement} Constructed table element
 */
const createTableFromData = (data, options = {}) => {
  const { hasHeader = true, className = 'csv-table' } = options;
  
  if (!data || data.length === 0) {
    return null;
  }

  const table = document.createElement('table');
  table.className = className;

  // Create header if specified
  if (hasHeader && data.length > 0) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    data[0].forEach(cellText => {
      const th = document.createElement('th');
      th.textContent = cellText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  // Create body
  const tbody = document.createElement('tbody');
  const startIndex = hasHeader ? 1 : 0;

  data.slice(startIndex).forEach(row => {
    const tr = document.createElement('tr');
    
    row.forEach(cellText => {
      const td = document.createElement('td');
      td.textContent = cellText;
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
};

/**
 * Format HTML string with basic indentation
 * @param {string} html - Raw HTML string
 * @returns {string} Formatted HTML string
 */
const formatHTML = (html) => {
  const tab = '  ';
  let formatted = '';
  let indent = 0;

  html.split(/>\s*</).forEach((node, index) => {
    // Add back the < and > that were removed by split
    if (index > 0) node = '<' + node;
    if (index < html.split(/>\s*</).length - 1) node = node + '>';

    // Adjust indent for closing tags
    if (/^<\/\w/.test(node)) {
      indent = Math.max(0, indent - 1);
    }

    // Add formatted line
    formatted += tab.repeat(indent) + node.trim() + '\n';

    // Adjust indent for opening tags (but not self-closing or closing tags)
    if (/^<\w[^>]*[^\/]>/.test(node)) {
      indent++;
    }
  });

  return formatted.trim();
};

/**
 * Create a code block element with copy functionality
 * @param {string} htmlString - HTML string to display
 * @returns {HTMLElement} Code container with copy button
 */
const createCodeOutput = (htmlString) => {
  const container = document.createElement('div');
  container.className = 'csv-code-container';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = formatHTML(htmlString);
  pre.appendChild(code);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'csv-copy-button';
  copyButton.textContent = 'Copy HTML';

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      copyButton.classList.add('copied');
      
      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      copyButton.textContent = 'Copy failed';
      setTimeout(() => {
        copyButton.textContent = 'Copy HTML';
      }, 2000);
    }
  });

  container.appendChild(copyButton);
  container.appendChild(pre);

  return container;
};

/**
 * Handle form submission and convert CSV to table
 * @param {Event} event - Form submit event
 * @param {Object} config - Configuration object
 * @param {string} config.inputSelector - Selector for CSV input field
 * @param {string} config.outputSelector - Selector for output container
 * @param {string} config.codeOutputSelector - Selector for code output container
 * @param {Object} config.tableOptions - Options passed to createTableFromData
 */
const handleCSVConversion = (event, config) => {
  event.preventDefault();

  const {
    inputSelector = '[data-csv-input]',
    outputSelector = '[data-csv-output]',
    codeOutputSelector = '[data-csv-code]',
    tableOptions = {}
  } = config;

  const form = event.target;
  const input = form.querySelector(inputSelector);
  const output = document.querySelector(outputSelector);
  const codeOutput = document.querySelector(codeOutputSelector);

  if (!input || !output) {
    console.error('CSV converter: Required elements not found');
    return;
  }

  const csvText = input.value;

  if (!csvText.trim()) {
    output.innerHTML = '<p class="csv-error">Please enter CSV data</p>';
    if (codeOutput) codeOutput.innerHTML = '';
    return;
  }

  try {
    const parsedData = parseCSV(csvText);
    const table = createTableFromData(parsedData, tableOptions);

    if (table) {
      output.innerHTML = '';
      output.appendChild(table);

      // Generate code output if container exists
      if (codeOutput) {
        const htmlString = table.outerHTML;
        const codeBlock = createCodeOutput(htmlString);
        codeOutput.innerHTML = '';
        codeOutput.appendChild(codeBlock);
      }
    } else {
      output.innerHTML = '<p class="csv-error">No valid data to display</p>';
      if (codeOutput) codeOutput.innerHTML = '';
    }
  } catch (error) {
    console.error('CSV conversion error:', error);
    output.innerHTML = '<p class="csv-error">Error processing CSV data</p>';
    if (codeOutput) codeOutput.innerHTML = '';
  }
};

/**
 * Initialize CSV converter on form(s)
 * @param {Object} config - Configuration object
 * @param {string} config.formSelector - Selector for form element(s)
 */
const initCSVConverter = (config = {}) => {
  const { formSelector = '[data-csv-form]' } = config;
  const forms = document.querySelectorAll(formSelector);

  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      handleCSVConversion(event, config);
    });
  });
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initCSVConverter());
} else {
  initCSVConverter();
}

// Export for manual initialization or configuration
window.CSVConverter = {
  init: initCSVConverter,
  parse: parseCSV,
  createTable: createTableFromData
};
