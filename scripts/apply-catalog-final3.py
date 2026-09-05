from pathlib import Path
code=Path('scripts/apply-catalog-final2.py').read_text()
code=code.replace(r'\n?function',r'\n+\s*function')
exec(compile(code,'scripts/apply-catalog-final2.py','exec'))
