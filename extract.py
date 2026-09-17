import os
import re

SOURCE_FILE = r"c:\mes applications\pro_racing\PRO_RACING_STATS_SOURCE.txt"
BASE_DIR = r"c:\mes applications\pro_racing"

def fix_path(path):
    path = path.strip()
    if path.startswith("frontend(tabs)"):
        return path.replace("frontend(tabs)", "frontend/app/(tabs)")
    elif path.startswith("frontend+"):
        return path.replace("frontend+", "frontend/app/+")
    elif path.startswith("frontend_"):
        return path.replace("frontend_", "frontend/app/_")
    elif path.startswith("frontend") and not path.startswith("frontend/") and path.endswith(".tsx"):
        return path.replace("frontend", "frontend/app/")
    return path

def main():
    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    current_file = None
    current_content = []
    
    for line in lines:
        if line.startswith("# FICHIER: "):
            if current_file:
                # Write the previous file
                file_path = os.path.join(BASE_DIR, fix_path(current_file))
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                # Remove the first line if it's '################...' and last empty lines if any
                while current_content and current_content[0].startswith("################"):
                    current_content.pop(0)
                while current_content and current_content[0].strip() == "":
                    current_content.pop(0)
                
                with open(file_path, "w", encoding="utf-8") as out:
                    out.writelines(current_content)
                print(f"Created: {file_path}")
            
            current_file = line.replace("# FICHIER: ", "").strip()
            current_content = []
        else:
            if current_file:
                current_content.append(line)
                
    if current_file:
        file_path = os.path.join(BASE_DIR, fix_path(current_file))
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        while current_content and current_content[0].startswith("################"):
            current_content.pop(0)
        while current_content and current_content[0].strip() == "":
            current_content.pop(0)
        with open(file_path, "w", encoding="utf-8") as out:
            out.writelines(current_content)
        print(f"Created: {file_path}")

if __name__ == "__main__":
    main()
