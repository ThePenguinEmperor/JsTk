import os
from pathlib import Path


def combine_js_files(target_dir: str, ignore_list: list = None) -> Path:
    """
    Combines all .js files in a directory into a single {folderName}Combined.js file.

    :param target_dir: The path to the directory containing the JS files.
    :param ignore_list: A list of filenames (e.g., ['test.js', 'draft.js']) to exclude.
    :return: The Path object of the newly created combined file.
    """
    ignore_set = set(ignore_list) if ignore_list else set()
    target_path = Path(target_dir).resolve()

    if not target_path.is_dir():
        raise ValueError(f"The path '{target_dir}' is not a valid directory.")

    # Determine output filename based on the folder name
    folder_name = target_path.name
    output_filename = f"{folder_name}Combined.js"
    output_path = target_path / output_filename

    # Crucial: Always ignore the output file so it doesn't try to read itself
    ignore_set.add(output_filename)

    combined_count = 0

    # Open output file once, write incrementally
    with open(output_path, 'w', encoding='utf-8') as outfile:
        # Iterate over all .js files in the directory (flat, non-recursive)
        for js_file in target_path.glob('*.js'):
            if js_file.name in ignore_set:
                continue

            # Add a visual separator for easier debugging in the combined file
            outfile.write(f"\n/* --- Begin: {js_file.name} --- */\n\n")

            # Read line-by-line (generator) to keep memory footprint near zero
            with open(js_file, 'r', encoding='utf-8') as infile:
                for line in infile:
                    outfile.write(line)

            # Ensure the file ends with a newline to prevent syntax collisions
            # (e.g., avoiding variable declarations bleeding into the next file)
            outfile.write("\n")
            combined_count += 1

    print(f"Successfully combined {combined_count} files into {output_filename}")
    return output_path


if __name__ == "__main__":
    # Example usage:
    # Change this path to match your project directory
    js_directory = r"C:\Users\yurib\Desktop\Shortcuts\jinker\web\js\widgets\DataGrid"

    # Add any files you don't want bundled
    files_to_skip = ["tester.js"]

    combine_js_files(js_directory, ignore_list=files_to_skip)