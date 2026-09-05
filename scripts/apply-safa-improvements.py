from pathlib import Path
import re

p=Path('src/main.jsx')
s=p.read_text()

# English-only UI.
s=s.replace("[page,setPage]=useState('home'),[cart,setCart]=useState([]),[lang,setLang]=useState('EN'),[search,setSearch]=useState(''),", "[page,setPage]=useState('home'),[cart,setCart]=useState([]),[search,setSearch]=useState(''),[completedOrder,setCompletedOrder]=useState(null),")
if '[completedOrder,setCompletedOrder]' not in s:
    s=s.replace("[page,setPage]=useState('home'),[cart,setCart]=useState([]),[search,setSearch]=useState(''),", "[page,setPage]=useState('home'),[cart,setCart]=useState([]),[search,setSearch]=useState(''),[completedOrder,setCompletedOrder]=useState(null),")
s=s.replace(" const ar=lang==='AR';\n",'')
s=re.sub(r'\n const t=ar\?.*?;',"\n const t={products:'Products',categories:'Categories',offers:'Offers',cart:'Bag',shop:'SHOP COLLECTION'};",s,count=1)
s=s.replace("<div dir={ar?'rtl':'ltr'}>",'<div>')
s=re.sub(r"<button onClick=\{\(\)=>setLang\(ar\?'EN':'AR'\)\}>\{ar\?'EN':'AR'\}</button>",'',s)
s=s.replace('alt="SAFA صفا"','alt="SAFA"').replace('<b>Safa &amp; More</b><span>صفا</span>','<b>Safa &amp; More</b>')
s=s.replace('<small>{p.name_ar}</small>','')
s=s.replace('nameAr:form.nameAr,','nameAr:form.nameEn,').replace('descriptionAr:form.descriptionAr,','descriptionAr:form.descriptionEn,')
s=re.sub(r'[\u0600-\u06ff]+','',s)

# Smart fuzzy search helpers.
if 'const normalizeSearch=' not in s:
    helper="""const normalizeSearch=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9\\s]/g,' ').replace(/\\s+/g,' ').trim();
const editDistance=(a,b)=>{a=normalizeSearch(a);b=normalizeSearch(b);if(!a)return b.length;if(!b)return a.length;const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j]}return prev[b.length]};
const smartScore=(p,q)=>{const query=normalizeSearch(q);if(!query)return 0;const fields=[p.name_en,p.category_en,p.description_en,...(Array.isArray(p.tags)?p.tags:[])].map(normalizeSearch).filter(Boolean);let best=0;for(const text of fields){if(text===query)return 1000;if(text.includes(query))best=Math.max(best,900-query.length);for(const w of text.split(' ')){const d=editDistance(w,query);const max=Math.max(w.length,query.length);if(d<=Math.max(1,Math.floor(max*0.4)))best=Math.max(best,800-d*25-Math.abs(w.length-query.length)*4)}}return best};
const smartSearch=(products,q,includeWeak=false)=>{const query=normalizeSearch(q);if(!query)return products;return products.map(p=>({...p,__score:smartScore(p,query)})).sort((a,b)=>b.__score-a.__score).filter(p=>p.__score>=(includeWeak?250:650)).slice(0,12)};

"""
    s=s.replace('function App(){',helper+'function App(){',1)

# Header search field: replace the existing search button without touching the rest of the header.
old='<button onClick={()=>setSearch(search?\'\':\' \')} aria-label="Search">⌕</button>'
new='<div className="header-search"><span>⌕</span><input aria-label="Search products" placeholder="Search products..." value={search} onChange={e=>{setSearch(e.target.value);setPage(\'products\')}} onKeyDown={e=>{if(e.key===\'Enter\')setPage(\'products\')}}/></div>'
s=s.replace(old,new,1)
s=s.replace("const filtered=useMemo(()=>products.filter(p=>(`${p.name_en} ${p.description_en} ${p.category_en||''}`).toLowerCase().includes(search.toLowerCase())),[products,search]);", "const filtered=useMemo(()=>smartSearch(products,search),[products,search]);")
s=s.replace("{page==='checkout'&&<Checkout cart={cart} setPage={setPage}/>}", "{page==='checkout'&&<Checkout cart={cart} setPage={setPage} products={products} offers={offers} setCompletedOrder={setCompletedOrder}/>}\n  {page==='confirmation'&&completedOrder&&<Confirmation order={completedOrder} products={products} offers={offers} go={setPage}/>} ")

