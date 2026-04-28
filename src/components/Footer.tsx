'use client';
import { useRouter } from 'next/navigation';

const footerCols = [
  {title:'Platform',links:[{label:'Seasons',href:'#seasons'},{label:'Start Investing',href:'#',action:'signup'},{label:'Referral Programme',href:'#'},{label:'Portfolio Tracker',href:'/dashboard'}]},
  {title:'Company',links:[{label:'About Us',href:'#about'},{label:'Press',href:'#'},{label:'Careers',href:'#'},{label:'Contact',href:'#contact'}]},
  {title:'Legal',links:[{label:'Terms of Service',href:'/terms-of-service'},{label:'Privacy Policy',href:'/privacy-policy'},{label:'Risk Disclosure',href:'#'},{label:'KYC Policy',href:'/kyc'}]},
];

export default function Footer() {
  const router = useRouter();
  return (
    <>
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="logo">
                <div className="logo-mark"/>
                <span className="logo-text">Valut<span>X</span></span>
              </a>
              <p>A structured investment platform operating through seasonal cycles with full transparency and consistent returns since 2024.</p>
            </div>
            {footerCols.map(col=>(
              <div key={col.title} className="footer-col">
                <h5>{col.title}</h5>
                <ul>
                  {col.links.map(link=>(
                    <li key={link.label}>
                      <a href={link.href} onClick={link.action?(e)=>{e.preventDefault();router.push('/signup');}:undefined}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <p>© 2024 ValutX. All rights reserved. Investment returns are not guaranteed.</p>
            <div className="footer-legal">
              <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Risk</a>
            </div>
          </div>
        </div>
      </footer>
      <style jsx>{`
        footer{background:var(--ink);padding:60px 5% 32px;position:relative;z-index:2}
        .footer-inner{max-width:1200px;margin:0 auto}
        .footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.08)}
        .footer-brand .logo{margin-bottom:16px;display:flex;align-items:center;gap:10px;text-decoration:none}
        .footer-brand p{font-size:.78rem;color:rgba(246,241,233,.4);line-height:1.8;font-weight:300;max-width:260px}
        .logo-mark{width:32px;height:32px;background:rgba(255,255,255,.08);border-radius:var(--radius);position:relative;overflow:hidden}
        .logo-mark::after{content:'';position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:14px;height:1.5px;background:var(--gold);border-radius:2px;box-shadow:0 -5px 0 var(--gold-light),0 -10px 0 rgba(246,241,233,.3)}
        .logo-text{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:600;color:var(--cream);letter-spacing:.05em}
        .logo-text span{color:var(--gold)}
        .footer-col h5{font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin-bottom:18px;font-weight:400}
        .footer-col ul{list-style:none;display:flex;flex-direction:column;gap:10px}
        .footer-col a{text-decoration:none;font-size:.78rem;color:rgba(246,241,233,.45);transition:color .2s;cursor:pointer}
        .footer-col a:hover{color:var(--cream)}
        .footer-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .footer-bottom p{font-size:.72rem;color:rgba(246,241,233,.25);letter-spacing:.04em}
        .footer-legal{display:flex;gap:24px}
        .footer-legal a{font-size:.72rem;color:rgba(246,241,233,.25);text-decoration:none;letter-spacing:.04em;transition:color .2s}
        .footer-legal a:hover{color:var(--cream)}
        @media(max-width:900px){.footer-top{grid-template-columns:1fr 1fr;gap:36px}}
        @media(max-width:560px){.footer-top{grid-template-columns:1fr}.footer-bottom{flex-direction:column;align-items:start}}
      `}</style>
    </>
  );
}