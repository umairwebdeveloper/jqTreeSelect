<div align="center">

# jqTreeSelect

**A dynamic, searchable, grouped, tree-nesting multi-select jQuery plugin.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![jQuery](https://img.shields.io/badge/jQuery-3.6%2B-blue?logo=jquery)](https://jquery.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.x-purple?logo=bootstrap)](https://getbootstrap.com/)
![Version](https://img.shields.io/badge/version-1.2.0-green)
![Production Ready](https://img.shields.io/badge/production-ready-brightgreen)

[**📖 Documentation**](index.html) · [**🎮 Live Demo**](demo.html)

</div>

---

## ✨ Features

- **Tree-nested options** with parent/child group hierarchy and collapsible branches
- **Flat & grouped modes** — use `<optgroup>` or programmatic `data` objects
- **Multi-select with badges** showing selected count
- **Searchable** dropdown with real-time filtering
- **Expand All / Collapse All** with configurable visibility
- **Select All / Deselect All / Invert Selection** action buttons
- **Disabled state** support — both at widget and individual-option level
- **Programmatic Data Loading** — pass a JSON `data` array instead of `<option>` elements
- **Data-attribute configuration** — set options directly from HTML attributes
- **UMD compatible** — AMD (RequireJS), CommonJS (Node/Webpack), and browser globals
- **jQuery `noConflict`** compatible
- **Auto-init via DOM** — `data-toggle="jqtreeselect"` auto-initialises matching elements
- **Lifecycle events** — `jqtree:change`, `jqtree:open`, `jqtree:close`, `jqtree:reset`
- **Full public API** — `getSelected`, `setSelected`, `reset`, `enable`, `disable`, `refresh`, `destroy`

---

## 📦 Installation

### CDN (Recommended)

Include the plugin **after** jQuery and Bootstrap:

```html
<!-- Dependencies -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">

<!-- jqTreeSelect styles -->
<link rel="stylesheet" href="dist/jq-tree-select.min.css">

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

<!-- jqTreeSelect plugin -->
<script src="dist/jq-tree-select.min.js"></script>
```

### Download

Clone the repository and use files from the `dist/` folder:

```bash
git clone https://github.com/your-username/jqTreeSelect.git
```

| File | Description |
|------|-------------|
| `dist/jq-tree-select.js` | Unminified source (development) |
| `dist/jq-tree-select.min.js` | Minified for production |
| `dist/jq-tree-select.css` | Unminified styles (development) |
| `dist/jq-tree-select.min.css` | Minified styles for production |

---

## 🚀 Quick Start

### HTML Select Element

```html
<select id="mySelect" multiple>
  <optgroup label="Fruits">
    <option value="apple">Apple</option>
    <option value="banana" selected>Banana</option>
    <option value="cherry">Cherry</option>
  </optgroup>
  <optgroup label="Vegetables">
    <option value="carrot">Carrot</option>
    <option value="spinach">Spinach</option>
  </optgroup>
</select>

<script>
  $('#mySelect').jqTreeSelect();
</script>
```

### Data-Attribute Auto-Init (Zero JavaScript)

```html
<select
  data-toggle="jqtreeselect"
  data-layout-placeholder="Choose items..."
  data-search-enabled="true"
  multiple
>
  <option value="1">Option One</option>
  <option value="2">Option Two</option>
</select>
```

---

## ⚙️ Configuration

Options are organized into logical nested groups. Pass them as a single config object:

```javascript
$('#mySelect').jqTreeSelect({

  // --- Layout ---
  layout: {
    placeholder: 'Select options...',  // Placeholder text
    width: '100%',                     // Widget width (CSS value)
    maxHeight: '400px',                // Max dropdown height
    badgeLimit: 3,                     // Max tag badges before count mode
    showCount: true,                   // Show selected count badge
  },

  // --- Actions Bar ---
  actions: {
    showSelectAll: true,               // Show "Select All" button
    showDeselectAll: true,             // Show "Deselect All" button
    showInvert: true,                  // Show "Invert Selection" button
    showExpandAll: false,              // Show "Expand All" button
    showCollapseAll: false,            // Show "Collapse All" button
  },

  // --- Grouping ---
  grouping: {
    collapsible: true,                 // Allow groups to be toggled
    defaultExpanded: true,             // Start with all groups expanded
  },

  // --- Search ---
  search: {
    enabled: true,                     // Enable search box
    placeholder: 'Search...',          // Search input placeholder
    minLength: 1,                      // Min chars before filtering
  },

  // --- Programmatic Data ---
  data: null,                          // JSON data array (see below)

  // --- Callbacks ---
  callbacks: {
    onChange: null,       // function(selectedValues, selectedTexts) {}
    onOpen: null,         // function() {}
    onClose: null,        // function() {}
    onReset: null,        // function() {}
  }
});
```

---

## 📋 Usage Examples

### Basic (No Groups)

```javascript
$('#select1').jqTreeSelect({
  layout: { placeholder: 'Pick a color...' }
});
```

### With Search Disabled

```javascript
$('#select2').jqTreeSelect({
  search: { enabled: false }
});
```

### With Expand / Collapse All Buttons

```javascript
$('#select3').jqTreeSelect({
  actions: {
    showExpandAll: true,
    showCollapseAll: true
  }
});
```

### With onChange Callback

```javascript
$('#select4').jqTreeSelect({
  callbacks: {
    onChange: function(values, texts) {
      console.log('Selected values:', values);
      console.log('Selected labels:', texts);
    }
  }
});
```

### Programmatic Data Loading

Pass a `data` array instead of `<option>` elements. Supports flat, grouped, and nested tree structures:

```javascript
$('#select5').jqTreeSelect({
  data: [
    // Flat option
    { value: 'all', text: 'All Items' },

    // Grouped options
    {
      group: 'Fruits',
      options: [
        { value: 'apple',  text: 'Apple',  selected: true },
        { value: 'banana', text: 'Banana' },
        { value: 'mango',  text: 'Mango',  disabled: true }
      ]
    },

    // Nested tree (group with sub-groups)
    {
      group: 'Regions',
      options: [
        {
          subgroup: 'Asia',
          options: [
            { value: 'pk', text: 'Pakistan' },
            { value: 'in', text: 'India' }
          ]
        },
        {
          subgroup: 'Europe',
          options: [
            { value: 'de', text: 'Germany' },
            { value: 'fr', text: 'France' }
          ]
        }
      ]
    }
  ]
});
```

### Override Global Defaults

```javascript
// Set defaults for ALL instances on the page
$.fn.jqTreeSelect.defaults.layout.placeholder = 'Choose...';
$.fn.jqTreeSelect.defaults.search.enabled = false;
```

---

## 🔧 Public API Methods

```javascript
// Get all currently selected values and labels
var result = $('#mySelect').jqTreeSelect('getSelected');
// Returns: { values: ['v1', 'v2'], texts: ['Label 1', 'Label 2'] }

// Set selected values programmatically
$('#mySelect').jqTreeSelect('setSelected', ['apple', 'banana']);

// Reset to original (page-load) selection
$('#mySelect').jqTreeSelect('reset');

// Disable the entire widget
$('#mySelect').jqTreeSelect('disable');

// Re-enable the widget
$('#mySelect').jqTreeSelect('enable');

// Refresh the widget (re-renders from current <select> DOM state)
$('#mySelect').jqTreeSelect('refresh');

// Remove the plugin and restore original <select>
$('#mySelect').jqTreeSelect('destroy');
```

---

## 📡 Events

All events are namespaced under `jqtree:`:

```javascript
$('#mySelect')
  .on('jqtree:change', function(e, data) {
    console.log('Changed:', data.values, data.texts);
  })
  .on('jqtree:open', function() {
    console.log('Dropdown opened');
  })
  .on('jqtree:close', function() {
    console.log('Dropdown closed');
  })
  .on('jqtree:reset', function() {
    console.log('Selection reset');
  });
```

---

## 🏷️ Data-Attribute Configuration

Configure any option via HTML `data-*` attributes using `layout-`, `search-`, `actions-`, or `grouping-` prefixes:

```html
<select
  data-toggle="jqtreeselect"
  data-layout-placeholder="Choose a country..."
  data-layout-width="300px"
  data-layout-show-count="true"
  data-search-enabled="true"
  data-search-placeholder="Filter countries..."
  data-actions-show-select-all="true"
  data-actions-show-deselect-all="true"
  data-actions-show-expand-all="true"
  data-grouping-collapsible="true"
  data-grouping-default-expanded="false"
  multiple
>
  ...
</select>
```

---

## 📦 Module Support (UMD)

**AMD (RequireJS)**

```javascript
require(['jquery', 'dist/jq-tree-select'], function($) {
  $('#mySelect').jqTreeSelect();
});
```

**CommonJS / Webpack / Browserify**

```javascript
const $ = require('jquery');
require('./dist/jq-tree-select');

$('#mySelect').jqTreeSelect();
```

**noConflict**

```javascript
var jts = $.fn.jqTreeSelect.noConflict();
$.fn.mySelect = jts;
```

---

## 🧩 Dependencies

| Dependency | Version | Required |
|---|---|---|
| [jQuery](https://jquery.com/) | 3.6+ | ✅ Required |
| [Bootstrap](https://getbootstrap.com/) | 5.x | ✅ Required |
| [Font Awesome](https://fontawesome.com/) | 6.x | ✅ Required |

---

## 📁 Project Structure

```
jqTreeSelect/
├── dist/
│   ├── jq-tree-select.js          # Source (unminified, for development)
│   ├── jq-tree-select.min.js      # Minified for production
│   ├── jq-tree-select.css         # Styles (unminified)
│   └── jq-tree-select.min.css     # Minified styles
├── index.html                     # Developer documentation
├── demo.html                      # Interactive demo suite
├── favicon.svg                    # Project favicon
└── README.md                      # This file
```

---

## 🗒️ Changelog

### v1.2.0
- Renamed plugin to `jqTreeSelect`
- Added UMD support (AMD, CommonJS, globals)
- Added `data-toggle="jqtreeselect"` auto-init
- Added `noConflict()` support
- Nested configuration object pattern (`layout`, `actions`, `grouping`, `search`, `callbacks`)
- Full backward compatibility via `_normalizeOptions`

### v1.1.0
- Added programmatic `data` loading
- Disabled state for widget and individual options
- Public API: `enable`, `disable`, `refresh`, `destroy`

### v1.0.0
- Initial release with grouped tree-select, search, and multi-select

---

## 📄 License

Released under the [MIT License](LICENSE).

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

<div align="center">
  Made with ❤️ &nbsp;·&nbsp; <strong>jqTreeSelect v1.2.0</strong>
</div>