# Replace Listing using stable function boundaries.
start=s.find('function Listing(')
end=s.find('\nfunction Categories',start)
if start>=0 and end>start:
    listing="""function Listing({products,categories,add,open,search,setSearch,title}){const closeMatches=useMemo(()=>smartSearch(products,search,true),[products,search]);return <main className=\"listing\"><div className=\"listingtop\"><div><p className=\"eyebrow\">SAFA / COLLECTION</p><h1>{title}</h1></div><input placeholder=\"Search the ritual...\" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className=\"filters\"><button onClick={()=>setSearch('')}>ALL</button>{categories.map(c=><button key={c.id} onClick={()=>setSearch(c.name_en)}>{c.name_en.toUpperCase()}</button>)}</div>{!products.length&&search?<div className=\"search-empty panel\"><h2>Product not found.</h2><p>We could not find that exact product, but we have some similar options you may like.</p>{closeMatches.length?<div className=\"productgrid\">{closeMatches.map(p=><Product key={p.id} p={p} add={add} open={()=>open(p)}/>)}</div>:<p>No similar products are available right now.</p>}</div>:<div className=\"productgrid\">{products.length?products.map(p=><Product key={p.id} p={p} add={add} open={()=>open(p)}/>):<div className=\"panel\"><p>No products found.</p></div>}</div>}</main>}"""
    s=s[:start]+listing+s[end:]

