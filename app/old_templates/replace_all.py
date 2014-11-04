import re
import glob
import os

regexes = [
        re.compile(r'(?<=<script src=")(.*?)"'),
        re.compile(r'(?<=<link rel="stylesheet" type="text/css" href=")(.*?)"'),
        re.compile(r'(?<=<script data-main="scripts/main" src=")(.*?)"')]


os.mkdir('jinja')
for filename in glob.glob('*.html'):
    # replace regular script statement with jinja-friendly, url_for statement
    with open(filename) as f:
        content = f.read()
        for script_regex in regexes:
            content = re.sub(script_regex, "{{url_for('static', filename='\g<1>')}}\"", 
            content)
        
        content = re.sub('<script data-main="', '<script data-main="static/', content)

        with open('jinja/' + filename, 'w') as out:
            out.write(content)
