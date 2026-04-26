'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import './kyc.css'

/* ── Types ── */
type Country = { name: string; flag: string }
type DocType = 'National ID Card' | 'Driving Licence' | 'Passport' | null

const COUNTRIES: Country[] = [
  {name:'Afghanistan',flag:'🇦🇫'},{name:'Albania',flag:'🇦🇱'},{name:'Algeria',flag:'🇩🇿'},
  {name:'Argentina',flag:'🇦🇷'},{name:'Australia',flag:'🇦🇺'},{name:'Austria',flag:'🇦🇹'},
  {name:'Azerbaijan',flag:'🇦🇿'},{name:'Bahrain',flag:'🇧🇭'},{name:'Bangladesh',flag:'🇧🇩'},
  {name:'Belgium',flag:'🇧🇪'},{name:'Brazil',flag:'🇧🇷'},{name:'Canada',flag:'🇨🇦'},
  {name:'China',flag:'🇨🇳'},{name:'Colombia',flag:'🇨🇴'},{name:'Denmark',flag:'🇩🇰'},
  {name:'Egypt',flag:'🇪🇬'},{name:'Ethiopia',flag:'🇪🇹'},{name:'Finland',flag:'🇫🇮'},
  {name:'France',flag:'🇫🇷'},{name:'Germany',flag:'🇩🇪'},{name:'Ghana',flag:'🇬🇭'},
  {name:'Greece',flag:'🇬🇷'},{name:'Hungary',flag:'🇭🇺'},{name:'India',flag:'🇮🇳'},
  {name:'Indonesia',flag:'🇮🇩'},{name:'Iran',flag:'🇮🇷'},{name:'Iraq',flag:'🇮🇶'},
  {name:'Ireland',flag:'🇮🇪'},{name:'Israel',flag:'🇮🇱'},{name:'Italy',flag:'🇮🇹'},
  {name:'Japan',flag:'🇯🇵'},{name:'Jordan',flag:'🇯🇴'},{name:'Kazakhstan',flag:'🇰🇿'},
  {name:'Kenya',flag:'🇰🇪'},{name:'Kuwait',flag:'🇰🇼'},{name:'Lebanon',flag:'🇱🇧'},
  {name:'Malaysia',flag:'🇲🇾'},{name:'Maldives',flag:'🇲🇻'},{name:'Mexico',flag:'🇲🇽'},
  {name:'Morocco',flag:'🇲🇦'},{name:'Netherlands',flag:'🇳🇱'},{name:'New Zealand',flag:'🇳🇿'},
  {name:'Nigeria',flag:'🇳🇬'},{name:'Norway',flag:'🇳🇴'},{name:'Oman',flag:'🇴🇲'},
  {name:'Pakistan',flag:'🇵🇰'},{name:'Philippines',flag:'🇵🇭'},{name:'Poland',flag:'🇵🇱'},
  {name:'Portugal',flag:'🇵🇹'},{name:'Qatar',flag:'🇶🇦'},{name:'Romania',flag:'🇷🇴'},
  {name:'Russia',flag:'🇷🇺'},{name:'Saudi Arabia',flag:'🇸🇦'},{name:'Singapore',flag:'🇸🇬'},
  {name:'South Africa',flag:'🇿🇦'},{name:'South Korea',flag:'🇰🇷'},{name:'Spain',flag:'🇪🇸'},
  {name:'Sri Lanka',flag:'🇱🇰'},{name:'Sweden',flag:'🇸🇪'},{name:'Switzerland',flag:'🇨🇭'},
  {name:'Thailand',flag:'🇹🇭'},{name:'Turkey',flag:'🇹🇷'},{name:'Ukraine',flag:'🇺🇦'},
  {name:'United Arab Emirates',flag:'🇦🇪'},{name:'United Kingdom',flag:'🇬🇧'},
  {name:'United States',flag:'🇺🇸'},{name:'Uzbekistan',flag:'🇺🇿'},
  {name:'Vietnam',flag:'🇻🇳'},{name:'Yemen',flag:'🇾🇪'},{name:'Zimbabwe',flag:'🇿🇼'},
]

/* ── Step progress fills ── */
const FILL_POS = [0, 25, 50, 75, 100]

