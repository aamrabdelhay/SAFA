from pathlib import Path
import re
p=Path('src/main.jsx')
s=p.read_text()
pattern=r"\n  <section className=\"all-products-home\">.*?</section>\{page==='products'&&<Listing"
s,n=re.subn(pattern, "\n  {page==='products'&&<Listing", s, count=1, flags=re.S)
if n!=1:
    raise SystemExit('Standalone homepage All Products block not found')
if s.count('className=\"all-products-home\"')!=1:
    raise SystemExit('Expected exactly one All Products homepage section')
p.write_text(s)
print('fixed')
