/**
 * CSV to WordPress Block Table Converter
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
 * Create WordPress block table markup from parsed CSV data
 * @param {Array<Array<string>>} data - 2D array of CSV data
 * @param {Object} options - Configuration options
 * @param {boolean} options.hasHeader - First row is header
 * @param {boolean} options.hasFixedLayout - Use fixed table layout
 * @param {boolean} options.hasStripes - Add striped style
 * @returns {string} WordPress block table markup
 */
const createWPTableMarkup = (data, options = {}) => {
  const { 
    hasHeader = false, 
    hasFixedLayout = true,
    hasStripes = false 
  } = options;
  
  if (!data || data.length === 0) {
    return null;
  }

  const classNames = [];
  if (hasFixedLayout) classNames.push('has-fixed-layout');
  if (hasStripes) classNames.push('has-stripes');
  const classAttr = classNames.length > 0 ? ` class="${classNames.join(' ')}"` : '';

  let tableHTML = '';

  // Create header if specified
  if (hasHeader && data.length > 0) {
    tableHTML += '<thead><tr>';
    data[0].forEach(cellText => {
      tableHTML += `<th>${escapeHTML(cellText)}</th>`;
    });
    tableHTML += '</tr></thead>';
  }

  // Create body
  tableHTML += '<tbody>';
  const startIndex = hasHeader ? 1 : 0;

  data.slice(startIndex).forEach(row => {
    tableHTML += '<tr>';
    row.forEach(cellText => {
      tableHTML += `<td>${escapeHTML(cellText)}</td>`;
    });
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody>';

  // Wrap in WordPress block markup
  const blockMarkup = `<!-- wp:table -->
<figure class="wp-block-table"><table${classAttr}>${tableHTML}</table></figure>
<!-- /wp:table -->`;

  return blockMarkup;
};

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHTML = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Format WordPress block markup with indentation
 * @param {string} markup - Raw markup string
 * @returns {string} Formatted markup string
 */
const formatWPMarkup = (markup) => {
  const tab = '  ';
  let formatted = '';
  let indent = 0;
  
  // Split on tag boundaries
  const parts = markup.split(/(<[^>]+>)/g).filter(part => part.trim());
  
  parts.forEach(part => {
    if (!part.trim()) return;
    
    // WordPress comment tags
    if (part.startsWith('<!--')) {
      formatted += part + '\n';
      return;
    }
    
    // Closing tags
    if (part.match(/^<\/(figure|table|thead|tbody|tr)>/)) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + part;
      // Add newline after major closing tags
      if (part.match(/^<\/(figure|table|thead|tbody)>/)) {
        formatted += '\n';
      }
      return;
    }
    
    // Opening tags
    if (part.match(/^<(figure|table|thead|tbody|tr)[\s>]/)) {
      formatted += tab.repeat(indent) + part;
      indent++;
      // Add newline after major opening tags
      if (part.match(/^<(figure|table|thead|tbody)[\s>]/)) {
        formatted += '\n';
      }
      return;
    }
    
    // Cell tags and content (keep inline)
    formatted += part;
  });
  
  return formatted.trim();
};

/**
 * Create a code block element with copy functionality
 * @param {string} markup - WordPress block markup to display
 * @returns {HTMLElement} Code container with copy button
 */
const createCodeOutput = (markup) => {
  const container = document.createElement('div');
  container.className = 'wp-code-container';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = formatWPMarkup(markup);
  pre.appendChild(code);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'wp-copy-button';
  copyButton.textContent = 'Copy Block Code';

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markup);
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
        copyButton.textContent = 'Copy Block Code';
      }, 2000);
    }
  });

  container.appendChild(copyButton);
  container.appendChild(pre);

  return container;
};

/**
 * Create a preview element showing the rendered table
 * @param {string} markup - WordPress block markup
 * @returns {HTMLElement} Preview container
 */
const createPreview = (markup) => {
  const container = document.createElement('div');
  container.className = 'wp-preview-container';
  
  const title = document.createElement('h3');
  title.textContent = 'Preview';
  title.className = 'wp-preview-title';
  container.appendChild(title);

  // Extract the table HTML from the block markup
  const tableMatch = markup.match(/<figure[^>]*>(.*?)<\/figure>/s);
  if (tableMatch) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tableMatch[1];
    container.appendChild(tempDiv);
  }

  return container;
};

/**
 * Handle form submission and convert CSV to WordPress block table
 * @param {Event} event - Form submit event
 * @param {Object} config - Configuration object
 * @param {string} config.inputSelector - Selector for CSV input field
 * @param {string} config.outputSelector - Selector for output container
 * @param {string} config.previewSelector - Selector for preview container
 * @param {Object} config.tableOptions - Options passed to createWPTableMarkup
 */
const handleWPConversion = (event, config) => {
  event.preventDefault();

  const {
    inputSelector = '[data-wp-input]',
    outputSelector = '[data-wp-output]',
    previewSelector = '[data-wp-preview]',
    tableOptions = {}
  } = config;

  const form = event.target;
  const input = form.querySelector(inputSelector);
  const output = document.querySelector(outputSelector);
  const preview = document.querySelector(previewSelector);

  if (!input || !output) {
    console.error('WP converter: Required elements not found');
    return;
  }

  const csvText = input.value;

  if (!csvText.trim()) {
    output.innerHTML = '<p class="wp-error">Please enter CSV data</p>';
    if (preview) preview.innerHTML = '';
    return;
  }

  try {
    const parsedData = parseCSV(csvText);
    const markup = createWPTableMarkup(parsedData, tableOptions);

    if (markup) {
      const codeBlock = createCodeOutput(markup);
      output.innerHTML = '';
      output.appendChild(codeBlock);

      // Generate preview if container exists
      if (preview) {
        const previewBlock = createPreview(markup);
        preview.innerHTML = '';
        preview.appendChild(previewBlock);
      }
    } else {
      output.innerHTML = '<p class="wp-error">No valid data to display</p>';
      if (preview) preview.innerHTML = '';
    }
  } catch (error) {
    console.error('WP conversion error:', error);
    output.innerHTML = '<p class="wp-error">Error processing CSV data</p>';
    if (preview) preview.innerHTML = '';
  }
};

/**
 * Initialize WordPress block converter on form(s)
 * @param {Object} config - Configuration object
 * @param {string} config.formSelector - Selector for form element(s)
 */
const initWPConverter = (config = {}) => {
  const { formSelector = '[data-wp-form]' } = config;
  const forms = document.querySelectorAll(formSelector);

  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      handleWPConversion(event, config);
    });
  });
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initWPConverter());
} else {
  initWPConverter();
}

// Export for manual initialization or configuration
window.WPBlockConverter = {
  init: initWPConverter,
  parse: parseCSV,
  createMarkup: createWPTableMarkup
};