import os
import re

dir_path = r'c:\dev\Intern\Intern\web-spa\frontend\src'

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace "Course Name" to "Program Name" or "Program"
    content = content.replace('Course Name', 'Program')
    content = content.replace('Course name', 'Program name')

    # Replace UI occurrences of Course -> Program
    # we want to replace 'Course' only if it's likely a label.
    # cases like >Course<, >Courses<, "Course", "Courses", 'Course', 'Courses'
    # Also in comments, or plain text in JSX
    
    # regex for JSX text nodes: > \s* Course
    content = re.sub(r'>\s*Course\s*<', '>Program<', content)
    content = re.sub(r'>\s*Courses\s*<', '>Programs<', content)
    
    # replace string literals that are just "Course"
    content = re.sub(r'"Course"', '"Program"', content)
    content = re.sub(r'"Courses"', '"Programs"', content)
    content = re.sub(r"'Course'", "'Program'", content)
    content = re.sub(r"'Courses'", "'Programs'", content)

    # replace labels like 'department / course'
    content = re.sub(r'\bCourse\b(?!s|_|-|Id|id|Id|Name|name|Code|code)', 'Program', content)
    content = re.sub(r'\bCourses\b(?!_|-|Id|id)', 'Programs', content)

    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {filepath}')

for root, dirs, files in os.walk(dir_path):
    for filename in files:
        if filename.endswith(('.tsx', '.ts')):
            replace_in_file(os.path.join(root, filename))
