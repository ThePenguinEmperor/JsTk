// Header
document.oc.object_generate('div', { parent: parent_container, row: 1, col: 1, col_span: 12, id: 'header_advanced', class_name: 'header', text: 'Advanced Website Layout', style: { 'background-color': '#2c3e50', color: 'white', 'text-align': 'center', 'font-size': '28px', padding: '15px', 'border-radius': '5px' } });

// Navigation bar
document.oc.object_generate('div', { parent: parent_container, row: 2, col: 1, col_span: 12, id: 'nav_bar', class_name: 'navigation', text: 'Home | About | Services | Contact', style: { 'background-color': '#34495e', color: 'white', padding: '10px', 'text-align': 'center', 'border-radius': '5px' } });

// Main content area with collapsible sections
document.oc.object_generate('collapsible_section', { parent: parent_container, row: 3, col: 1, col_span: 6, id: 'section_1', class_name: 'collapsible', text: 'About Us', style: { margin: '10px', 'background-color': '#3498db', color: 'white', 'border-radius': '5px' } });
document.oc.object_generate('div', { parent: parent_container, row: 4, col: 1, col_span: 6, parent_id: 'section_1', id: 'about_content', class_name: 'content', text: 'This is the about us content. We are a company dedicated to creating amazing web experiences.', style: { padding: '15px', 'background-color': '#ecf0f1', color: '#2c3e50', 'line-height': '1.5', 'border-radius': '5px' } });

document.oc.object_generate('collapsible_section', { parent: parent_container, row: 3, col: 7, col_span: 6, id: 'section_2', class_name: 'collapsible', text: 'Our Services', style: { margin: '10px', 'background-color': '#e67e22', color: 'white', 'border-radius': '5px' } });
document.oc.object_generate('div', { parent: parent_container, row: 4, col: 7, col_span: 6, parent_id: 'section_2', id: 'services_content', class_name: 'content', text: 'Web Design, Development, SEO, and Marketing services available.', style: { padding: '15px', 'background-color': '#f39c12', color: '#2c3e50', 'line-height': '1.5', 'border-radius': '5px' } });

// Buttons in main area
document.oc.object_generate('button', { parent: parent_container, row: 5, col: 1, col_span: 3, id: 'btn_primary', class_name: 'btn_primary', text: 'Primary Action', style: { 'background-color': '#3498db', color: 'white', padding: '10px', border: 'none', 'border-radius': '5px', cursor: 'pointer' } });
document.oc.object_generate('button', { parent: parent_container, row: 5, col: 4, col_span: 3, id: 'btn_secondary', class_name: 'btn_secondary', text: 'Secondary Action', style: { 'background-color': '#95a5a6', color: 'white', padding: '10px', border: 'none', 'border-radius': '5px', cursor: 'pointer' } });
document.oc.object_generate('button', { parent: parent_container, row: 5, col: 7, col_span: 3, id: 'btn_success', class_name: 'btn_success', text: 'Success Action', style: { 'background-color': '#2ecc71', color: 'white', padding: '10px', border: 'none', 'border-radius': '5px', cursor: 'pointer' } });
document.oc.object_generate('button', { parent: parent_container, row: 5, col: 10, col_span: 3, id: 'btn_danger', class_name: 'btn_danger', text: 'Danger Action', style: { 'background-color': '#e74c3c', color: 'white', padding: '10px', border: 'none', 'border-radius': '5px', cursor: 'pointer' } });

// Popup overlay example (hidden by default)
document.oc.object_generate('popup_overlay', { parent: parent_container, row: 6, col: 1, col_span: 12, id: 'info_popup', class_name: 'popup', text: 'Information Popup', style: { display: 'none' } });
document.oc.object_generate('div', { parent: parent_container, row: 6, col: 1, col_span: 12, parent_id: 'info_popup', id: 'popup_content', class_name: 'popup_content', text: 'This is a popup message that can be shown when needed.', style: { padding: '20px', 'background-color': '#ecf0f1', color: '#2c3e50', 'border-radius': '5px' } });

// Button to show popup
document.oc.object_generate('button', { parent: parent_container, row: 6, col: 5, col_span: 2, id: 'btn_show_popup', class_name: 'btn_info', text: 'Show Info Popup', style: { 'background-color': '#9b59b6', color: 'white', padding: '10px', border: 'none', 'border-radius': '5px', cursor: 'pointer' } });

// Footer
document.oc.object_generate('div', { parent: parent_container, row: 7, col: 1, col_span: 12, id: 'footer_advanced', class_name: 'footer', text: '© 2024 Advanced Website. Built with JsTk.', style: { 'background-color': '#2c3e50', color: 'white', 'text-align': 'center', padding: '15px', 'margin-top': '20px', 'border-radius': '5px' } });