# Replace Checkout using stable function boundaries.
start=s.find('function Checkout(')
end=s.find('\n\nfunction Admin',start)
if start>=0 and end>start:
    checkout="""const EGYPT_GOVERNORATES=['Cairo','Giza','Alexandria','Qalyubia','Dakahlia','Sharqia','Gharbia','Monufia','Beheira','Kafr El Sheikh','Damietta','Port Said','Ismailia','Suez','North Sinai','South Sinai','Fayoum','Beni Suef','Minya','Assiut','Sohag','Qena','Luxor','Aswan','Red Sea','New Valley','Matrouh'];
function FieldMark({required=false}){return <span className={required?'required-dot':'optional-dot'} aria-hidden=\"true\">•</span>}
function Checkout({cart,setPage,products,offers,setCompletedOrder}){const[error,setError]=useState('');return <main className=\"checkout\"><div className=\"checkoutbox\"><p className=\"eyebrow\">SAFA / CHECKOUT</p><h1>Complete your ritual.</h1><p className=\"field-legend\"><FieldMark required/> Required <FieldMark/> Optional</p><form onSubmit={async e=>{e.preventDefault();setError('');const f=e.currentTarget;const phone1=f.phone1.value.replace(/\\D/g,'');const phone2=f.phone2.value.replace(/\\D/g,'');if(phone1===phone2){setError('The two phone numbers must be different.');return}const data={customerName:f.name.value.trim(),phone1,phone2,governorate:f.governorate.value,address:f.address.value.trim(),buildingNumber:f.building.value.trim(),apartmentNumber:f.apartment.value.trim(),items:cart.map(p=>({productId:p.id,quantity:1}))};const r=await api('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const x=await r.json().catch(()=>({}));if(!r.ok){setError(x.error||'Order could not be placed');return}setCompletedOrder({order:x,purchased:[...cart]});setPage('confirmation')}}><label>Full name <FieldMark required/><input name=\"name\" required autoComplete=\"name\"/></label><label>Phone number <FieldMark required/><input name=\"phone1\" required type=\"tel\" inputMode=\"tel\" autoComplete=\"tel\"/></label><label>Second phone number <FieldMark required/><input name=\"phone2\" required type=\"tel\" inputMode=\"tel\" autoComplete=\"tel-national\"/></label><label>Governorate <FieldMark required/><select name=\"governorate\" required defaultValue=\"\"><option value=\"\" disabled>Select governorate</option>{EGYPT_GOVERNORATES.map(g=><option key={g} value={g}>{g}</option>)}</select></label><label>Address <FieldMark required/><textarea name=\"address\" required autoComplete=\"street-address\"></textarea></label><div className=\"twofields\"><label>Building number <FieldMark/><input name=\"building\" inputMode=\"numeric\"/></label><label>Apartment number <FieldMark/><input name=\"apartment\" inputMode=\"numeric\"/></label></div>{error&&<p className=\"error checkout-error\">{error}</p>}<button className=\"goldbtn\">CONFIRM ORDER ↗</button></form></div></main>}
function Confirmation({order,products,offers,go}){const bought=order.purchased||[];const categories=new Set(bought.map(p=>p.category_id).filter(Boolean));const names=new Set(bought.map(p=>p.id));const related=products.filter(p=>!names.has(p.id)&&p.discount_type!=='none'&&Number(p.discount_value)>0&&(categories.size===0||categories.has(p.category_id))).slice(0,4);const fallback=related.length?related:products.filter(p=>!names.has(p.id)&&p.discount_type!=='none'&&Number(p.discount_value)>0).slice(0,4);return <main className=\"confirmation\"><div className=\"confirmationbox\"><p className=\"eyebrow\">ORDER CONFIRMED</p><h1>Thank you for your order.</h1><p>Your SAFA order <strong>{order.order?.order_number||''}</strong> has been received successfully.</p><button className=\"goldbtn\" onClick={()=>go('home')}>CONTINUE SHOPPING ↗</button></div>{fallback.length>0&&<section className=\"related-offers\"><div className=\"sectionhead\"><div><p className=\"eyebrow\">YOU MAY ALSO LOVE</p><h2>Offers similar to your purchase</h2></div></div><div className=\"productgrid\">{fallback.map(p=><Product key={p.id} p={p} add={()=>{}} open={()=>{}}/>)}</div></section>}</main>}"""
    s=s[:start]+checkout+s[end:]

p.write_text(s)

css=Path('src/mobile.css')
c=css.read_text() if css.exists() else ''
extra='''\n/* Search and checkout polish */\n.header-search{display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(184,134,11,.45);padding:4px 0;min-width:190px}.header-search span{font-size:20px}.header-search input{border:0;background:transparent;outline:0;width:160px;font:inherit;color:inherit}.header-search input::placeholder{opacity:.55}.required-dot{color:#e31b23;text-shadow:0 0 7px rgba(227,27,35,.75);font-size:18px;line-height:1;margin-left:4px}.optional-dot{color:#20a35a;text-shadow:0 0 7px rgba(32,163,90,.65);font-size:18px;line-height:1;margin-left:4px}.field-legend{font-size:12px;opacity:.75;margin-bottom:20px}.checkout-error{margin-top:10px}.checkout select{width:100%;border:0;border-bottom:1px solid rgba(36,36,36,.25);background:transparent;padding:12px 0;font:inherit}.search-empty{margin-top:30px}.confirmation{max-width:1200px;margin:0 auto;padding:100px 5vw}.confirmationbox{text-align:center;padding:70px 30px;border:1px solid rgba(184,134,11,.28);background:rgba(247,245,240,.6)}.related-offers{margin-top:80px}.related-offers .sectionhead{margin-bottom:30px}@media(max-width:700px){.header-search{min-width:0;flex:1}.header-search input{width:100px}.confirmation{padding:60px 20px}.confirmationbox{padding:45px 20px}}\n'''
if '/* Search and checkout polish */' not in c: css.write_text(c+extra)