export default function KYCPage() {
  const router = useRouter()

  /* ── State ── */
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocType>(null)
  const [countrySearch, setCountrySearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Step 2 form
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [addr1, setAddr1] = useState('')
  const [addr2, setAddr2] = useState('')
  const [city, setCity] = useState('')
  const [stateField, setStateField] = useState('')
  const [zip, setZip] = useState('')

  // Step 2 errors
  const [errors, setErrors] = useState<Record<string,boolean>>({})

  // Step 3 uploads
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [frontDragOver, setFrontDragOver] = useState(false)
  const [backDragOver, setBackDragOver] = useState(false)

  // Step 4 selfie
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [selfieDragOver, setSelfieDragOver] = useState(false)

  // Step 5
  const [refCode, setRefCode] = useState('')
  const [refCopied, setRefCopied] = useState(false)

  /* ── Refs ── */
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const frontFileRef = useRef<HTMLInputElement>(null)
  const backFileRef = useRef<HTMLInputElement>(null)
  const selfieFileRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  /* ── Canvas animation ── */
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    type Candle = { x:number; y:number; w:number; h:number; up:boolean; speed:number; phase:number; wick:number }
    type Line = { pts:{x:number;y:number}[]; speed:number; phase:number; amp:number }
    let candles: Candle[] = [], lines: Line[] = [], W = 0, H = 0, t = 0, animId = 0

    function initCandles() {
      candles = []
      const n = Math.floor(W / 72)
      for (let i = 0; i < n; i++) candles.push({
        x: (i / n) * W + Math.random() * 30,
        y: H * 0.28 + Math.random() * H * 0.5,
        w: 7 + Math.random() * 5,
        h: 16 + Math.random() * 48,
        up: Math.random() > 0.4,
        speed: 0.18 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        wick: 5 + Math.random() * 14,
      })
    }
    function initLines() {
      lines = []
      for (let i = 0; i < 3; i++) {
        const pts: {x:number;y:number}[] = []
        for (let x = 0; x <= W; x += 50) pts.push({ x, y: H * (0.22 + i * 0.24) + Math.random() * 50 })
        lines.push({ pts, speed: 0.1 + i * 0.04, phase: i * 1.3, amp: 12 + i * 6 })
      }
    }
    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      initCandles(); initLines()
    }
    function animate() {
      ctx.clearRect(0, 0, W, H); t += 0.01
      lines.forEach((l, i) => {
        ctx.beginPath()
        l.pts.forEach((p, j) => {
          const y = p.y + Math.sin(t * l.speed + j * 0.3 + l.phase) * l.amp
          j === 0 ? ctx.moveTo(p.x, y) : ctx.lineTo(p.x, y)
        })
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(74,103,65,0.7)' : 'rgba(184,147,90,0.5)'
        ctx.lineWidth = 1; ctx.stroke()
      })
      candles.forEach(c => {
        const bob = Math.sin(t * c.speed + c.phase) * 5
        const x = c.x, y = c.y + bob
        ctx.strokeStyle = 'rgba(28,28,28,1)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x + c.w / 2, y - c.wick); ctx.lineTo(x + c.w / 2, y + c.h + c.wick); ctx.stroke()
        ctx.fillStyle = c.up ? 'rgba(74,103,65,1)' : 'rgba(184,147,90,1)'
        ctx.fillRect(x, y, c.w, c.h); ctx.strokeRect(x, y, c.w, c.h)
      })
      animId = requestAnimationFrame(animate)
    }
    window.addEventListener('resize', resize); resize(); animate()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
  }, [])

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  /* ── Generate ref code when reaching step 5 ── */
  useEffect(() => {
    if (currentStep === 5) {
      setRefCode('VX-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000))
    }
  }, [currentStep])

  /* ── Helpers ── */
  const goToStep = useCallback((n: number) => {
    setCurrentStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const step1Valid = selectedCountry !== null && selectedDoc !== null

  const validateStep2 = () => {
    const newErrors: Record<string,boolean> = {}
    if (!fullName.trim()) newErrors.fullName = true
    if (!dob.trim()) newErrors.dob = true
    if (!docNumber.trim()) newErrors.docNumber = true
    if (!addr1.trim()) newErrors.addr1 = true
    if (!city.trim()) newErrors.city = true
    if (!stateField.trim()) newErrors.state = true
    if (!zip.trim()) newErrors.zip = true
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) goToStep(3)
  }

  const step3Valid = frontPreview !== null && backPreview !== null
  const step4Valid = selfiePreview !== null

  const readFile = (file: File): Promise<string> =>
    new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.readAsDataURL(file) })

  const handleFrontFile = async (file: File) => { setFrontPreview(await readFile(file)) }
  const handleBackFile = async (file: File) => { setBackPreview(await readFile(file)) }
  const handleSelfieFile = async (file: File) => { setSelfiePreview(await readFile(file)) }

  const handleDrop = async (e: React.DragEvent, type: 'front'|'back'|'selfie') => {
    e.preventDefault()
    setFrontDragOver(false); setBackDragOver(false); setSelfieDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    if (type === 'front') handleFrontFile(file)
    else if (type === 'back') handleBackFile(file)
    else handleSelfieFile(file)
  }

  const copyRef = () => {
    navigator.clipboard?.writeText(refCode).catch(() => {})
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  /* ── Progress dot/label helper ── */
  const dotClass = (n: number) => {
    if (n < currentStep) return 'kyc-step-dot done'
    if (n === currentStep) return 'kyc-step-dot active'
    return 'kyc-step-dot'
  }
  const labelClass = (n: number) => {
    if (n < currentStep) return 'kyc-progress-label done'
    if (n === currentStep) return 'kyc-progress-label active'
    return 'kyc-progress-label'
  }

  const CheckSVG = () => (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )

  return (
    <div className="kyc-page-root">
      {/* Grain overlay */}
      <div className="kyc-grain" />

      {/* Canvas */}
      <canvas ref={bgCanvasRef} id="kyc-bg-canvas" />

      {/* Orbs */}
      <div className="kyc-orb kyc-orb-1" />
      <div className="kyc-orb kyc-orb-2" />
      <div className="kyc-orb kyc-orb-3" />

      {/* ── NAVBAR ── */}
      <nav className="kyc-nav">
        <div className="kyc-nav-inner">
          <a href="/profile" className="kyc-logo">
            <div className="kyc-logo-mark" />
            <span className="kyc-logo-text">Vault<span>X</span></span>
          </a>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div className="kyc-nav-badge">
              <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
                <path d="M6 1L1 3v4c0 2.5 2 4.5 5 5 3-.5 5-2.5 5-5V3L6 1z" stroke="#b8935a" strokeWidth="1" strokeLinejoin="round"/>
                <path d="M4 6.5l1.3 1.3L8 5" stroke="#b8935a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              KYC Verification
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN WRAP ── */}
      <div className="kyc-wrap">

        {/* ── PROGRESS ── */}
        <div className="kyc-progress-container fade-in">
          <div className="kyc-prog-header">
            <span className="kyc-prog-title">Verification Progress</span>
            <span className="kyc-prog-pct">{currentStep < 5 ? `Step ${currentStep} of 4` : 'Complete'}</span>
          </div>
          <div className="kyc-progress-steps">
            <div className="kyc-progress-line" />
            <div className="kyc-progress-line-fill" style={{width: FILL_POS[currentStep - 1] + '%'}} />
            {[1,2,3,4,5].map(n => (
              <div key={n} className={dotClass(n)}>
                <span className="dot-num">{n === 5 ? '✓' : n}</span>
                {n < 5 && <span className="dot-check"><CheckSVG /></span>}
              </div>
            ))}
          </div>
          <div className="kyc-progress-labels">
            <span className={labelClass(1)}>Country</span>
            <span className={labelClass(2)}>Details</span>
            <span className={labelClass(3)}>Documents</span>
            <span className={labelClass(4)}>Selfie</span>
            <span className={labelClass(5)}>Review</span>
          </div>
        </div>

        {/* ── KYC CARD ── */}
        <div className="kyc-card fade-in" style={{animationDelay:'.12s'}}>
          <div className="corner-mark tl" /><div className="corner-mark tr" />
          <div className="corner-mark bl" /><div className="corner-mark br" />
          <div className="card-shimmer" />

          {/* ══ STEP 1 ══ */}
          <div className={`kyc-step${currentStep === 1 ? ' active' : ''}`}>
            <div className="step-eyebrow"><span className="step-eyebrow-dot"/>Step 1 of 4</div>
            <h2 className="step-title">Select Country &amp;<br/><em>Document Type</em></h2>
            <p className="step-desc">Choose the country that issued your identity document, then select the type of document you will be using for verification.</p>

            <div className="trust-row">
              {[
                ['Bank-grade Security', <><rect x=".5" y="3.5" width="9" height="6" rx="1" stroke="#9b8e82" strokeWidth=".9"/><path d="M3 3.5V2.5a2 2 0 014 0v1" stroke="#9b8e82" strokeWidth=".9" strokeLinecap="round"/></>],
                ['GDPR Compliant', <><circle cx="5" cy="5" r="4" stroke="#9b8e82" strokeWidth=".9"/><path d="M3.5 5l1.2 1.2L7 3.5" stroke="#9b8e82" strokeWidth=".9" strokeLinecap="round"/></>],
                ['End-to-End Encrypted', <><path d="M5 1L1 3v3c0 2 1.5 3.5 4 4 2.5-.5 4-2 4-4V3L5 1z" stroke="#9b8e82" strokeWidth=".9" strokeLinejoin="round"/></>],
              ].map(([label]) => (
                <div key={label as string} className="trust-badge">
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                    <path d="M5 1L1 3v3c0 2 1.5 3.5 4 4 2.5-.5 4-2 4-4V3L5 1z" stroke="#9b8e82" strokeWidth=".9" strokeLinejoin="round"/>
                  </svg>
                  {label as string}
                </div>
              ))}
            </div>

            <div className="form-group" style={{marginBottom:0}}>
              <label>Issuing Country</label>
            </div>
            <div className="country-select-wrap">
              {!selectedCountry ? (
                <div ref={searchWrapRef}>
                  <div className="search-input-wrap">
                    <span className="search-svg-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="6.5" cy="6.5" r="4.5" stroke="#9b8e82" strokeWidth="1.3"/>
                        <path d="M10 10l3.5 3.5" stroke="#9b8e82" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <input
                      type="text" className="search-input"
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      onFocus={() => setDropdownOpen(true)}
                      autoComplete="off"
                    />
                    {dropdownOpen && (
                      <div className="country-dropdown" ref={dropdownRef}>
                        {filteredCountries.map(c => (
                          <div key={c.name} className="country-option" onClick={() => {
                            setSelectedCountry(c); setCountrySearch(''); setDropdownOpen(false)
                          }}>
                            <span className="country-flag">{c.flag}</span>
                            <span>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="selected-country-display">
                  <div className="selected-left">
                    <span style={{fontSize:'1.2rem'}}>{selectedCountry.flag}</span>
                    <span style={{fontSize:'.9rem',fontWeight:500}}>{selectedCountry.name}</span>
                  </div>
                  <button className="change-link" onClick={() => { setSelectedCountry(null); setCountrySearch('') }}>Change</button>
                </div>
              )}
            </div>

            <div className="form-group" style={{marginBottom:10}}>
              <label style={{marginBottom:12}}>Document Type</label>
              <div className="doc-grid">
                {[
                  { type: 'National ID Card' as DocType, label: 'National ID', svg: <svg width="36" height="26" viewBox="0 0 36 26" fill="none" stroke="#6b6459" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="34" height="24" rx="3"/><circle cx="10" cy="11" r="4"/><path d="M16 9h10M16 13h8M6 19h24"/></svg> },
                  { type: 'Driving Licence' as DocType, label: 'Driving Licence', svg: <svg width="36" height="26" viewBox="0 0 36 26" fill="none" stroke="#6b6459" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="34" height="24" rx="3"/><path d="M5 18l3-7h20l3 7"/><circle cx="10" cy="19" r="2.5"/><circle cx="26" cy="19" r="2.5"/><path d="M12.5 19h11"/><path d="M12 11h8M14 14h4"/></svg> },
                  { type: 'Passport' as DocType, label: 'Passport', svg: <svg width="26" height="34" viewBox="0 0 26 34" fill="none" stroke="#6b6459" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="24" height="32" rx="2"/><circle cx="13" cy="13" r="5"/><path d="M13 8v10M8 13h10"/><path d="M5 24h16M5 27h10"/></svg> },
                ].map(doc => (
                  <div key={doc.type} className={`doc-card${selectedDoc === doc.type ? ' selected' : ''}`} onClick={() => setSelectedDoc(doc.type)}>
                    <div className="doc-card-check">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2 2L8 1" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div className="doc-svg-wrap">{doc.svg}</div>
                    <span className="doc-label">{doc.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {step1Valid && (
              <button className="btn-primary-kyc" onClick={() => goToStep(2)}>
                <span>Continue to Personal Details
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M8 1l5 4-5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            )}

            <div className="security-note" style={{marginTop:14}}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 1L1 3.5V7c0 3 2 5.2 5 6 3-.8 5-3 5-6V3.5L6 1z" stroke="#9b8e82" strokeWidth="1.1" strokeLinejoin="round"/><path d="M3.5 7l2 2 3.5-3.5" stroke="#9b8e82" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Your data is processed under AML/KYC compliance standards and kept strictly confidential
            </div>
          </div>

          {/* ══ STEP 2 ══ */}
          <div className={`kyc-step${currentStep === 2 ? ' active' : ''}`}>
            <div className="step-eyebrow"><span className="step-eyebrow-dot"/>Step 2 of 4</div>
            <h2 className="step-title">Your <em>Personal</em><br/>Information</h2>
            <p className="step-desc">Enter your details exactly as they appear on your chosen identification document. All fields are required unless marked optional.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className={`form-control${errors.fullName ? ' error' : ''}`} value={fullName} onChange={e => { setFullName(e.target.value); setErrors(p => ({...p, fullName: false})) }} placeholder="As on your document"/>
                {errors.fullName && <span className="error-msg show">Please enter your full name</span>}
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" className={`form-control${errors.dob ? ' error' : ''}`} value={dob} onChange={e => { setDob(e.target.value); setErrors(p => ({...p, dob: false})) }}/>
                {errors.dob && <span className="error-msg show">Date of birth is required</span>}
              </div>
            </div>

            <div className="form-group">
              <label>ID Document Number</label>
              <input type="text" className={`form-control${errors.docNumber ? ' error' : ''}`} value={docNumber} onChange={e => { setDocNumber(e.target.value); setErrors(p => ({...p, docNumber: false})) }} placeholder="Document reference number"/>
              <p className="field-tip">Enter the number as printed on your <span>{selectedDoc || 'document'}</span>.</p>
              {errors.docNumber && <span className="error-msg show">Please enter your document number</span>}
            </div>

            <div className="divider-ornament"><span>Address Information</span></div>

            <div className="form-group">
              <label>Address Line 1</label>
              <input type="text" className={`form-control${errors.addr1 ? ' error' : ''}`} value={addr1} onChange={e => { setAddr1(e.target.value); setErrors(p => ({...p, addr1: false})) }} placeholder="House / Flat No., Street Name"/>
              {errors.addr1 && <span className="error-msg show">Please enter your address</span>}
            </div>
            <div className="form-group">
              <label>Address Line 2 <span className="optional">(Optional)</span></label>
              <input type="text" className="form-control" value={addr2} onChange={e => setAddr2(e.target.value)} placeholder="Area, Landmark"/>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input type="text" className={`form-control${errors.city ? ' error' : ''}`} value={city} onChange={e => { setCity(e.target.value); setErrors(p => ({...p, city: false})) }} placeholder="City"/>
                {errors.city && <span className="error-msg show">Required</span>}
              </div>
              <div className="form-group">
                <label>State / Province</label>
                <input type="text" className={`form-control${errors.state ? ' error' : ''}`} value={stateField} onChange={e => { setStateField(e.target.value); setErrors(p => ({...p, state: false})) }} placeholder="State or Province"/>
                {errors.state && <span className="error-msg show">Required</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Zip / Postal Code</label>
                <input type="text" className={`form-control${errors.zip ? ' error' : ''}`} value={zip} onChange={e => { setZip(e.target.value); setErrors(p => ({...p, zip: false})) }} placeholder="Postal Code"/>
                {errors.zip && <span className="error-msg show">Required</span>}
              </div>
              <div className="form-group">
                <label>Country</label>
                <input type="text" className="form-control readonly-field" value={selectedCountry ? `${selectedCountry.flag}  ${selectedCountry.name}` : ''} readOnly/>
              </div>
            </div>

            <div className="gold-divider"/>
            <div className="btn-row">
              <button className="btn-back" onClick={() => goToStep(1)}>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M11 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
              <button className="btn-primary-kyc" style={(!fullName||!dob||!docNumber||!addr1||!city||!stateField||!zip) ? {opacity:.38,cursor:'not-allowed'} : {}} onClick={validateStep2}>
                <span>Continue to Documents
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M8 1l5 4-5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            </div>
          </div>

          {/* ══ STEP 3 ══ */}
          <div className={`kyc-step${currentStep === 3 ? ' active' : ''}`}>
            <div className="step-eyebrow"><span className="step-eyebrow-dot"/>Step 3 of 4</div>
            <h2 className="step-title">Upload Your<br/><em>Document</em></h2>
            <p className="step-desc">Upload clear, well-lit photos of both sides of your <span>{selectedDoc || 'document'}</span>. All four corners must be fully visible.</p>

            {/* Card illustrations */}
            <div className="card-anim-wrap">
              <div className="card-wrap">
                <div className="card-illustration">
                  <div className="card-scan-line"/><div className="card-badge-text">Front</div>
                  <div className="card-chip"/>
                  <div className="card-lines"><div className="card-line"/><div className="card-line"/><div className="card-line"/></div>
                  <div className="card-corner-mark tl"/><div className="card-corner-mark tr"/><div className="card-corner-mark bl"/><div className="card-corner-mark br"/>
                </div>
                <p className="card-anim-label">Front Side</p>
              </div>
              <div className="card-wrap">
                <div className="card-illustration back-card">
                  <div className="card-scan-line delay"/><div className="card-badge-text">Back</div>
                  <div style={{position:'absolute',top:14,left:14,right:14,height:14,background:'var(--ink)',borderRadius:1,opacity:.8}}/>
                  <div className="card-barcode">
                    {Array.from({length:12}).map((_,i)=><div key={i} className="barcode-stripe"/>)}
                  </div>
                  <div className="card-corner-mark tl"/><div className="card-corner-mark tr"/><div className="card-corner-mark bl"/><div className="card-corner-mark br"/>
                </div>
                <p className="card-anim-label">Back Side</p>
              </div>
            </div>

            {/* Upload zones */}
            <div className="upload-grid">
              {/* Front */}
              <div>
                <span className="upload-type-label">Front Side</span>
                <div className={`upload-zone${frontDragOver?' drag-over':''}${frontPreview?' has-file':''}`}
                  onDragOver={e=>{e.preventDefault();setFrontDragOver(true)}}
                  onDragLeave={()=>setFrontDragOver(false)}
                  onDrop={e=>handleDrop(e,'front')}>
                  <input ref={frontFileRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&handleFrontFile(e.target.files[0])}/>
                  {!frontPreview && <>
                    <svg className="upload-svg-icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="4" y="26" width="32" height="10" rx="2" stroke="#b8935a" strokeWidth="1.2"/>
                      <g className="upload-arrow">
                        <path d="M20 24V10" stroke="#b8935a" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M13 17l7-7 7 7" stroke="#b8935a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <circle cx="31" cy="31" r="2" fill="#b8935a" opacity=".4"/>
                    </svg>
                    <p className="upload-label-text">Front of Document</p>
                    <p className="upload-sub-text">Click or drag &amp; drop<br/>JPG, PNG — Max 10MB</p>
                  </>}
                  {frontPreview && <>
                    <img className="upload-preview show" src={frontPreview} alt=""/>
                    <div className="upload-done-row show">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#4a6741" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8L9.5 5.5" stroke="#4a6741" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Uploaded
                    </div>
                    <span className="upload-change show" onClick={e=>{e.stopPropagation();frontFileRef.current?.click()}}>Replace photo</span>
                  </>}
                </div>
              </div>
              {/* Back */}
              <div>
                <span className="upload-type-label">Back Side</span>
                <div className={`upload-zone${backDragOver?' drag-over':''}${backPreview?' has-file':''}`}
                  onDragOver={e=>{e.preventDefault();setBackDragOver(true)}}
                  onDragLeave={()=>setBackDragOver(false)}
                  onDrop={e=>handleDrop(e,'back')}>
                  <input ref={backFileRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&handleBackFile(e.target.files[0])}/>
                  {!backPreview && <>
                    <svg className="upload-svg-icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="4" y="26" width="32" height="10" rx="2" stroke="#b8935a" strokeWidth="1.2"/>
                      <g className="upload-arrow">
                        <path d="M20 24V10" stroke="#b8935a" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M13 17l7-7 7 7" stroke="#b8935a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <circle cx="31" cy="31" r="2" fill="#b8935a" opacity=".4"/>
                    </svg>
                    <p className="upload-label-text">Back of Document</p>
                    <p className="upload-sub-text">Click or drag &amp; drop<br/>JPG, PNG — Max 10MB</p>
                  </>}
                  {backPreview && <>
                    <img className="upload-preview show" src={backPreview} alt=""/>
                    <div className="upload-done-row show">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#4a6741" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8L9.5 5.5" stroke="#4a6741" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Uploaded
                    </div>
                    <span className="upload-change show" onClick={e=>{e.stopPropagation();backFileRef.current?.click()}}>Replace photo</span>
                  </>}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="instructions">
              <div className="instr-header">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b8935a" strokeWidth="1.2"/><path d="M7 6.5v3.5" stroke="#b8935a" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="4.5" r=".7" fill="#b8935a"/></svg>
                Photo Guidelines
              </div>
              <div className="instruction-list">
                <div className="instruction-item"><div className="instr-icon-wrap instr-ok"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l3.5 4L13 1" stroke="#4a6741" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>All four corners of the document must be visible</div>
                <div className="instruction-item"><div className="instr-icon-wrap instr-ok"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l3.5 4L13 1" stroke="#4a6741" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Good lighting — no shadows or glare on the document</div>
                <div className="instruction-item"><div className="instr-icon-wrap instr-no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1l-9 9" stroke="#c0392b" strokeWidth="1.4" strokeLinecap="round"/></svg></div>Do not crop, rotate or edit the image</div>
                <div className="instruction-item"><div className="instr-icon-wrap instr-no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1l-9 9" stroke="#c0392b" strokeWidth="1.4" strokeLinecap="round"/></svg></div>Avoid blurry, pixelated, or low-resolution photos</div>
              </div>
            </div>

            <div className="gold-divider"/>
            <div className="btn-row">
              <button className="btn-back" onClick={() => goToStep(2)}>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M11 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
              {step3Valid && (
                <button className="btn-primary-kyc" onClick={() => goToStep(4)}>
                  <span>Continue to Selfie
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M8 1l5 4-5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </button>
              )}
            </div>
            <div className="security-note">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 1L1 3.5V7c0 3 2 5.2 5 6 3-.8 5-3 5-6V3.5L6 1z" stroke="#9b8e82" strokeWidth="1.1" strokeLinejoin="round"/><path d="M3.5 7l2 2 3.5-3.5" stroke="#9b8e82" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All uploads are encrypted end-to-end with 256-bit AES
            </div>
          </div>

          {/* ══ STEP 4 ══ */}
          <div className={`kyc-step${currentStep === 4 ? ' active' : ''}`}>
            <div className="step-eyebrow"><span className="step-eyebrow-dot"/>Step 4 of 4</div>
            <h2 className="step-title">Upload Your<br/><em>Selfie</em></h2>
            <p className="step-desc">Upload a clear, front-facing photo of your face. Your face should be fully visible, well-lit, and unobstructed.</p>

            <div className={`selfie-zone${selfieDragOver?' drag-over':''}${selfiePreview?' has-file':''}`}
              onDragOver={e=>{e.preventDefault();setSelfieDragOver(true)}}
              onDragLeave={()=>setSelfieDragOver(false)}
              onDrop={e=>handleDrop(e,'selfie')}>
              <input ref={selfieFileRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&handleSelfieFile(e.target.files[0])}/>
              {!selfiePreview && (
                <div className="selfie-face-anim">
                  <svg width="86" height="86" viewBox="0 0 80 80" fill="none">
                    <circle className="face-ring-1" cx="40" cy="40" r="38" stroke="#b8935a" strokeWidth=".8" strokeDasharray="4 6"/>
                    <circle className="face-ring-2" cx="40" cy="40" r="28" stroke="#b8935a" strokeWidth=".8"/>
                    <path className="face-corner" d="M16 26L16 16L26 16" stroke="#b8935a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path className="face-corner" d="M54 16L64 16L64 26" stroke="#b8935a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path className="face-corner" d="M64 54L64 64L54 64" stroke="#b8935a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path className="face-corner" d="M26 64L16 64L16 54" stroke="#b8935a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <circle cx="40" cy="34" r="8" stroke="#9b8e82" strokeWidth="1.3"/>
                    <path d="M22 62c0-10 8-16 18-16s18 6 18 16" stroke="#9b8e82" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              {selfiePreview && <img className="selfie-preview show" src={selfiePreview} alt=""/>}
              <p className="upload-label-text">{selfiePreview ? 'Selfie uploaded successfully' : 'Upload Selfie Photo'}</p>
              {!selfiePreview && <p className="upload-sub-text">Click to upload or drag &amp; drop<br/>Clear, front-facing photo required</p>}
              {selfiePreview && <span className="upload-change show" onClick={e=>{e.stopPropagation();selfieFileRef.current?.click()}}>Retake selfie</span>}
            </div>

            <div className="instructions">
              <div className="instr-header">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b8935a" strokeWidth="1.2"/><path d="M7 6.5v3.5" stroke="#b8935a" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="4.5" r=".7" fill="#b8935a"/></svg>
                Selfie Requirements
              </div>
              <div className="instruction-list">
                <div className="instruction-item"><div className="instr-icon-wrap instr-ok"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l3.5 4L13 1" stroke="#4a6741" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Face must be fully visible and centered</div>
                <div className="instruction-item"><div className="instr-icon-wrap instr-ok"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l3.5 4L13 1" stroke="#4a6741" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Well-lit — no harsh shadows across your face</div>
                <div className="instruction-item"><div className="instr-icon-wrap instr-no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1l-9 9" stroke="#c0392b" strokeWidth="1.4" strokeLinecap="round"/></svg></div>No sunglasses, hats or face coverings</div>
                <div className="instruction-item"><div className="instr-icon-wrap instr-no"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1l-9 9" stroke="#c0392b" strokeWidth="1.4" strokeLinecap="round"/></svg></div>Do not use filters or edited photos</div>
              </div>
            </div>

            <div className="gold-divider"/>
            <div className="btn-row">
              <button className="btn-back" onClick={() => goToStep(3)}>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M11 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
              {step4Valid && (
                <button className="btn-verify" onClick={() => goToStep(5)}>
                  <span>
                    <svg width="13" height="14" viewBox="0 0 13 14" fill="none"><path d="M6.5 1L1 3.5V7c0 3 2 5.5 5.5 6C12 12.5 12 10 12 7V3.5L6.5 1z" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/><path d="M4 7l1.8 1.8 3.7-3.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Submit for Verification
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ══ STEP 5: Review ══ */}
          <div className={`kyc-step${currentStep === 5 ? ' active' : ''}`}>
            <div className="review-wrap">
              <div className="review-shield-anim">
                <div className="shield-ring shield-ring-1"/>
                <div className="shield-ring shield-ring-2"/>
                <div className="shield-ring shield-ring-3"/>
                <div className="shield-svg-center">
                  <svg width="52" height="58" viewBox="0 0 52 58" fill="none">
                    <path d="M26 2L4 11v16c0 14 9 26 22 29 13-3 22-15 22-29V11L26 2z" fill="rgba(184,147,90,0.08)" stroke="#b8935a" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M17 28l6 6 12-12" stroke="#4a6741" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="26" cy="26" r="6.5" stroke="#b8935a" strokeWidth="1.5"/>
                    <path d="M31 31l5 5" stroke="#b8935a" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="shield-scan-line"/>
              </div>

              <div className="timeline-dots">
                {[0,1,2,3].map(i=><div key={i} className="timeline-dot"/>)}
              </div>

              <h2 className="review-title">Verification <em>Under Review</em></h2>
              <p className="review-desc">Your documents have been submitted successfully. Our compliance team will review your application within <strong>24–48 hours</strong>. You will be notified by email once a decision has been made.</p>

              <div className="review-status-cards">
                <div className="rsc">
                  <div className="rsc-icon-wrap"><svg width="16" height="18" viewBox="0 0 16 18" fill="none"><path d="M3 1h7l5 5v11H3V1z" stroke="#b8935a" strokeWidth="1.2" strokeLinejoin="round"/><path d="M10 1v5h5" stroke="#b8935a" strokeWidth="1.2"/><path d="M5 9h6M5 12h5" stroke="#b8935a" strokeWidth="1.1" strokeLinecap="round"/></svg></div>
                  <p className="rsc-label">Documents</p><p className="rsc-status">Submitted</p>
                </div>
                <div className="rsc">
                  <div className="rsc-icon-wrap"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#b8935a" strokeWidth="1.3"/><path d="M11 11l4 4" stroke="#b8935a" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                  <p className="rsc-label">Analysis</p><p className="rsc-status">In Progress</p>
                </div>
                <div className="rsc" style={{borderRight:'none'}}>
                  <div className="rsc-icon-wrap"><svg width="14" height="18" viewBox="0 0 14 18" fill="none"><path d="M1 1h12" stroke="#b8935a" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 17h12" stroke="#b8935a" strokeWidth="1.3" strokeLinecap="round"/><path d="M2 1l5 7 5-7" stroke="#b8935a" strokeWidth="1.2" strokeLinejoin="round"/><path d="M2 17l5-7 5 7" stroke="#b8935a" strokeWidth="1.2" strokeLinejoin="round"/></svg></div>
                  <p className="rsc-label">Decision</p><p className="rsc-status">Pending</p>
                </div>
              </div>

              <div className="review-ref">
                <div>
                  <p className="ref-label">Reference Number</p>
                  <p className="ref-code">{refCode}</p>
                </div>
                <button className="ref-copy-btn" onClick={copyRef}>
                  {refCopied
                    ? <><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 4L11 1" stroke="#b8935a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> Copied</>
                    : <><svg width="13" height="14" viewBox="0 0 13 14" fill="none"><rect x="1" y="4" width="8" height="9" rx="1.2" stroke="#b8935a" strokeWidth="1.1"/><path d="M4 4V2.5A1.5 1.5 0 015.5 1H11a1.5 1.5 0 011.5 1.5V9A1.5 1.5 0 0111 10.5H9.5" stroke="#b8935a" strokeWidth="1.1" strokeLinejoin="round"/></svg> Copy</>
                  }
                </button>
              </div>

              <button className="btn-primary-kyc" onClick={() => router.push('/profile')}>
                <span>
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M11 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Return to Dashboard
                </span>
              </button>

              <div className="security-note" style={{marginTop:20}}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 1L1 3.5V7c0 3 2 5.2 5 6 3-.8 5-3 5-6V3.5L6 1z" stroke="#9b8e82" strokeWidth="1.1" strokeLinejoin="round"/><path d="M3.5 7l2 2 3.5-3.5" stroke="#9b8e82" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Submissions are secured by bank-grade encryption. Keep your reference number for records.
              </div>
            </div>
          </div>

        </div>{/* /kyc-card */}
      </div>{/* /kyc-wrap */}
    </div>
  )
}