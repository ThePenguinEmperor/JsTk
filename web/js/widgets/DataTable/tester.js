// #region pi_digit_generator
let PI_CACHE_KEY = 'data_table_pi_digits';
let PI_CACHE_DATE_KEY = 'data_table_pi_date';

function get_pi_digits(count) {
    let cached = localStorage.getItem(PI_CACHE_KEY);
    let cachedDate = localStorage.getItem(PI_CACHE_DATE_KEY);
    if (cached && cachedDate && (Date.now() - parseInt(cachedDate) < 86400000)) {
        let digits = cached.split('').map(Number);
        if (digits.length >= count) return digits;
    }
    let pi_digits = [];
    let q = 1n, r = 0n, t = 1n, k = 1n, n = 3n, l = 3n;
    let decimal_count = 0;
    while (decimal_count < count) {
        if (4n * q + r - t < n * t) {
            pi_digits.push(Number(n));
            decimal_count++;
            if (decimal_count % 100 === 0) {
                console.log(`Computing \u03C0 digits... ${decimal_count} digits ready`);
            }
            let nr = 10n * (r - n * t);
            n = (10n * (3n * q + r)) / t - 10n * n;
            q *= 10n;
            r = nr;
        } else {
            let nr = (2n * q + r) * l;
            let nn = (q * (7n * k) + 2n + r * l) / (t * l);
            q *= k;
            t *= l;
            l += 2n;
            k += 1n;
            n = nn;
            r = nr;
        }
    }
    localStorage.setItem(PI_CACHE_KEY, pi_digits.join(''));
    localStorage.setItem(PI_CACHE_DATE_KEY, Date.now().toString());
    return pi_digits;
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

function nearest_fib(n) {
    let a = 0, b = 1;
    while (b < n) {
        let temp = a + b;
        a = b;
        b = temp;
    }
    if (Math.abs(a - n) <= Math.abs(b - n)) return a;
    else return b;
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

function to_hex_6digit(n) {
    let hex = n.toString(16);
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
// #endregion

// #region column_definitions
function get_columns() {
    return [
        { field: 'number', header: 'Number', sortable: true, filterable: true, width: '80px' },
        { field: 'prime', header: 'Prime', sortable: true, filterable: true, width: '70px',
          renderer: (val) => val ? '\u2705' : '\u274C' },
        { field: 'random_date', header: 'Random Date', sortable: true, filterable: true, width: '110px' },
        { field: 'sqrt', header: '\u221AN', sortable: true, filterable: true, width: '100px' },
        { field: 'nearest_fib', header: 'Nearest Fib', sortable: true, filterable: true, width: '100px' },
        { field: 'hex', header: 'Hex (6 digit)', sortable: true, filterable: true, width: '90px',
          conditional_style: (value) => {
              let r = parseInt(value.slice(1,3), 16) || 0;
              let g = parseInt(value.slice(3,5), 16) || 0;
              let b = parseInt(value.slice(5,7), 16) || 0;
              let brightness = (r*299 + g*587 + b*114) / 255000;
              if (brightness < 0.5) return { color: 'white', backgroundColor: value };
              else return { backgroundColor: value };
          } },
        { field: 'log10', header: 'log\u2081\u2080(N)', sortable: true, filterable: true, width: '90px' },
        { field: 'pi_digit', header: '\u03C0 digit', sortable: true, filterable: true, width: '70px',
          renderer: () => '\u221E' },
        { field: 'factorial', header: 'N! (sci)', sortable: true, filterable: false, width: '120px' },
        { field: 'reciprocal', header: '1/N', sortable: true, filterable: true, width: '80px' },
        { field: 'exp', header: 'e^N', sortable: true, filterable: false, width: '100px' },
        { field: 'letter', header: 'Column Letter', sortable: true, filterable: true, width: '100px',
          conditional_style: (value) => {
              let hasA = value.includes('A');
              let hasZ = value.includes('Z');
              if (hasA && hasZ) return { color: 'purple', fontWeight: 'bold' };
              if (hasA) return { color: 'red' };
              if (hasZ) return { textShadow: '0 0 3px rgba(0,0,0,0.5)' };
              return {};
          } }
    ];
}
// #endregion

// #region data_generation
function generate_data(rows) {
    let data = [];
    let pi_digits_cache = get_pi_digits(rows + 10);
    for (let i = 1; i <= rows; i++) {
        let n = i;
        data.push({
            number: n,
            prime: is_prime(n),
            random_date: get_random_date(n),
            sqrt: Math.sqrt(n).toFixed(4),
            nearest_fib: nearest_fib(n),
            hex: to_hex_6digit(n),
            log10: Math.log10(n).toFixed(6),
            pi_digit: pi_digits_cache[i - 1],
            factorial: factorial_sci(n),
            reciprocal: (1 / n).toExponential(6),
            exp: (Math.exp(n) > 1e100 ? Math.exp(n).toExponential(6) : Math.exp(n).toFixed(2)),
            letter: to_letter_column(i - 1)
        });
    }
    return data;
}
// #endregion

// #region main
document.addEventListener('DOMContentLoaded', function() {
    let columns = get_columns();
    let row_count = 10000;
    console.log('Generating 10,000 rows with interesting data...');
    let data = generate_data(row_count);
    console.log('Data generation complete.');

    function update_row_count(table) {
        let total = table.filtered_data.length;
        let selected = table.selection_manager.get_selected_cells().length;
        let infoEl = document.getElementById('row_count_info');
        if (infoEl) infoEl.innerHTML = `Rows: ${total} | Selected cells: ${selected}`;
    }

    let container = document.getElementById('table_container');
    if (!container) {
        console.error('Container #table_container not found');
        return;
    }

    let table_holder = document.createElement('div');
    table_holder.id = 'data_table_holder';
    table_holder.className = 'data_table_holder';
    table_holder.style.cssText = 'width:100%; height:100%; overflow:hidden;';
    container.appendChild(table_holder);

    let table = new DataTable(table_holder, columns, data, {
        row_height: 35,
        visible_rows: 20,
        sortable: true,
        filterable: true,
        inline_edit: true,
        live_filter: false,
        fit_columns: 'content',
        multi_select: 'cell',
        highlight: 'cell'
    });

    table.options.on_selection_change = () => update_row_count(table);
    table.options.on_data_change = () => {
        update_row_count(table);
        table.align_columns();
    };
    update_row_count(table);

    setTimeout(() => {
        if (table.focus_cell) table.focus_cell(0, 0);
    }, 200);

    let global_search = document.getElementById('global_search');
    if (global_search) {
        global_search.addEventListener('input', (e) => table.set_global_search(e.target.value));
    }

    let exportBtn = document.getElementById('export_csv_btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            let csv = table.export_csv();
            let blob = new Blob([csv], { type: 'text/csv' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'data_table_export.csv';
            a.click();
            URL.revokeObjectURL(url);
            alert('CSV exported');
        });
    }

    let importBtn = document.getElementById('import_csv_btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            let sample_headers = columns.map(c => c.header);
            let sample_rows = [sample_headers.join(',')];
            for (let i = 1; i <= 100; i++) {
                let row_data = generate_data(1)[0];
                let values = columns.map(c => row_data[c.field]);
                sample_rows.push(values.join(','));
            }
            let csv_content = sample_rows.join('\n');
            table.import_csv(csv_content, true);
            alert('Imported 100 sample rows');
            update_row_count(table);
            let globalSearch = document.getElementById('global_search');
            if (globalSearch) globalSearch.value = '';
            table.align_columns();
        });
    }

    let clearFiltersBtn = document.getElementById('clear_filters_btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            table.clear_all_filters();
            let globalSearch = document.getElementById('global_search');
            if (globalSearch) globalSearch.value = '';
        });
    }

    let undoBtn = document.getElementById('undo_btn');
    if (undoBtn) undoBtn.addEventListener('click', () => table.undo());
    let redoBtn = document.getElementById('redo_btn');
    if (redoBtn) redoBtn.addEventListener('click', () => table.redo());

    let addRowBtn = document.getElementById('add_row_btn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            let new_row_data = generate_data(1)[0];
            table.undo_manager.save_state();
            table.raw_data.push(new_row_data);
            table.apply_filters_and_sort();
            update_row_count(table);
            table.align_columns();
        });
    }
});
// #endregion