(() => {
  const cleanFooter = () => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const walker = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (/Beauty,\s*refined\.?/i.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/Beauty,\s*refined\.?/gi, '');
      }
      node.nodeValue = node.nodeValue
        .replace(/(^|\s)Instagram ↗/g, '$1📷 Instagram ↗')
        .replace(/(^|\s)Facebook ↗/g, '$1ⓕ Facebook ↗')
        .replace(/(^|\s)WhatsApp 01044665050 ↗/g, '$1💬 WhatsApp 01044665050 ↗')
        .replace(/(^|\s)TikTok ↗/g, '$1🎵 TikTok ↗');
    });
  };
  cleanFooter();
  new MutationObserver(cleanFooter).observe(document.body, { childList: true, subtree: true });
})();
