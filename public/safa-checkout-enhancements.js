(function(){
  'use strict';

  const GOVERNORATES=[
    'Cairo','Giza','Alexandria','Qalyubia','Port Said','Suez','Damietta','Dakahlia','Sharqia',
    'Gharbia','Kafr El Sheikh','Beheira','Monufia','Qalyubia','Fayoum','Beni Suef','Minya',
    'Assiut','Sohag','Qena','Luxor','Aswan','Red Sea','New Valley','Matrouh','North Sinai','South Sinai'
  ];

  const UNIQUE_GOVERNORATES=[...new Set(GOVERNORATES)];
  let boundForm=null;
  let submitting=false;

  function esc(v){return String(v??'').replace(/[&<>\"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[s]));}

  function addStyles(){
    if(document.getElementById('safa-checkout-enhancements-css'))return;
    const s=document.createElement('style');s.id='safa-checkout-enhancements-css';
    s.textContent=`
      .safa-shipping-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
      .safa-shipping-fields label{margin:18px 0}
      .safa-shipping-fields select,.safa-shipping-fields input{display:block;width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid #aaa18d;padding:13px 0;outline:none;font:inherit}
      .safa-order-success{position:fixed;inset:0;z-index:2147483646;background:rgba(33,31,27,.38);display:grid;place-items:center;padding:20px}
      .safa-order-success__card{width:min(560px,calc(100vw - 40px));background:#faf8f2;border:1px solid #d8c08a;padding:52px 34px;text-align:center;box-shadow:0 26px 90px rgba(33,31,27,.22)}
      .safa-order-success__eyebrow{font-size:10px;letter-spacing:2px;color:#8b7751;font-weight:600}
      .safa-order-success h2{font:500 48px/1 'Cormorant Garamond',Georgia,serif;color:#211f1b;margin:18px 0 14px}
      .safa-order-success p{font-size:14px;line-height:1.8;color:#6f6a60;margin:0 auto 8px;max-width:430px}
      .safa-order-success__number{font-size:11px;letter-spacing:1.3px;color:#8b7751;margin:16px 0 28px}
      .safa-order-success button{padding:12px 24px!important}
      @media(max-width:700px){.safa-shipping-fields{grid-template-columns:1fr}.safa-order-success__card{padding:42px 24px}.safa-order-success h2{font-size:40px}}
    `;
    document.head.appendChild(s);
  }

  function checkoutRoot(){return document.querySelector('main.checkout');}
  function checkoutForm(){return checkoutRoot()?.querySelector('form');}

  function makeField(labelText,input){
    const label=document.createElement('label');
    label.innerHTML='<span>'+esc(labelText)+'</span>';
    label.appendChild(input);
    return label;
  }

  function ensureGovernorate(form){
    let field=Array.from(form.querySelectorAll('label')).find(l=>/Governorate/i.test(l.textContent||''));
    if(!field)return;
    let current=field.querySelector('input');
    if(!current)return;
    const select=document.createElement('select');
    select.id='safa-governorate';select.name='governorate';select.required=true;
    select.innerHTML='<option value="">Choose governorate</option>'+UNIQUE_GOVERNORATES.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join('');
    current.replaceWith(select);
    field.dataset.safaGovernorate='1';
  }

  function ensureExtraFields(form){
    if(form.querySelector('.safa-shipping-fields'))return;
    const addressField=Array.from(form.querySelectorAll('label')).find(l=>/^Address$/i.test((l.querySelector('span')?.textContent||l.textContent||'').trim()));
    if(!addressField)return;
    const group=document.createElement('div');group.className='safa-shipping-fields';
    const building=document.createElement('input');building.type='text';building.name='buildingNumber';building.id='safa-building';building.required=true;building.autocomplete='address-line2';building.inputMode='numeric';building.placeholder='Building number';
    const floor=document.createElement('input');floor.type='text';floor.name='floorNumber';floor.id='safa-floor';floor.required=true;floor.inputMode='numeric';floor.placeholder='Floor';
    const apartment=document.createElement('input');apartment.type='text';apartment.name='apartmentNumber';apartment.id='safa-apartment';apartment.required=true;apartment.inputMode='numeric';apartment.placeholder='Apartment number';
    group.appendChild(makeField('Building number',building));
    group.appendChild(makeField('Floor',floor));
    group.appendChild(makeField('Apartment number',apartment));
    addressField.insertAdjacentElement('afterend',group);
  }

  function setSubmitting(form,on){
    const button=form.querySelector('button[type="submit"]');
    if(!button)return;
    if(on){button.dataset.safaOriginalText=button.textContent;button.disabled=true;button.textContent='PLACING…'}
    else{button.disabled=false;button.textContent=button.dataset.safaOriginalText||'PLACE ORDER ↗'}
  }

  function showSuccess(orderNumber){
    document.querySelector('.safa-order-success')?.remove();
    const modal=document.createElement('div');modal.className='safa-order-success';
    modal.innerHTML='<div class="safa-order-success__card" role="dialog" aria-modal="true" aria-labelledby="safa-order-success-title"><div class="safa-order-success__eyebrow">SAFA / ORDER CONFIRMED</div><h2 id="safa-order-success-title">Your order has been received.</h2><p>Thank you for choosing SAFA &amp; More. We received your order successfully and will contact you shortly to confirm the details.</p>'+(orderNumber?'<div class="safa-order-success__number">ORDER '+esc(orderNumber)+'</div>':'')+'<button type="button" class="goldbtn" data-safa-success-continue>CONTINUE SHOPPING ↗</button></div>';
    document.body.appendChild(modal);
    modal.querySelector('[data-safa-success-continue]').addEventListener('click',()=>window.location.assign('/'));
  }

  async function submitCheckout(event){
    if(submitting)return;
    event.preventDefault();event.stopImmediatePropagation();
    const form=event.currentTarget;
    if(!form.checkValidity()){form.reportValidity();return;}
    const cart=(()=>{try{const x=JSON.parse(localStorage.getItem('safaCart')||'[]');return Array.isArray(x)?x:[]}catch{return []}})();
    if(!cart.length){showSuccess('');return;}
    submitting=true;setSubmitting(form,true);
    try{
      const payload={
        customerName:String(form.querySelector('input')?.value||'').trim(),
        phone1:String(form.querySelector('input[name="phone1"]')?.value||'').replace(/\D/g,''),
        phone2:String(form.querySelector('input[name="phone2"]')?.value||'').replace(/\D/g,''),
        governorate:String(form.querySelector('#safa-governorate')?.value||''),
        address:String(Array.from(form.querySelectorAll('textarea')).find(x=>x.closest('label'))?.value||'').trim(),
        buildingNumber:String(form.querySelector('#safa-building')?.value||'').trim(),
        floorNumber:String(form.querySelector('#safa-floor')?.value||'').trim(),
        apartmentNumber:String(form.querySelector('#safa-apartment')?.value||'').trim(),
        items:cart.map(p=>({productId:String(p.id),quantity:Number(p.quantity)||1,selectedSpecification:String(p.selectedSpecification||'')}))
      };
      if(!payload.customerName||payload.phone1.length<10||payload.phone2.length<10||!payload.governorate||payload.address.length<5||!payload.buildingNumber||!payload.floorNumber||!payload.apartmentNumber)throw Error('Please complete all required fields.');
      if(payload.phone1===payload.phone2)throw Error('Phone numbers must be different');
      const r=await fetch('/api/orders',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(data.error||'Order could not be placed');
      localStorage.setItem('safaCart','[]');
      showSuccess(data.order_number||'');
    }catch(error){
      let box=form.querySelector('.error');
      if(!box){box=document.createElement('p');box.className='error';form.prepend(box)}
      box.textContent=error?.message||'Order could not be placed';
    }finally{submitting=false;setSubmitting(form,false)}
  }

  function bind(){
    addStyles();
    const form=checkoutForm();
    if(!form||form===boundForm)return;
    boundForm=form;
    ensureGovernorate(form);ensureExtraFields(form);
    form.addEventListener('submit',submitCheckout,true);
  }

  const observer=new MutationObserver(bind);observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',bind);
  setTimeout(bind,100);setTimeout(bind,500);setTimeout(bind,1500);
})();
