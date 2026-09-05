from pathlib import Path
code=Path('scripts/apply-catalog-final2.py').read_text()
code=code.replace(r'\n?function',r'\n+\s*function')
code=code.replace(r'function Cart\([^\n]+\n?const EGYPT_GOVERNORATES',r'function Cart\([^\n]+\n+\s*const EGYPT_GOVERNORATES')
exec(compile(code,'scripts/apply-catalog-final2.py','exec'))
