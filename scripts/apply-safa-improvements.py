from pathlib import Path
p=Path('src/main.jsx'); s=p.read_text()
# Add variant/quantity state and helper UI without removing existing functionality.
s=s.replace("function Product({p,add,open}){", "function Product({p,add,open}){const [qty,setQty]=useState(1);const specs=Array.isArray(p.specifications)?p.specifications:[];const sizes=Array.isArray(p.sizes)?p.sizes:[];const [spec,setSpec]=useState(sizes[0]||'');return <article className=\"product\">", 1) if "function Product({p,add,open}){" in s and "const [qty,setQty]=useState(1);const specs" not in s else s
# The existing Product implementation is patched through a safer targeted replacement of its add button.
s=s.replace("<button onClick={()=>add(p)}>ADD TO BAG</button>","<div className=\"product-options\"><div className=\"quantity-picker\"><button type=\"button\" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button type=\"button\" onClick={()=>setQty(qty+1)}>+</button></div>{sizes.length>0&&<select value={spec} onChange={e=>setSpec(e.target.value)} aria-label=\"Select size\">{sizes.map(v=><option key={v}>{v}</option>)}</select>}<button onClick={()=>add({...p,quantity:qty,selectedSpecification:spec})}>ADD TO BAG</button></div>")
# Make sure product details support a generic specifications field in the admin form.
s=s.replace("<label>Offer", "<label>Specifications / Options <input name=\"specifications\" placeholder=\"e.g. 30ml, 50ml, Large, Small\"/></label><label>Offer")
s=s.replace("offerTitle:form.offerTitle", "specifications:form.specifications.split(',').map(x=>x.trim()).filter(Boolean),offerTitle:form.offerTitle")
# Add all products section under Exclusive Offers on home.
needle="</section>\n  {page==='products'"
if "ALL PRODUCTS" not in s and needle in s:
    s=s.replace(needle,"</section><section className=\"all-products-home\"><div className=\"sectionhead\"><div><p className=\"eyebrow\">SAFA / COLLECTION</p><h2>All Products</h2></div><button onClick={()=>setPage('products')}>VIEW ALL ↗</button></div><div className=\"productgrid\">{products.map(p=><Product key={p.id} p={p} add={addToCart} open={()=>setSelectedProduct(p)}/>)}</div></section>\n  {page==='products'",1)
# Ensure cart quantity is respected when adding.
s=s.replace("setCart([...cart,p])", "setCart(prev=>{const found=prev.find(x=>x.id===p.id&&x.selectedSpecification===p.selectedSpecification);if(found)return prev.map(x=>x===found?{...x,quantity:(x.quantity||1)+(p.quantity||1)}:x);return [...prev,{...p,quantity:p.quantity||1}]})")
p.write_text(s)
