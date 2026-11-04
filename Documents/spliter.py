import os
import re
from pathlib import Path


def split_combined_js(input_filepath: str, output_dir: str):
    """
    Smartly divides a combined JS file into separate class files.
    Preserves JSDoc comments and #region tags above the class declaration.
    """
    input_path = Path(input_filepath)
    if not input_path.is_file():
        raise ValueError(f"Could not find file: {input_filepath}")

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Regex to catch explicit markers from the previous bundler
    begin_marker = re.compile(r'/\*\s*---\s*Begin:\s*(.+?)\s*---\s*\*/')

    # Regex to catch class declarations (handles optional "export" or spaces)
    class_marker = re.compile(r'^\s*(?:export\s+|default\s+)*class\s+([A-Za-z0-9_]+)\b')

    files = {}
    current_file = "Shared.js"  # Fallback for code at the very top of the file
    current_lines = []

    for line in lines:
        # 1. Check for explicit file boundary marker
        match_begin = begin_marker.search(line)
        if match_begin:
            # Flush the current buffer to the active file
            if current_lines:
                if current_file not in files: files[current_file] = []
                files[current_file].extend(current_lines)

            current_file = match_begin.group(1).strip()
            current_lines = [line]
            continue

        # 2. Check for a Class declaration
        match_class = class_marker.search(line)
        if match_class:
            class_name = match_class.group(1)
            new_file = f"{class_name}.js"

            # Backtrack to capture preceding JSDoc / line comments
            comment_lines = []
            while current_lines:
                last_line = current_lines[-1].strip()

                if not last_line:
                    # Capture blank lines directly above
                    comment_lines.insert(0, current_lines.pop())
                elif last_line.startswith('//'):
                    # Capture single line comments and // #region tags
                    comment_lines.insert(0, current_lines.pop())
                elif last_line == '*/' or last_line.endswith('*/'):
                    # We hit the bottom of a JSDoc block. Keep pulling until /**
                    comment_lines.insert(0, current_lines.pop())
                    while current_lines:
                        prev_line = current_lines.pop()
                        comment_lines.insert(0, prev_line)
                        if prev_line.strip().startswith('/**'):
                            break
                else:
                    # Reached actual executable code. Stop backtracking.
                    break

            # Flush remaining code to the OLD file
            if current_lines:
                if current_file not in files: files[current_file] = []
                files[current_file].extend(current_lines)

            # Switch to the NEW class file
            current_file = new_file

            # Seed the new file with the captured comments + the class declaration
            current_lines = comment_lines + [line]
            continue

        # Normal line of code, just add to the buffer
        current_lines.append(line)

    # End of file reached, flush whatever is left
    if current_lines:
        if current_file not in files: files[current_file] = []
        files[current_file].extend(current_lines)

    # Write everything to disk
    created_count = 0
    for fname, flines in files.items():
        # Skip 'Shared.js' if it's completely empty or just whitespace
        if fname == "Shared.js" and not ''.join(flines).strip():
            continue

        with open(out_path / fname, 'w', encoding='utf-8') as f:
            f.writelines(flines)
        print(f"Created: {fname}")
        created_count += 1

    print(f"\nSuccessfully divided into {created_count} files in '{output_dir}'.")


if __name__ == "__main__":
    # Example usage:
    input_file = r"C:\Users\yurib\Desktop\Shortcuts\jinker\web\js\widgets\DataGrid\DataGridCombined.js"
    output_directory = r"C:\Users\yurib\Desktop\Shortcuts\jinker\web\js\widgets\DataGrid"

    split_combined_js(input_file, output_directory)