(function(){
  async function addCategoryImages(){
    const cards=document.querySelectorAll('.category-page-card');
    if(!cards.length)return;
    try{
      const r=await fetch('/api/products',{credentials:'same-origin'});
      if(!r.ok)return;
      const products=await r.json();
      cards.forEach(card=>{
        const name=(card.querySelector('h3')?.textContent||'').trim().toLowerCase();
        const product=Array.isArray(products)?products.find(p=>String(p.category_en||'').trim().toLowerCase()===name&&p.images?.[0]?.url):null;
        if(product?.images?.[0]?.url){
          card.style.backgroundImage=`linear-gradient(180deg,transparent 30%,#211f1bcc 100%),url(${product.images[0].url})`;
          card.classList.add('category-page-image');
        }
      });
    }catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addCategoryImages,{once:true});
  else addCategoryImages();
  new MutationObserver(addCategoryImages).observe(document.documentElement,{childList:true,subtree:true});
})();
