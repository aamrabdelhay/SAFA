(function(){
  'use strict';
  var fallbackShown=false;
  function isAdminLogin(){return !!document.querySelector('main.admin-clean.login-card form input[type="password"]');}
  function addBackButton(){
    var main=document.querySelector('main.admin-clean.login-card');
    if(!main)return;
    var card=main.querySelector('.login-card');
    var form=card&&card.querySelector('form');
    if(!card||!form||card.querySelector('[data-safa-back-store]'))return;
    var button=document.createElement('button');
    button.type='button';
    button.dataset.safaBackStore='1';
    button.textContent='Back to Store';
    button.addEventListener('click',function(){window.location.assign('/')});
    form.appendChild(button);
  }
  function hideSplash(){
    document.querySelectorAll('.loading-state').forEach(function(el){el.setAttribute('aria-hidden','true')});
  }
  function productContext(){return !!(location.hash.indexOf('#product=')===0||document.querySelector('.product-page-root,.modal'))}
  function showFallback(){
    if(fallbackShown||!productContext())return;
    fallbackShown=true;
    var old=document.querySelector('.safa-crash-fallback');
    if(old)return;
    var wrap=document.createElement('div');
    wrap.className='safa-crash-fallback';
    wrap.innerHTML='<div class="safa-crash-fallback__card"><div class="safa-crash-fallback__eyebrow">SAFA / PRODUCT</div><h1>Product unavailable</h1><p>Something went wrong while opening this product. You can safely return to the store.</p><button type="button" data-safa-crash-back>Back to Store</button></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('[data-safa-crash-back]').addEventListener('click',function(){window.location.assign('/')});
  }
  function scan(){hideSplash();if(isAdminLogin())addBackButton()}
  var observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('error',function(e){if(productContext()){showFallback();e.preventDefault()}},true);
  window.addEventListener('unhandledrejection',function(e){if(productContext()){showFallback();e.preventDefault()}},true);
  document.addEventListener('DOMContentLoaded',scan);
  setTimeout(scan,100);
  setTimeout(scan,500);
  setTimeout(scan,1500);
})();
