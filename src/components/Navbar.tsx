'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const scrollTo  = (id: string) => { document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); closeMenu(); };

  return (
    <>
      <nav
        id="navbar"
        style={{
          position:'fixed',top:0,width:'100%',zIndex:1000,padding:'0 5%',
          background:'rgba(246,241,233,0.92)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
          borderBottom:`1px solid ${scrolled?'rgba(184,147,90,0.2)':'var(--border)'}`,
          transition:'all 0.3s ease',
        }}
      >
        <div className="nav-inner">
          <a href="#" className="logo">
            <div className="logo-mark"/>
            <span className="logo-text">Vault<span>X</span></span>
          </a>
          <ul className="nav-links">
            <li><a href="#about">About Us</a></li>
            <li><a href="#seasons">Seasons</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
          <div className="nav-actions">
            <button className="btn-ghost"   onClick={() => router.push('/auth/signin')}>Login</button>
            <button className="btn-ghost"   onClick={() => router.push('/auth/signup')}>Sign Up</button>
            <button className="btn-primary" onClick={() => router.push('/auth/signup')}>Get Started</button>
          </div>
          <div className="hamburger" onClick={() => setMenuOpen(o => !o)}>
            <span/><span/><span/>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu${menuOpen?' open':''}`}>
        <a href="#about"   onClick={() => scrollTo('about')}>About Us</a>
        <a href="#seasons" onClick={() => scrollTo('seasons')}>Seasons</a>
        <a href="#contact" onClick={() => scrollTo('contact')}>Contact Us</a>
        <div className="mob-actions">
          <button className="btn-ghost"   onClick={() => { router.push('/auth/signin'); closeMenu(); }}>Login</button>
          <button className="btn-ghost"   onClick={() => { router.push('/auth/signup'); closeMenu(); }}>Sign Up</button>
          <button className="btn-primary" onClick={() => { router.push('/auth/signup'); closeMenu(); }}>Get Started</button>
        </div>
      </div>

      <style jsx>{`
        .nav-inner{max-width:1280px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px}
        .logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .logo-mark{width:32px;height:32px;background:var(--ink);border-radius:var(--radius);position:relative;overflow:hidden}
        .logo-mark::after{content:'';position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:14px;height:1.5px;background:var(--gold);border-radius:2px;box-shadow:0 -5px 0 var(--gold-light),0 -10px 0 var(--cream)}
        .logo-text{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:600;color:var(--ink);letter-spacing:.05em}
        .logo-text span{color:var(--gold)}
        .nav-links{display:flex;align-items:center;gap:36px;list-style:none}
        .nav-links a{text-decoration:none;color:var(--charcoal);font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;position:relative;transition:color .2s}
        .nav-links a::after{content:'';position:absolute;bottom:-3px;left:0;width:0;height:1px;background:var(--gold);transition:width .3s ease}
        .nav-links a:hover{color:var(--gold)}
        .nav-links a:hover::after{width:100%}
        .nav-actions{display:flex;align-items:center;gap:10px}
        .hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px}
        .hamburger span{display:block;width:22px;height:1.5px;background:var(--ink);transition:all .3s}
        .mobile-menu{display:none;position:fixed;top:64px;left:0;width:100%;background:var(--cream);border-bottom:1px solid var(--border);padding:24px 5% 32px;z-index:999;flex-direction:column;gap:0;transform:translateY(-10px);opacity:0;pointer-events:none;transition:all .3s ease}
        .mobile-menu.open{display:flex;opacity:1;pointer-events:all;transform:translateY(0)}
        .mobile-menu a{text-decoration:none;color:var(--ink);font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;padding:14px 0;border-bottom:1px solid var(--border)}
        .mob-actions{display:flex;flex-direction:column;gap:10px;margin-top:20px}
        .mob-actions .btn-ghost,.mob-actions .btn-primary{width:100%;text-align:center;padding:12px}
        @media(max-width:900px){.nav-links,.nav-actions{display:none}.hamburger{display:flex}}
      `}</style>
    </>
  );
}