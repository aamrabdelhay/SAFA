from pathlib import Path
p=Path('src/main.jsx'); s=p.read_text()
# Quantity + specification controls are injected immediately before the existing Add to Bag control.
if 'product-options' not in s:
    s=s.replace("<button onClick={()=>add(p)}>ADD TO BAG</button>","<div className=\"product-options\"><div className=\"quantity-picker\"><button type=\"button\" onClick={()=>setQty(Math.max(1,qty-1))}>−</button><span>{qty}</span><button type=\"button\" onClick={()=>setQty(qty+1)}>+</button></div>{sizes.length>0&&<select value={spec} onChange={e=>setSpec(e.target.value)} aria-label=\"Select size\">{sizes.map(v=><option key={v}>{v}</option>)}</select>}<button onClick={()=>add({...p,quantity:qty,selectedSpecification:spec})}>ADD TO BAG</button></div>")
# Add product options to admin form if not already present.
if 'Specifications / Options' not in s:
    s=s.replace("<label>Offer", "<label>Specifications / Options <input name=\"specifications\" placeholder=\"e.g. 30ml, 50ml, Large, Small\"/></label><label>Offer")
if 'specifications:form.specifications' not in s:
    s=s.replace("offerTitle:form.offerTitle", "specifications:(form.specifications||'').split(',').map(x=>x.trim()).filter(Boolean),offerTitle:form.offerTitle")
# Add All Products below Exclusive Offers without replacing any existing sections.
if 'all-products-home' not in s:
    marker="{page==='products'"
    i=s.find(marker)
    if i>=0:
        section="<section className=\"all-products-home\"><div className=\"sectionhead\"><div><p className=\"eyebrow\">SAFA / COLLECTION</p><h2>All Products</h2></div><button onClick={()=>setPage('products')}>VIEW ALL ↗</button></div><div className=\"productgrid\">{products.map(p=><Product key={p.id} p={p} add={addToCart} open={()=>setSelectedProduct(p)}/>)}</div></section>"
        s=s[:i]+section+s[i:]
# Preserve quantities when adding to bag.
if 'selectedSpecification===p.selectedSpecification' not in s:
    s=s.replace("setCart([...cart,p])", "setCart(prev=>{const found=prev.find(x=>x.id===p.id&&x.selectedSpecification===p.selectedSpecification);if(found)return prev.map(x=>x===found?{...x,quantity:(x.quantity||1)+(p.quantity||1)}:x);return [...prev,{...p,quantity:p.quantity||1}]})")
p.write_text(s)
