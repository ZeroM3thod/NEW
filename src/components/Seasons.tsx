'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Seasons() {
  const router = useRouter();
  const supabase = createClient();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSeasons() {
      // Card 1 & 2: last two completed
      const { data: completed } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'closed')
        .order('end_date', { ascending: false })
        .limit(2);

      // Card 3: currently running
      const { data: running } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'running')
        .limit(1);

      // Card 4: upcoming/open
      const { data: open } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'open')
        .limit(1);

      const combined = [
        ...(completed || []).reverse(),
        ...(running || []),
        ...(open || [])
      ];
      setSeasons(combined);
      setLoading(false);
    }
    fetchSeasons();
  }, []);

  if (loading) return null;

  return (
    <>
      <section className="seasons" id="seasons">
        <div className="seasons-inner">
          <div className="seasons-header reveal">
            <div>
              <span className="section-label">Investment Seasons</span>
              <h2 className="section-title">Structured cycles,<br/>predictable returns</h2>
            </div>
            {seasons.find(s => s.status === 'open') && (
              <button className="btn-primary" onClick={() => router.push('/signup')}>
                Join {seasons.find(s => s.status === 'open').name}
              </button>
            )}
          </div>
          <div className="seasons-grid reveal">
            {seasons.map((s,i)=>(
              <div key={i} className={`season-card ${s.status === 'open' ? 'active season-card--full' : ''}`}>
                <div className="season-tag">
                  {s.status === 'closed' ? 'Completed' : s.status === 'running' ? 'Running' : 'Now Open · Limited Slots'}
                </div>
                {s.status === 'open' ? (
                  <div className="season4-body">
                    <div>
                      <div className="season-name">{s.name}</div>
                      <div className="season-period">{s.period} · Entries close soon</div>
                      <div className="season-roi">{s.roi_range}</div>
                      <div className="season-roi-label">Projected ROI Range</div>
                    </div>
                    <button className="btn-primary" style={{whiteSpace:'nowrap',padding:'12px 28px'}} onClick={() => router.push('/signup')}>Invest Now</button>
                  </div>
                ) : (
                  <>
                    <div className="season-name">{s.name}</div>
                    <div className="season-period">{s.period}</div>
                    <div className="season-roi">{s.status === 'closed' ? `+${s.final_roi}%` : s.roi_range}</div>
                    <div className="season-roi-label">{s.status === 'closed' ? 'Final ROI' : 'Expected ROI'}</div>
                  </>
                )}
                
                <div className="season-detail" style={s.status === 'open' ? {marginTop:'20px'} : {}}>
                  {s.status === 'open' ? (
                    <>
                      <div className="season-detail-item"><span style={{color:'rgba(246,241,233,.4)'}}>Min. Entry</span><strong>${s.min_entry} USDT</strong></div>
                      <div className="season-detail-item"><span style={{color:'rgba(246,241,233,.4)'}}>Pool Cap</span><strong>${(s.pool_cap/1000000).toFixed(0)}M</strong></div>
                      <div className="season-detail-item"><span style={{color:'rgba(246,241,233,.4)'}}>Duration</span><strong>{s.duration_days} Days</strong></div>
                      <div className="season-detail-item"><span style={{color:'rgba(246,241,233,.4)'}}>Referral Bonus</span><strong>{s.referral_bonus}% / Withdrawal</strong></div>
                    </>
                  ) : (
                    <>
                      <div className="season-detail-item"><span>Total Pool</span><strong>${(s.current_pool/1000000).toFixed(1)}M</strong></div>
                      <div className="season-detail-item"><span>Duration</span><strong>{s.duration_days} Days</strong></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <style jsx>{`
        .seasons{padding:100px 5%}
        .seasons-inner{max-width:1200px;margin:0 auto}
        .seasons-header{display:grid;grid-template-columns:1fr auto;align-items:end;gap:20px;margin-bottom:56px}
        .seasons-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
        .season-card{background:var(--surface);border:1px solid var(--border);padding:36px 28px;position:relative;overflow:hidden;cursor:pointer;transition:all .35s}
        .season-card::after{content:'';position:absolute;inset:0;background:var(--ink);opacity:0;transition:opacity .35s;z-index:0}
        .season-card:hover::after{opacity:.03}
        .season-card>*{position:relative;z-index:1}
        .season-card.active{background:var(--ink);border-color:var(--ink)}
        .season-card.active *{color:var(--cream)!important}
        .season-card.active .season-tag{background:rgba(255,255,255,.1);color:var(--gold-light)!important}
        .season-card.active .season-roi{color:var(--gold-light)!important}
        .season-card--full{grid-column:span 3}
        .season-tag{display:inline-block;font-size:.65rem;letter-spacing:.15em;text-transform:uppercase;padding:4px 10px;border-radius:100px;background:rgba(184,147,90,.1);color:var(--gold);margin-bottom:20px}
        .season-name{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:500;color:var(--ink);margin-bottom:6px}
        .season-period{font-size:.75rem;color:var(--text-secondary);margin-bottom:28px;letter-spacing:.05em}
        .season-roi{font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:300;color:var(--sage);line-height:1;margin-bottom:4px}
        .season-roi-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-secondary);margin-bottom:24px}
        .season-detail{display:flex;justify-content:space-between;padding-top:20px;border-top:1px solid var(--border)}
        .season-card.active .season-detail{border-color:rgba(255,255,255,.1)}
        .season-detail-item span{display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary);margin-bottom:4px}
        .season-detail-item strong{font-size:.9rem;font-weight:500;color:var(--ink)}
        .season4-body{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start}
        @media(max-width:900px){.seasons-grid{grid-template-columns:1fr}.seasons-header{grid-template-columns:1fr}.season-card--full{grid-column:span 1}.season4-body{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}