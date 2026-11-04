// #region constants
const TOTAL_ROWS = 10000;
// #endregion

// #region hash_data_generation
function simple_hash(n) {
    let x = n | 0;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = (x >> 16) ^ x;
    return Math.abs(x) % 1000000;
}

function long_hash(n) {
    let str = n.toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    let base = Math.abs(hash).toString(16).padStart(8, '0');
    return base.repeat(8);
}
// #endregion

// #region helper_functions
function is_prime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

function seeded_random(seed) {
    let s = seed % 2147483647;
    return function() {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function get_random_date(seed) {
    let start = new Date(1992, 6, 4);
    let end = new Date();
    let rng = seeded_random(seed);
    let range = end.getTime() - start.getTime();
    let random_time = start.getTime() + rng() * range;
    return new Date(random_time).toISOString().split('T')[0];
}

function to_hex_6digit(n) {
    let hex = Math.floor(n).toString(16);
    if (hex.length > 6) hex = hex.substring(0, 6);
    else if (hex.length < 6) hex = hex.padStart(6, '0');
    return '#' + hex.toUpperCase();
}

function to_letter_column(n) {
    let result = '';
    n = n + 1;
    while (n > 0) {
        n--;
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26);
    }
    return result;
}

function factorial_sci(n) {
    if (n > 170) return "Infinity";
    let result = 1n;
    for (let i = 2; i <= n; i++) result *= BigInt(i);
    let str = result.toString();
    if (str.length <= 8) return str;
    let exp = str.length - 1;
    let mantissa = str.substring(0, 6);
    return mantissa[0] + "." + mantissa.substring(1) + "e" + exp;
}
// #endregion

// #region column_definitions
function get_columns() {
    return [
        { field: 'index', header: 'Index', sortable: true, filterable: true, width: '80px' },
        { field: 'hash_value', header: 'Hash Value', sortable: true, filterable: true, width: '120px' },
        { field: 'prime', header: 'Prime', sortable: true, filterable: true, width: '70px', type: 'boolean',
          renderer: (val) => val ? '\u2705' : '\u274C' },
        { field: 'random_date', header: 'Random Date', sortable: true, filterable: true, width: '110px' },
        { field: 'sqrt', header: '\u221AN', sortable: true, filterable: true, width: '100px' },
        { field: 'hex', header: 'Hex (6 digit)', sortable: true, filterable: true, width: '90px',
          conditional_style: (value) => {
              if (typeof value !== 'string') value = String(value);
              let r = parseInt(value.slice(1,3), 16) || 0;
              let g = parseInt(value.slice(3,5), 16) || 0;
              let b = parseInt(value.slice(5,7), 16) || 0;
              let brightness = (r*299 + g*587 + b*114) / 255000;
              if (brightness < 0.5) return { color: 'white', backgroundColor: value };
              else return { backgroundColor: value };
          } },
        { field: 'log10', header: 'log\u2081\u2080(N)', sortable: true, filterable: true, width: '90px' },
        { field: 'factorial', header: 'N! (sci)', sortable: true, filterable: false, width: '120px' },
        { field: 'reciprocal', header: '1/N', sortable: true, filterable: true, width: '80px' },
        { field: 'exp', header: 'e^N', sortable: true, filterable: false, width: '100px' },
        { field: 'letter', header: 'Column Letter', sortable: true, filterable: true, width: '100px',
          conditional_style: (value) => {
              if (typeof value !== 'string') value = String(value);
              let hasA = value.includes('A');
              let hasZ = value.includes('Z');
              if (hasA && hasZ) return { color: 'purple', fontWeight: 'bold' };
              if (hasA) return { color: 'red' };
              if (hasZ) return { textShadow: '0 0 3px rgba(0,0,0,0.5)' };
              return {};
          } },
        { field: 'full_hash', header: 'Full Hash', sortable: true, filterable: true, width: '300px' },
        { field: 'creation_timestamp_ms', header: 'Creation Timestamp (ms)', sortable: true, filterable: true, width: '180px' }
    ];
}
// #endregion

// #region loading_overlay
function create_loading_overlay(container) {
    let overlay = document.createElement('div');
    overlay.className = 'data_table_loading_overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="spinner"></div>
        <div class="loading_text">Initializing...</div>
    `;
    container.appendChild(overlay);
    return overlay;
}

function update_loading_overlay(overlay, message) {
    let text_el = overlay.querySelector('.loading_text');
    if (text_el) text_el.textContent = message;
}

function remove_loading_overlay(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}
// #endregion

// #region data_generation
async function generate_all_rows_async(total_rows, progress_callback) {
    let rows = [];
    let chunk_size = 500;
    for (let start = 0; start < total_rows; start += chunk_size) {
        let end = Math.min(start + chunk_size, total_rows);
        for (let i = start; i < end; i++) {
            let hash_val = simple_hash(i);
            let sqrt_val = Math.sqrt(hash_val).toFixed(4);
            let log10_val = hash_val > 0 ? Math.log10(hash_val).toFixed(6) : '0';
            let factorial_val = factorial_sci(i);
            let reciprocal_val = i !== 0 ? (1 / i).toExponential(6) : '\u221E';
            let exp_val;
            if (i > 709) exp_val = '\u221E';
            else exp_val = Math.exp(i) > 1e100 ? Math.exp(i).toExponential(6) : Math.exp(i).toFixed(2);
            let full_hash = long_hash(i);
            let creation_timestamp_ms = Date.now() + i;

            rows.push({
                index: i,
                hash_value: hash_val,
                prime: is_prime(hash_val),
                random_date: get_random_date(hash_val),
                sqrt: sqrt_val,
                hex: to_hex_6digit(hash_val),
                log10: log10_val,
                factorial: factorial_val,
                reciprocal: reciprocal_val,
                exp: exp_val,
                letter: to_letter_column(i),
                full_hash: full_hash,
                creation_timestamp_ms: creation_timestamp_ms
            });
        }
        if (progress_callback) progress_callback(end, total_rows);
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    return rows;
}
// #endregion

// #region initialization
async function init_grid() {
    let container = document.getElementById('table_container');
    if (!container) {
        console.error('Container #table_container not found');
        return;
    }

    let columns = get_columns();
    let info_el = document.getElementById('row_count_info');

    let overlay = create_loading_overlay(container);
    update_loading_overlay(overlay, 'Generating data...');
    if (info_el) info_el.textContent = 'Generating data...';

    let data = await generate_all_rows_async(TOTAL_ROWS, (current, total) => {
        let percent = (current / total * 100).toFixed(2);
        update_loading_overlay(overlay, `Generating data: ${percent}% (${current} / ${total})`);
        if (info_el) info_el.textContent = `Generating: ${percent}%`;
    });

    update_loading_overlay(overlay, 'Creating grid...');
    if (info_el) info_el.textContent = 'Creating grid...';
    container.innerHTML = '';
    let grid = new GridAPI(container, columns, data, {
        row_height: 35,
        filterable: true,
        sortable: true,
        inline_edit: true
    });

    remove_loading_overlay(overlay);

    if (info_el) info_el.textContent = `Ready. ${data.length} rows loaded.`;

    // Global search
    let global_search = document.getElementById('global_search');
    if (global_search) {
        global_search.addEventListener('input', (e) => grid.set_global_filter(e.target.value));
    }

    // Export CSV
    let export_btn = document.getElementById('export_csv_btn');
    if (export_btn) {
        export_btn.addEventListener('click', () => {
            let csv = grid.export_csv();
            let blob = new Blob([csv], { type: 'text/csv' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'hash_data.csv';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Import CSV
    let import_btn = document.getElementById('import_csv_btn');
    if (import_btn) {
        import_btn.addEventListener('click', () => {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = async (e) => {
                let file = e.target.files[0];
                let text = await file.text();
                await grid.import_csv(text, true);
                alert('Imported CSV (replaced current data)');
            };
            input.click();
        });
    }

    // Clear filters
    let clear_filters_btn = document.getElementById('clear_filters_btn');
    if (clear_filters_btn) {
        clear_filters_btn.addEventListener('click', () => {
            grid.clear_all_filters();
            if (global_search) global_search.value = '';
        });
    }

    // Add row
    let add_row_btn = document.getElementById('add_row_btn');
    if (add_row_btn) {
        add_row_btn.addEventListener('click', () => {
            let new_index = grid.model.get_row_count();
            let new_hash = simple_hash(new_index);
            let new_full_hash = long_hash(new_index);
            let new_timestamp = Date.now() + new_index;
            let new_row_data = {
                index: new_index,
                hash_value: new_hash,
                prime: is_prime(new_hash),
                random_date: get_random_date(new_hash),
                sqrt: Math.sqrt(new_hash).toFixed(4),
                hex: to_hex_6digit(new_hash),
                log10: new_hash > 0 ? Math.log10(new_hash).toFixed(6) : '0',
                factorial: factorial_sci(new_index),
                reciprocal: new_index !== 0 ? (1 / new_index).toExponential(6) : '\u221E',
                exp: new_index > 709 ? '\u221E' : (Math.exp(new_index) > 1e100 ? Math.exp(new_index).toExponential(6) : Math.exp(new_index).toFixed(2)),
                letter: to_letter_column(new_index),
                full_hash: new_full_hash,
                creation_timestamp_ms: new_timestamp
            };
            if (typeof grid.add_row === 'function') {
                grid.add_row(new_row_data);
            } else {
                grid.model.raw_data.push(new_row_data);
                grid.model.filtered_data.push(new_row_data);
                grid.update_total_rows();
                grid.scroller.refresh();
            }
            let info_el = document.getElementById('row_count_info');
            if (info_el) info_el.textContent = `Rows: ${grid.model.get_row_count()}`;
        });
    }
}

document.addEventListener('DOMContentLoaded', init_grid);
// #endregion