import React from 'react';

const Icon=({children,label})=><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><title>{label}</title>{children}</svg>;
const InstagramIcon=()=> <Icon label="Instagram"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/></Icon>;
const FacebookIcon=()=> <Icon label="Facebook"><path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.6.4-1 1-1Z"/></Icon>;
const WhatsAppIcon=()=> <Icon label="WhatsApp"><path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.7Z"/><path d="M9 8.5c.2-.4.4-.5.7-.5h.5c.2 0 .4.2.5.5l.7 1.5c.1.3.1.5-.1.7l-.6.7c.7 1.2 1.6 2 2.8 2.6l.7-.6c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.6 0 .3-.1.8-.3 1-.3.4-.8.7-1.3.7-2.7 0-6.3-3.4-7.2-5.9-.2-.6-.2-1.1.1-1.7l.9-1.9Z"/></Icon>;
const TikTokIcon=()=> <Icon label="TikTok"><path d="M14 4v10.2a3.8 3.8 0 1 1-3-3.7"/><path d="M14 4c.6 2 1.9 3.3 4 3.7"/></Icon>;

export default function Footer(){
 return <footer className="footer"><div className="footer-brand"><div className="brand">Safa &amp; More</div></div><div className="socials" aria-label="Social media"><a href="https://www.instagram.com/safa_beauty0" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon/><span className="social-label">Instagram</span></a><a href="https://www.facebook.com/share/1MQzfEhrYw/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon/><span className="social-label">Facebook</span></a><a href="https://wa.me/201044665050" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon/><span className="social-label">01044665050</span></a><a href="https://www.tiktok.com/@safamore" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon/><span className="social-label">TikTok</span></a></div><small className="credit">Designed &amp; Developed by <strong>Amr Abdelhay</strong></small></footer>;
}
