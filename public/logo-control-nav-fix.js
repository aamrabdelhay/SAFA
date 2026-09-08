(function(){
  function moveLogoControl(){
    const admin=document.querySelector('.admin');
    const nav=admin?.querySelector('.adminnav');
    const button=admin?.querySelector('.logo-control-button');
    if(!nav||!button)return;
    const archive=nav.querySelector('[data-safa-archive-nav],.archive-nav-button');
    if(archive)nav.insertBefore(button,archive);
    else nav.appendChild(button);
  }
  const observer=new MutationObserver(moveLogoControl);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',moveLogoControl);
  setTimeout(moveLogoControl,500);
})();
