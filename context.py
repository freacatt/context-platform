import os

def write_indented(file, content, indent=0):
    file.write('    ' * indent + content + '\n')

def is_relevant_file(filename):
    return filename.endswith(('.js', '.ts', '.json', '.md','.css', ))

def write_project_description(file):
    description = """
    Just use v2 for templates.
    """
    file.write(description)

def search_project_files(root_directory, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        write_project_description(f)
        f.write("\n<project_structure>\n")
        for dirpath, dirnames, filenames in os.walk(root_directory):
            # Exclude .git, venv, staticfiles, and static directories
            dirnames[:] = [d for d in dirnames if d not in ['.git', 'venv', 'staticfiles', 'static', '__pycache__', 'node_modules', 'cache__']]
            relative_path = os.path.relpath(dirpath, root_directory)
            
            relevant_files = [file for file in filenames if is_relevant_file(file)]
            
            if relevant_files:
                indent = len(relative_path.split(os.sep)) - 1

                if relative_path != '.':
                    write_indented(f, f"<{relative_path}>", indent)

                for rel_file in relevant_files:
                    write_indented(f, f"<[{rel_file}]>", indent + 1)
                    try:
                        with open(os.path.join(dirpath, rel_file), 'r', encoding='utf-8') as file:
                            content = file.read()
                            for line in content.splitlines():
                                write_indented(f, line, indent + 2)
                    except Exception as e:
                        write_indented(f, f"Unable to read file: {str(e)}", indent + 2)
                    write_indented(f, f"</[{rel_file}]>", indent + 1)

                if relative_path != '.':
                    write_indented(f, f"</{relative_path}>", indent)
        f.write("</project_structure>\n")

def main():
    current_directory = os.getcwd()
    output_file = os.path.join(current_directory, "project_context.txt")
    search_project_files(current_directory, output_file)
    print(f"Project context has been written to {output_file}")

if __name__ == "__main__":
    main()