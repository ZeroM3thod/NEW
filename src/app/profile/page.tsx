'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import { createClient } from '@/utils/supabase/client'

/* ── Country codes list ── */
const COUNTRY_CODES = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', dial: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', dial: '+994', flag: '🇦🇿' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia & Herzegovina', dial: '+387', flag: '🇧🇦' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'CF', name: 'Central African Republic', dial: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', dial: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', dial: '+269', flag: '🇰🇲' },
  { code: 'CD', name: 'Congo (DRC)', dial: '+243', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo (Republic)', dial: '+242', flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'CI', name: 'Côte d\'Ivoire', dial: '+225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', dial: '+291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', dial: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', dial: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dial: '+1', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '+996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', dial: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { code: 'MR', name: 'Mauritania', dial: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', dial: '+230', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { code: 'SO', name: 'Somalia', dial: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', dial: '+211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', dial: '+249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', dial: '+597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', dial: '+963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { code: 'TT', name: 'Trinidad & Tobago', dial: '+1', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993', flag: '🇹🇲' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998', flag: '🇺🇿' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
];

/* Helper to parse phone number into dial code and number */
function parsePhoneNumber(phone: string): { dialCode: string; number: string } {
  if (!phone) return { dialCode: '+880', number: '' }
  
  // Find matching dial code from the list
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length)
  for (const country of sortedCodes) {
    if (phone.startsWith(country.dial)) {
      return { dialCode: country.dial, number: phone.slice(country.dial.length) }
    }
  }
  
  // Default fallback
  return { dialCode: '+880', number: phone }
}

/* Helper to get dial code from country name */
function getDialCodeFromCountry(countryName: string): string {
  const found = COUNTRY_CODES.find(c => c.name === countryName)
  return found?.dial || '+880'
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  /* ── State ── */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastCls, setToastCls] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [seeMoreOpen, setSeeMoreOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [profile, setProfile] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  /* form fields */
  const [fName, setFName] = useState('')
  const [fUn, setFUn] = useState('')
  const [fEm, setFEm] = useState('')
  const [fPh, setFPh] = useState('')
  const [fCo, setFCo] = useState('')
  
  /* phone country code */
  const [fDialCode, setFDialCode] = useState('+880')
  const [fPhoneNumber, setFPhoneNumber] = useState('')

  /* ── Refs ── */
  const bgRef = useRef<HTMLCanvasElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('Profile fetch error:', profileError)
        }
        
        if (profileData) {
          setProfile(profileData)
          setFName(`${profileData.first_name} ${profileData.last_name}`)
          setFUn(profileData.username || '')
          setFEm(user.email || '')
          setFPh(profileData.phone_number || '')
          setFCo(profileData.country || '')
          
          // Parse phone number into dial code and number
          const { dialCode, number } = parsePhoneNumber(profileData.phone_number)
          setFDialCode(dialCode)
          setFPhoneNumber(number)
        } else {
          console.warn('No profile found for user:', user.id)
          // Set email at least from auth
          setFEm(user.email || '')
        }

        const { data: referralData } = await supabase
          .from('profiles')
          .select('*')
          .eq('referred_by', user.id)
        
        setReferrals(referralData || [])
      } catch (err) {
        console.error('Profile page fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, supabase])

  /* ── Toast ── */
  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg('✓  ' + msg)
    setToastCls(cls)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3000)
  }, [])

  /* ── BG Canvas ── */
  useEffect(() => {
    const cvs = bgRef.current
    if (!cvs) return
    const cx = cvs.getContext('2d')
    if (!cx) return
    type Candle = {
      x: number
      y: number
      w: number
      h: number
      wick: number
      up: boolean
      spd: number
      ph: number
    }
    type Wave = {
      pts: { x: number; y: number }[]
      spd: number
      ph: number
      amp: number
      color: string
      opa: string
    }
    let W = 0,
      H = 0,
      candles: Candle[] = [],
      waves: Wave[] = [],
      T = 0,
      animId = 0

    const build = () => {
      const count = Math.max(6, Math.floor(W / 50))
      candles = Array.from({ length: count }, (_, i) => ({
        x: (i / count) * W + 14 + Math.random() * 18,
        y: H * 0.2 + Math.random() * H * 0.58,
        w: 8 + Math.random() * 8,
        h: 14 + Math.random() * 70,
        wick: 6 + Math.random() * 20,
        up: Math.random() > 0.42,
        spd: 0.16 + Math.random() * 0.36,
        ph: Math.random() * Math.PI * 2,
      }))
      const pts = Math.ceil(W / 36) + 2
      waves = [0, 1, 2, 3].map((i) => ({
        pts: Array.from({ length: pts }, (_, j) => ({
          x: j * 36,
          y: H * (0.15 + i * 0.22) + Math.random() * 45,
        })),
        spd: 0.11 + i * 0.04,
        ph: i * 1.4,
        amp: 14 + i * 8,
        color: i % 2 === 0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa: i % 2 === 0 ? '0.7)' : '0.55)',
      }))
    }
    const setup = () => {
      W = cvs.width = window.innerWidth
      H = cvs.height = window.innerHeight
      build()
    }
    const draw = () => {
      cx.clearRect(0, 0, W, H)
      T += 0.011
      waves.forEach((w) => {
        cx.beginPath()
        w.pts.forEach((p, j) => {
          const y = p.y + Math.sin(T * w.spd + j * 0.3 + w.ph) * w.amp
          j === 0 ? cx.moveTo(p.x, y) : cx.lineTo(p.x, y)
        })
        cx.strokeStyle = w.color + w.opa
        cx.lineWidth = 1
        cx.stroke()
      })
      candles.forEach((c) => {
        const bob = Math.sin(T * c.spd + c.ph) * 7,
          x = c.x,
          y = c.y + bob
        cx.strokeStyle = 'rgba(28,28,28,0.8)'
        cx.lineWidth = 1
        cx.beginPath()
        cx.moveTo(x + c.w / 2, y - c.wick)
        cx.lineTo(x + c.w / 2, y + c.h + c.wick)
        cx.stroke()
        cx.fillStyle = c.up ? 'rgba(74,103,65,0.88)' : 'rgba(184,147,90,0.82)'
        cx.fillRect(x, y, c.w, c.h)
        cx.strokeRect(x, y, c.w, c.h)
      })
      animId = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', setup)
    setup()
    draw()
    return () => {
      window.removeEventListener('resize', setup)
      cancelAnimationFrame(animId)
    }
  }, [])

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('show')
        })
      },
      { threshold: 0.1 },
    )
    document
      .querySelectorAll<HTMLElement>('.pf-reveal')
      .forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen || seeMoreOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen, seeMoreOpen])

  /* ── ESC ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSeeMoreOpen(false)
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  /* ── Save profile ── */
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showToast('Please sign in again', 'err')
      return
    }
    
    const [firstName, ...lastNameParts] = fName.split(' ')
    const lastName = lastNameParts.join(' ')
    
    // Combine dial code and phone number
    const fullPhone = fPhoneNumber ? `${fDialCode}${fPhoneNumber}` : ''

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        username: fUn,
        phone_number: fullPhone,
        country: fCo
      })
      .eq('id', user.id)

    if (error) {
      showToast(error.message, 'err')
    } else {
      setProfile({ ...profile, first_name: firstName, last_name: lastName, username: fUn, phone_number: fullPhone, country: fCo })
      setFPh(fullPhone)
      showToast('Profile saved successfully', 'ok')
    }
  }

  /* ── Reset form ── */
  const resetForm = () => {
    if (profile) {
      setFName(`${profile.first_name} ${profile.last_name}`)
      setFUn(profile.username || '')
      setFCo(profile.country || '')
      
      // Parse phone number back
      const { dialCode, number } = parsePhoneNumber(profile.phone_number)
      setFDialCode(dialCode)
      setFPhoneNumber(number)
      setFPh(profile.phone_number || '')
    }
    showToast('Changes discarded')
  }

  /* ── Copy referral code ── */
  const copyCode = () => {
    const code = profile?.referral_code || 'VAULT-X'
    const doShow = () => {
      setCopied(true)
      showToast('Referral code copied', 'ok')
      setTimeout(() => setCopied(false), 2500)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(doShow).catch(doShow)
    } else doShow()
  }

  /* ── Scroll to form ── */
  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ── Logout ── */
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  /* ── Referral table data ── */
  const users = [
    {
      i: 'RM',
      name: 'Rafiqul Molla',
      h: '@rafiqul.m',
      p: '+$218.40',
      b: '$1,418.40',
      w: '$980.00',
      s: 'active',
    },
    {
      i: 'SN',
      name: 'Sharmin Nahar',
      h: '@sharmin.n',
      p: '+$134.80',
      b: '$934.80',
      w: '$600.00',
      s: 'active',
    },
    {
      i: 'AH',
      name: 'Aminul Hossain',
      h: '@aminul.h',
      p: '+$89.20',
      b: '$589.20',
      w: '$380.00',
      s: 'pending',
    },
    {
      i: 'FK',
      name: 'Farzana Khanam',
      h: '@farzana.k',
      p: '+$64.50',
      b: '$364.50',
      w: '$200.00',
      s: 'active',
    },
    {
      i: 'MR',
      name: 'Mostafizur R.',
      h: '@mostafiz.r',
      p: '+$112.60',
      b: '$812.60',
      w: '$550.00',
      s: 'active',
    },
    {
      i: 'NB',
      name: 'Nasreen Begum',
      h: '@nasreen.b',
      p: '+$53.00',
      b: '$253.00',
      w: '$150.00',
      s: 'pending',
    },
    {
      i: 'JH',
      name: 'Jahangir Hossain',
      h: '@jahangir.h',
      p: '+$0.00',
      b: '$500.00',
      w: '$0.00',
      s: 'pending',
    },
  ]

  /* ── Lock SVG ── */
  const LockSVG = () => (
    <svg
      width='20'
      height='20'
      fill='none'
      stroke='var(--gold)'
      strokeWidth='2.2'
      strokeLinecap='round'
      strokeLinejoin='round'
      viewBox='0 0 24 24'
    >
      <rect
        x='3'
        y='11'
        width='18'
        height='11'
        rx='2'
        ry='2'
        fill='rgba(184,147,90,0.15)'
      />
      <path d='M7 11V7a5 5 0 0110 0v4' />
    </svg>
  )

  /* ════════════════════════════════════════════════ */
  return (
    <>
      {/* BG Canvas */}
      <canvas
        ref={bgRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.055,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Toast */}
      <div
        className={`pf-toast${toastShow ? ' show' : ''}${toastCls ? ' ' + toastCls : ''}`}
      >
        {toastMsg}
      </div>

      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='pf-layout'>
        {/* ═══ MOBILE TOPBAR ═══ */}
        <div className='pf-topbar'>
          <button className='pf-hamburger' onClick={() => setSidebarOpen(true)}>
            <span />
            <span />
            <span />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className='pf-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='pf-logo-text' style={{ fontSize: '1.15rem' }}>
              Vault<span>X</span>
            </span>
          </div>
          <div
            className='pf-avatar'
            style={{
              width: 32,
              height: 32,
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/profile')}
          >
            RK
          </div>
        </div>

        {/* ═══ MAIN ═══ */}
        <div className='pf-main'>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            {/* HEADING */}
            <div className='pf-reveal' style={{ marginBottom: 24 }}>
              <span className='pf-label'>Account</span>
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 'clamp(1.6rem,4vw,2.2rem)',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1.15,
                }}
              >
                Good morning,
                <br />
                <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>
                  {profile?.first_name || 'User'}
                </em>
              </h1>
            </div>

            {/* HERO CARD */}
            <div
              className='pf-hero-card pf-reveal'
              style={{ transitionDelay: '.05s' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className='pf-avatar-lg'>
                  {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '...'}
                  <div className='pf-online-dot' />
                </div>
              </div>
              <div className='pf-hero-body'>
                <h2 className='pf-hero-name'>{profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}</h2>
                <div className='pf-hero-uid'>
                  @{profile?.username} · Member since {profile ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '...'}
                </div>
                <div className='pf-meta-pills'>
                  <div className='pf-pill'>
                    Balance <strong>${profile?.balance?.toLocaleString() || '0'}</strong>
                  </div>
                  <div className='pf-pill'>
                    ROI <strong>+{profile?.avg_roi || '0'}%</strong>
                  </div>
                  <div className='pf-pill'>
                    Season <strong>{profile?.active_season_id ? 'Active' : 'Not Joined'}</strong>
                  </div>
                  <div className='pf-pill'>
                    Referred <strong>{referrals.length} users</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                <button
                  className='pf-btn-ghost'
                  onClick={scrollToForm}
                >
                  Edit Profile
                </button>
                <button
                  className='pf-btn-danger'
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>

            {/* TWO-COL */}
            <div className='pf-two-col'>
              {/* LEFT COL */}
              <div className='pf-col'>
                {/* PROFILE FORM */}
                <div
                  className='pf-card pf-reveal'
                  ref={formCardRef}
                  style={{ transitionDelay: '.08s' }}
                >
                  <div className='pf-cp' style={{ paddingBottom: 0 }}>
                    <span className='pf-sec-label'>Personal Info</span>
                    <h2
                      className='pf-sec-title'
                      style={{ fontSize: '1.25rem', marginBottom: 22 }}
                    >
                      Edit Profile
                    </h2>
                  </div>
                  <form
                    onSubmit={saveProfile}
                    className='pf-cp'
                    style={{ paddingTop: 0 }}
                  >
                    <div className='pf-form-grid'>
                      <div className='pf-fg'>
                        <label className='pf-fl' htmlFor='pf-fn'>
                          Full Name
                        </label>
                        <input
                          className='pf-fi'
                          type='text'
                          id='pf-fn'
                          value={fName}
                          onChange={(e) => setFName(e.target.value)}
                          placeholder='Your full name'
                          required
                        />
                      </div>
                      <div className='pf-fg'>
                        <label className='pf-fl' htmlFor='pf-un'>
                          Username
                        </label>
                        <input
                          className='pf-fi'
                          type='text'
                          id='pf-un'
                          value={fUn}
                          onChange={(e) => setFUn(e.target.value)}
                          placeholder='username'
                          required
                        />
                      </div>
                      <div className='pf-fg pf-f-full'>
                        <label className='pf-fl' htmlFor='pf-em'>
                          Email Address
                        </label>
                        <input
                          className='pf-fi'
                          type='email'
                          id='pf-em'
                          value={fEm}
                          readOnly
                          style={{ opacity: 0.6 }}
                        />
                      </div>
                      <div className='pf-fg pf-f-full'>
                        <label className='pf-fl' htmlFor='pf-ph'>
                          Phone Number
                        </label>
                        <div className='phone-row' style={{display:'flex',gap:0,border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden',background:'var(--cream)'}}>
                          {/* Dial code selector */}
                          <div style={{position:'relative',flexShrink:0}}>
                            <select
                              value={fDialCode}
                              onChange={(e) => {
                                setFDialCode(e.target.value)
                                // Update country when dial code changes
                                const found = COUNTRY_CODES.find(c => c.dial === e.target.value)
                                if (found) setFCo(found.name)
                              }}
                              style={{
                                padding:'11px 28px 11px 10px',height:'100%',background:'var(--parchment)',
                                border:'none',borderRight:'1px solid var(--border)',
                                fontFamily:"'DM Sans',sans-serif",fontSize:'.82rem',color:'var(--ink)',
                                outline:'none',cursor:'pointer',appearance:'none',WebkitAppearance:'none',
                                minWidth:90,
                              }}
                            >
                              {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>
                              ))}
                            </select>
                            <span style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',fontSize:'.6rem',color:'var(--text-secondary)'}}>▼</span>
                          </div>
                          {/* Number input */}
                          <input
                            className='pf-fi'
                            type='tel'
                            id='pf-ph'
                            value={fPhoneNumber}
                            onChange={(e) => setFPhoneNumber(e.target.value)}
                            placeholder='1712-345678'
                            style={{border:'none',borderRadius:0,flex:1,background:'transparent'}}
                          />
                        </div>
                      </div>
                      <div className='pf-fg'>
                        <label className='pf-fl' htmlFor='pf-co'>
                          Country
                        </label>
                        <select
                          className='pf-fi'
                          id='pf-co'
                          value={fCo}
                          onChange={(e) => {
                            setFCo(e.target.value)
                            // Sync dial code when country changes
                            const found = COUNTRY_CODES.find(c => c.name === e.target.value)
                            if (found) setFDialCode(found.dial)
                          }}
                          style={{appearance:'none',WebkitAppearance:'none',
                            backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9' stroke='%236b6459' stroke-width='1.8' fill='none'/%3E%3C/svg%3E\")",
                            backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center',backgroundSize:'16px',paddingRight:34,cursor:'pointer'}}
                        >
                          <option value=''>Select your country…</option>
                          {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className='pf-fg'>
                        <label className='pf-fl' htmlFor='pf-ss'>
                          Active Season
                        </label>
                        <input
                          className='pf-fi'
                          type='text'
                          id='pf-ss'
                          value={profile?.active_season_id ? 'Active' : 'None'}
                          readOnly
                        />
                      </div>
                      <div
                        className='pf-f-full'
                        style={{
                          display: 'flex',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginTop: 6,
                        }}
                      >
                        <button type='submit' className='pf-btn-ink'>
                          Save Changes
                        </button>
                        <button
                          type='button'
                          className='pf-btn-ghost'
                          onClick={resetForm}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* SECURITY */}
                <div
                  className='pf-card pf-reveal pf-cp'
                  style={{ transitionDelay: '.12s' }}
                >
                  <span className='pf-sec-label'>Security</span>
                  <h2
                    className='pf-sec-title'
                    style={{ fontSize: '1.25rem', marginBottom: 18 }}
                  >
                    Account Security
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {/* Password — unlocked */}
                    <div className='pf-sec-row'>
                      <div>
                        <div
                          style={{
                            fontSize: '.82rem',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            marginBottom: 2,
                          }}
                        >
                          Password
                        </div>
                        <div
                          style={{ fontSize: '.7rem', color: 'var(--txt2)' }}
                        >
                          Last changed 45 days ago
                        </div>
                      </div>
                      <button
                        className='pf-btn-ghost'
                        style={{ fontSize: '.7rem', padding: '7px 14px' }}
                        onClick={() =>
                          showToast(
                            'Password reset link sent to your email.',
                            'ok',
                          )
                        }
                      >
                        Change
                      </button>
                    </div>

                    {/* Google 2FA — locked */}
                    <div className='pf-lock-wrapper'>
                      <div className='pf-sec-row'>
                        <div>
                          <div
                            style={{
                              fontSize: '.82rem',
                              fontWeight: 500,
                              color: 'var(--ink)',
                              marginBottom: 2,
                            }}
                          >
                            Google Two-Factor Auth
                          </div>
                          <div
                            style={{ fontSize: '.7rem', color: 'var(--txt2)' }}
                          >
                            Extra layer of protection via Google Authenticator
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '.68rem',
                              textTransform: 'uppercase',
                              letterSpacing: '.06em',
                              color: 'var(--sage)',
                            }}
                          >
                            Enabled
                          </span>
                          <div className='pf-toggle-track'>
                            <div className='pf-toggle-knob' />
                          </div>
                        </div>
                      </div>
                      <div className='pf-lock-overlay'>
                        <div className='pf-lock-badge'>
                          <LockSVG />
                        </div>
                        <div className='pf-lock-text-block'>
                          <span className='pf-lock-main'>
                            Not available in your region
                          </span>
                          <span className='pf-lock-hint'>
                            Google 2FA is restricted for your account
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KYC — locked */}
                    <div className='pf-lock-wrapper'>
                      <div className='pf-sec-row'>
                        <div>
                          <div
                            style={{
                              fontSize: '.82rem',
                              fontWeight: 500,
                              color: 'var(--ink)',
                              marginBottom: 2,
                            }}
                          >
                            KYC Verification
                          </div>
                          <div
                            style={{ fontSize: '.7rem', color: 'var(--txt2)' }}
                          >
                            Identity document verification
                          </div>
                        </div>
                        <span className='pf-badge pf-b-act'>Verified</span>
                      </div>
                      <div className='pf-lock-overlay'>
                        <div className='pf-lock-badge'>
                          <LockSVG />
                        </div>
                        <div className='pf-lock-text-block'>
                          <span className='pf-lock-main'>
                            Not available in your region
                          </span>
                          <span className='pf-lock-hint'>
                            KYC verification is restricted for your account
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* /left */}

              {/* RIGHT COL */}
              <div className='pf-col'>
                {/* REFERRAL */}
                <div
                  className='pf-card pf-reveal pf-cp'
                  style={{ transitionDelay: '.1s' }}
                >
                  <span className='pf-sec-label'>Passive Income</span>
                  <h2
                    className='pf-sec-title'
                    style={{ fontSize: '1.25rem', marginBottom: 6 }}
                  >
                    Referral Program
                  </h2>
                  <p
                    style={{
                      fontSize: '.78rem',
                      color: 'var(--txt2)',
                      fontWeight: 300,
                      lineHeight: 1.75,
                      marginBottom: 20,
                    }}
                  >
                    Earn{' '}
                    <strong style={{ color: 'var(--gold)' }}>
                      5% commission
                    </strong>{' '}
                    automatically every time a referred user makes a withdrawal
                    — no cap, no delays.
                  </p>
                  <span className='pf-sec-label'>Your Code</span>
                  <div className='pf-ref-code-box' style={{ marginBottom: 18 }}>
                    <span className='pf-ref-code-val'>{profile?.referral_code || 'VAULT-X'}</span>
                    <button
                      className={`pf-btn-copy${copied ? ' copied' : ''}`}
                      onClick={copyCode}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <span className='pf-sec-label'>Statistics</span>
                  <div className='pf-stat-trio' style={{ marginBottom: 18 }}>
                    <div className='pf-stat-cell'>
                      <div className='pf-stat-val'>
                        ${profile?.profits_total?.toLocaleString() || '0'}
                      </div>
                      <div className='pf-stat-lbl'>Commission</div>
                    </div>
                    <div className='pf-stat-cell'>
                      <div className='pf-stat-val'>{referrals.length}</div>
                      <div className='pf-stat-lbl'>Referred</div>
                    </div>
                    <div className='pf-stat-cell'>
                      <div className='pf-stat-val'>
                        {profile?.commission_rate || 7}<span>%</span>
                      </div>
                      <div className='pf-stat-lbl'>Rate</div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(184,147,90,0.05)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '12px 14px',
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '.68rem',
                        color: 'var(--txt2)',
                        lineHeight: 1.85,
                        fontWeight: 300,
                      }}
                    >
                      📌 Share code → Friend invests → Friend withdraws →{' '}
                      <strong style={{ color: 'var(--gold)' }}>
                        You earn 5%
                      </strong>{' '}
                      credited automatically.
                    </div>
                  </div>

                  {/* Referred users table */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span className='pf-sec-label' style={{ marginBottom: 0 }}>
                      Referred Users
                    </span>
                    <span
                      style={{
                        fontSize: '.65rem',
                        color: 'var(--txt2)',
                        letterSpacing: '.06em',
                      }}
                    >
                      {referrals.length} total
                    </span>
                  </div>
                  <div className='pf-tbl-wrap'>
                    <table className='pf-rtbl'>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.slice(0, 5).map((u, i) => (
                          <tr key={i}>
                            <td>
                              <div className='pf-td-u'>
                                <div className='pf-td-av'>{u.first_name[0]}{u.last_name[0]}</div>
                                <div>
                                  <div className='pf-td-nm'>{u.first_name} {u.last_name[0]}.</div>
                                  <div className='pf-td-hd'>@{u.username}</div>
                                </div>
                              </div>
                            </td>
                            <td
                              style={{ fontWeight: 500, color: 'var(--ink)' }}
                            >
                              ${u.balance?.toLocaleString() || '0'}
                            </td>
                            <td>
                              <span
                                className={`pf-badge pf-b-act`}
                              >
                                active
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 14, textAlign: 'center' }}>
                    <button
                      className='pf-btn-ghost'
                      style={{ width: '100%' }}
                      onClick={() => setSeeMoreOpen(true)}
                    >
                      See Full List →
                    </button>
                  </div>
                </div>

                {/* WALLET */}
                <div
                  className='pf-card pf-reveal pf-cp'
                  style={{ transitionDelay: '.14s' }}
                >
                  <span className='pf-sec-label'>Assets</span>
                  <h2
                    className='pf-sec-title'
                    style={{ fontSize: '1.25rem', marginBottom: 16 }}
                  >
                    Wallet Summary
                  </h2>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <div className='pf-wrow'>
                      <span className='pf-wrow-lbl'>Total Invested</span>
                      <span
                        className='pf-wrow-val'
                        style={{ color: 'var(--ink)' }}
                      >
                        ${profile?.invested_total?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className='pf-wrow'>
                      <span className='pf-wrow-lbl'>Current Balance</span>
                      <span
                        className='pf-wrow-val'
                        style={{ color: 'var(--gold)' }}
                      >
                        ${profile?.balance?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className='pf-wrow'>
                      <span className='pf-wrow-lbl'>Withdrawable</span>
                      <span
                        className='pf-wrow-val'
                        style={{ color: 'var(--sage)' }}
                      >
                        ${profile?.withdrawable_total?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className='pf-wrow'>
                      <span className='pf-wrow-lbl'>Total Profits</span>
                      <span
                        className='pf-wrow-val'
                        style={{ color: 'var(--sage)' }}
                      >
                        +${profile?.profits_total?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className='pf-wrow'>
                      <span className='pf-wrow-lbl'>Referral Commission</span>
                      <span
                        className='pf-wrow-val'
                        style={{ color: 'var(--gold)' }}
                      >
                        +${profile?.profits_total?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* /right */}
            </div>
            {/* /two-col */}
          </div>
        </div>
        {/* /main */}
      </div>
      {/* /layout */}

      {/* SEE MORE MODAL */}
      <div
        className={`pf-overlay${seeMoreOpen ? ' open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSeeMoreOpen(false)
        }}
      >
        <div className='pf-modal-box'>
          <div className='pf-modal-hd'>
            <span className='pf-modal-ttl'>All Referred Users</span>
            <button
              className='pf-modal-cls'
              onClick={() => setSeeMoreOpen(false)}
            >
              ✕
            </button>
          </div>
          <p
            style={{
              fontSize: '.82rem',
              color: 'var(--txt2)',
              fontWeight: 300,
              lineHeight: 1.75,
              marginBottom: 16,
            }}
          >
            You have referred{' '}
            <strong style={{ color: 'var(--ink)' }}>7 users</strong> so far.
          </p>
          <div className='pf-placeholder-box'>
            <div className='pf-placeholder-big'>Full Referral List</div>
            <div className='pf-placeholder-sub'>
              A complete paginated table of all 7 referred accounts — including
              withdrawal history, per-transaction commission, and account tier.
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: '.7rem',
                color: '#b8b0a4',
                letterSpacing: '.04em',
              }}
            >
              Connecting to live referral dashboard…
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className='pf-btn-ink'
              style={{ flex: 1, minWidth: 120, textAlign: 'center' }}
              onClick={() => setSeeMoreOpen(false)}
            >
              Close
            </button>
            <button
              className='pf-btn-ghost'
              style={{ flex: 1, minWidth: 120, textAlign: 'center' }}
              onClick={() => {
                showToast('CSV export coming soon.', 'ok')
                setSeeMoreOpen(false)
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
