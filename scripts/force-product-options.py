from pathlib import Path
p=Path('src/main.jsx'); s=p.read_text()
# Add state to the existing Product component without replacing the component body.
if 'const [qty,setQty]' not in s:
    s=s.replace('function Product({p,add,open}){','function Product({p,add,open}){const [qty,setQty]=useState(1);const specs=Array.isArray(p.specifications)?p.specifications:[];const [spec,setSpec]=useState(specs[0]||\'\');',1)
if 'quantity-picker' not in s:
    s=s.replace('<button onClick={()=>add(p)}>ADD TO BAG</button>','<div className="product-options"><div className="quantity-picker"><button type="button" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button type="button" onClick={()=>setQty(qty+1)}>+</button></div>{specs.length>0&&<select value={spec} onChange={e=>setSpec(e.target.value)} aria-label="Select option">{specs.map(v=><option key={v}>{v}</option>)}</select>}<button onClick={()=>add({...p,quantity:qty,selectedSpecification:spec})}>ADD TO BAG</button></div>')
if 'Specifications / Options' not in s:
    s=s.replace('<label>Offer','<label>Specifications / Options <input name="specifications" placeholder="e.g. 30ml, 50ml, Large, Small"/></label><label>Offer')
if 'specifications:(form.specifications' not in s:
    s=s.replace('offerTitle:form.offerTitle','specifications:(form.specifications||\'\').split(\',\').map(x=>x.trim()).filter(Boolean),offerTitle:form.offerTitle')
if 'all-products-home' not in s:
    i=s.find("{page==='products'")
    if i>=0:
        section='<section className="all-products-home"><div className="sectionhead"><div><p className="eyebrow">SAFA / COLLECTION</p><h2>All Products</h2></div><button onClick={()=>setPage(\'products\')}>VIEW ALL ↗</button></div><div className="productgrid">{products.map(p=><Product key={p.id} p={p} add={addToCart} open={()=>setSelected(p)}/>)}</div></section>'
        s=s[:i]+section+s[i:]
p.write_text(s)
