"""Builds llms.txt and llms-full.txt from the skills/jinker folder."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = ROOT / 'skills' / 'jinker'
CDN = 'https://cdn.jsdelivr.net/gh/ThePenguinEmperor/JsTk@main/'
SUMMARY = (
    'jinker is a plain JavaScript UI library for browser pages and pywebview frontends. '
    'document.oc places elements in CSS grids like Tkinter grid(); the same call builds ready-made widgets by tag.'
)


def read_text(path):
    return path.read_text(encoding='utf-8').replace('\r\n', '\n')


def strip_front_matter(text):
    return re.sub(r'^---\n.*?\n---\n', '', text, count=1, flags=re.S)


def reference_files():
    return sorted((SKILL_DIR / 'references').glob('*.md'), key=lambda p: p.name.lower())


def build_index():
    lines = ['# jinker', '', '> ' + SUMMARY, '', 'Load the library with one script tag: web/js/Jinker.js (not async, not defer).', '',
             'Everything in one file: ' + CDN + 'llms-full.txt', '', '## Guide', '',
             '- [SKILL.md](' + CDN + 'skills/jinker/SKILL.md): quick start, document.oc essentials, widget list', '', '## References', '']
    for path in reference_files():
        lines.append('- [' + path.stem + '](' + CDN + 'skills/jinker/references/' + path.name + ')')
    return '\n'.join(lines) + '\n'


def build_full():
    parts = ['# jinker full documentation', '', SUMMARY, '', 'Files are served from ' + CDN, '']
    parts.append(strip_front_matter(read_text(SKILL_DIR / 'SKILL.md')).strip())
    for path in reference_files():
        parts += ['', '---', '', '<!-- reference: ' + path.stem + ' -->', '', read_text(path).strip()]
    return '\n'.join(parts) + '\n'


def main():
    (ROOT / 'llms.txt').write_text(build_index(), encoding='utf-8', newline='\n')
    (ROOT / 'llms-full.txt').write_text(build_full(), encoding='utf-8', newline='\n')
    print('wrote llms.txt and llms-full.txt')


if __name__ == '__main__':
    main()
