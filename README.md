# ObjectCreator

A JavaScript library that provides a Tkinter-like widget system for creating grid-based user interfaces in the browser. This project includes the core ObjectCreator library and a comprehensive tester application for interactive UI component creation.

## Features

- **Grid-based Layout System**: Create responsive grid layouts similar to Tkinter's grid geometry manager
- **Widget Generation**: Easy-to-use API for creating various HTML elements with grid positioning
- **Interactive Tester**: Full-featured testing application for creating and managing UI components
- **CSS Editor Integration**: Built-in CSS editor for styling components
- **Preview System**: Separate preview window for testing layouts
- **Code Management**: Generate and manage code snippets for created components

## Usage

### Basic Usage

1. Include the ObjectCreator script in your HTML:
```html
<script src="ObjectCreator.js"></script>
```

2. Create UI elements using the grid system:
```javascript
// Access the ObjectCreator instance
const oc = document.oc;

// Create a button in a grid layout
const button = oc.object_generate('button', {
    parent: containerElement,
    row: 1,
    col: 1,
    text: 'Click me',
    events: {
        click: () => console.log('Button clicked!')
    }
});
```

### Tester Application

Open `index.html` in your browser to use the interactive tester application, which provides:
- Visual object creation interface
- Grid configuration options
- CSS editing capabilities
- Code generation and preview
- Component management tools

## API Reference

### ObjectCreator Methods

- `object_generate(tag, params)`: Creates an HTML element with grid positioning
- `input(params)`: Creates an input element
- `button(params)`: Creates a button element
- `label(params)`: Creates a label element
- `textarea(params)`: Creates a textarea element

### Parameters

- `parent`: Parent element to attach to
- `row`, `col`: Grid position (1-based indexing)
- `sticky`: Grid sticky behavior (similar to Tkinter)
- `rowSpan`, `colSpan`: Span across multiple grid cells
- `id`, `class_name`, `style`: Standard HTML attributes
- `events`: Event handlers object
- `padx`, `pady`: External padding
- `ipadx`, `ipady`: Internal padding

## Installation

No installation required! This is a client-side JavaScript library. Simply:

1. Clone or download the repository
2. Open `index.html` in your web browser to use the tester
3. Include `ObjectCreator.js` in your own projects

## Files

- `ObjectCreator.js` - Core library
- `Tester.js` - Interactive testing application
- `index.html` - Main tester interface
- `CssEditor.js` - CSS editing functionality
- `UIManager.js` - UI management utilities
- `CodeManager.js` - Code generation and management
- `PreviewManager.js` - Preview window handling
- `Tester.css` - Styles for the tester application

## Browser Support

Works in all modern browsers that support:
- ES6 classes
- CSS Grid Layout
- Local Storage API

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**ThePenguinEmperor**

- GitHub: [ThePenguinEmperor](https://github.com/ThePenguinEmperor)

## Contributing

Feel free to open issues or submit pull requests for improvements and bug fixes.