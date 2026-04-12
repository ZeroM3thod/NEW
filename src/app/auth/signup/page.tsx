'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ToastType = 'ok' | 'err' | '';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Country codes list ── */
const COUNTRY_CODES = [
  { code: 'AF', name: 'Afghanistan',             dial: '+93',  flag: '🇦🇫' },
  { code: 'AL', name: 'Albania',                 dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria',                 dial: '+213', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra',                 dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola',                  dial: '+244', flag: '🇦🇴' },
  { code: 'AR', name: 'Argentina',               dial: '+54',  flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia',                 dial: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia',               dial: '+61',  flag: '🇦🇺' },
  { code: 'AT', name: 'Austria',                 dial: '+43',  flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan',              dial: '+994', flag: '🇦🇿' },
  { code: 'BH', name: 'Bahrain',                 dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh',              dial: '+880', flag: '🇧🇩' },
  { code: 'BY', name: 'Belarus',                 dial: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium',                 dial: '+32',  flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize',                  dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin',                   dial: '+229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan',                  dial: '+975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia',                 dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia & Herzegovina',    dial: '+387', flag: '🇧🇦' },
  { code: 'BR', name: 'Brazil',                  dial: '+55',  flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei',                  dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria',                dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso',            dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi',                 dial: '+257', flag: '🇧🇮' },
  { code: 'CM', name: 'Cameroon',                dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada',                  dial: '+1',   flag: '🇨🇦' },
  { code: 'CF', name: 'Central African Republic',dial: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad',                    dial: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile',                   dial: '+56',  flag: '🇨🇱' },
  { code: 'CN', name: 'China',                   dial: '+86',  flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia',                dial: '+57',  flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros',                 dial: '+269', flag: '🇰🇲' },
  { code: 'CD', name: 'Congo (DRC)',             dial: '+243', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo (Republic)',        dial: '+242', flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica',              dial: '+506', flag: '🇨🇷' },
  { code: 'CI', name: 'Côte d\'Ivoire',          dial: '+225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia',                 dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba',                    dial: '+53',  flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus',                  dial: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic',          dial: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark',                 dial: '+45',  flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti',                dial: '+253', flag: '🇩🇯' },
  { code: 'DO', name: 'Dominican Republic',      dial: '+1',   flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador',                 dial: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt',                   dial: '+20',  flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador',             dial: '+503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea',       dial: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea',                 dial: '+291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia',                 dial: '+372', flag: '🇪🇪' },
  { code: 'ET', name: 'Ethiopia',                dial: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji',                    dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland',                 dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France',                  dial: '+33',  flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon',                   dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia',                  dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia',                 dial: '+995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany',                 dial: '+49',  flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana',                   dial: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece',                  dial: '+30',  flag: '🇬🇷' },
  { code: 'GT', name: 'Guatemala',               dial: '+502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea',                  dial: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau',           dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana',                  dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti',                   dial: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras',                dial: '+504', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong',               dial: '+852', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary',                 dial: '+36',  flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland',                 dial: '+354', flag: '🇮🇸' },
  { code: 'IN', name: 'India',                   dial: '+91',  flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia',               dial: '+62',  flag: '🇮🇩' },
  { code: 'IR', name: 'Iran',                    dial: '+98',  flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq',                    dial: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland',                 dial: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel',                  dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy',                   dial: '+39',  flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica',                 dial: '+1',   flag: '🇯🇲' },
  { code: 'JP', name: 'Japan',                   dial: '+81',  flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan',                  dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan',              dial: '+7',   flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya',                   dial: '+254', flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait',                  dial: '+965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan',              dial: '+996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos',                    dial: '+856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia',                  dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon',                 dial: '+961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho',                 dial: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia',                 dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya',                   dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein',           dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania',               dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg',              dial: '+352', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar',              dial: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi',                  dial: '+265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia',                dial: '+60',  flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives',                dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali',                    dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta',                   dial: '+356', flag: '🇲🇹' },
  { code: 'MR', name: 'Mauritania',              dial: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius',               dial: '+230', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico',                  dial: '+52',  flag: '🇲🇽' },
  { code: 'MD', name: 'Moldova',                 dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco',                  dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia',                dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro',              dial: '+382', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco',                 dial: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique',              dial: '+258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar',                 dial: '+95',  flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia',                 dial: '+264', flag: '🇳🇦' },
  { code: 'NP', name: 'Nepal',                   dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands',             dial: '+31',  flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand',             dial: '+64',  flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua',               dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger',                   dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria',                 dial: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway',                  dial: '+47',  flag: '🇳🇴' },
  { code: 'OM', name: 'Oman',                    dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan',                dial: '+92',  flag: '🇵🇰' },
  { code: 'PS', name: 'Palestine',               dial: '+970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama',                  dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea',        dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay',                dial: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru',                    dial: '+51',  flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines',             dial: '+63',  flag: '🇵🇭' },
  { code: 'PL', name: 'Poland',                  dial: '+48',  flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal',                dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar',                   dial: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania',                 dial: '+40',  flag: '🇷🇴' },
  { code: 'RU', name: 'Russia',                  dial: '+7',   flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda',                  dial: '+250', flag: '🇷🇼' },
  { code: 'SA', name: 'Saudi Arabia',            dial: '+966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal',                 dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia',                  dial: '+381', flag: '🇷🇸' },
  { code: 'SL', name: 'Sierra Leone',            dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore',               dial: '+65',  flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia',                dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia',                dial: '+386', flag: '🇸🇮' },
  { code: 'SO', name: 'Somalia',                 dial: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa',            dial: '+27',  flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan',             dial: '+211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain',                   dial: '+34',  flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka',               dial: '+94',  flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan',                   dial: '+249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname',                dial: '+597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden',                  dial: '+46',  flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland',             dial: '+41',  flag: '🇨🇭' },
  { code: 'SY', name: 'Syria',                   dial: '+963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan',                  dial: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan',              dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania',                dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand',                dial: '+66',  flag: '🇹🇭' },
  { code: 'TG', name: 'Togo',                    dial: '+228', flag: '🇹🇬' },
  { code: 'TT', name: 'Trinidad & Tobago',       dial: '+1',   flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia',                 dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey',                  dial: '+90',  flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan',            dial: '+993', flag: '🇹🇲' },
  { code: 'UG', name: 'Uganda',                  dial: '+256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine',                 dial: '+380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates',    dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom',          dial: '+44',  flag: '🇬🇧' },
  { code: 'US', name: 'United States',           dial: '+1',   flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay',                 dial: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan',              dial: '+998', flag: '🇺🇿' },
  { code: 'VE', name: 'Venezuela',               dial: '+58',  flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam',                 dial: '+84',  flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen',                   dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia',                  dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe',                dial: '+263', flag: '🇿🇼' },
];

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const unTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [toast, setToast] = useState({msg:'',type:'' as ToastType,show:false});

  /* ── fields ── */
  const [rFirst, setRFirst]     = useState('');
  const [rFirstCls, setRFirstCls] = useState('');
  const [rFirstMsg, setRFirstMsg] = useState('');

  const [rLast, setRLast]       = useState('');
  const [rLastCls, setRLastCls] = useState('');
  const [rLastMsg, setRLastMsg] = useState('');

  const [rUn, setRUn]           = useState('');
  const [rUnCls, setRUnCls]     = useState('');
  const [rUnMsg, setRUnMsg]     = useState('');
  const [rUnChecking, setRUnChecking] = useState(false);

  const [rEmail, setREmail]     = useState('');
  const [rEmailCls, setREmailCls] = useState('');
  const [rEmailMsg, setREmailMsg] = useState('');

  /* phone: dial code + number */
  const [rDialCode, setRDialCode] = useState('BD'); // ISO code key
  const [rPhone, setRPhone]     = useState('');
  const [rPhoneCls, setRPhoneCls] = useState('');
  const [rPhoneMsg, setRPhoneMsg] = useState('');

  /* country name */
  const [rCountry, setRCountry] = useState('');
  const [rCountryCls, setRCountryCls] = useState('');

  const [rRef, setRRef]         = useState('');
  const [rRefCls, setRRefCls]   = useState('');
  const [rRefMsg, setRRefMsg]   = useState('');

  const [rPw, setRPw]           = useState('');
  const [rPwCls, setRPwCls]     = useState('');
  const [rPwMsg, setRPwMsg]     = useState('');
  const [rPwShow, setRPwShow]   = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  const [rCpw, setRCpw]         = useState('');
  const [rCpwCls, setRCpwCls]   = useState('');
  const [rCpwMsg, setRCpwMsg]   = useState('');
  const [rCpwMsgType, setRCpwMsgType] = useState<'err'|'ok'>('ok');
  const [rCpwShow, setRCpwShow] = useState(false);

  const [rTerms, setRTerms]     = useState(false);
  const [rTermsMsg, setRTermsMsg] = useState('');
  const [rLoading, setRLoading] = useState(false);

  /* Derived */
  const selectedCountry = COUNTRY_CODES.find(c => c.code === rDialCode) || COUNTRY_CODES.find(c => c.code === 'BD')!;

  /* ── Pre-fill ref from URL ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRRef(ref);
  }, []);

  /* ── BG Canvas ── */
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const cx = cv.getContext('2d')!;
    type Candle = {x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number};
    type Wave   = {pts:{x:number;y:number}[];spd:number;ph:number;amp:number;col:string;opa:string};
    let W=0,H=0,candles:Candle[]=[],waves:Wave[]=[],T=0;
    const setup=()=>{
      W=cv.width=window.innerWidth; H=cv.height=window.innerHeight;
      const n=Math.max(6,Math.floor(W/50));
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*W+10+Math.random()*18,y:H*.15+Math.random()*H*.68,w:8+Math.random()*9,h:14+Math.random()*72,wick:6+Math.random()*22,up:Math.random()>.42,spd:.15+Math.random()*.35,ph:Math.random()*Math.PI*2}));
      const pts=Math.ceil(W/36)+2;
      waves=[0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.12+i*.22)+Math.random()*44})),spd:.1+i*.04,ph:i*1.4,amp:13+i*8,col:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'.72)':'.56)'}));
    };
    const draw=()=>{
      cx.clearRect(0,0,W,H); T+=.011;
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.col+w.opa;cx.lineWidth=1;cx.stroke()});
      candles.forEach(c=>{const b=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+b;cx.strokeStyle='rgba(28,28,28,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)});
      animRef.current=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup); setup(); draw();
    return()=>{window.removeEventListener('resize',setup);cancelAnimationFrame(animRef.current)};
  },[]);

  const showToast = useCallback((msg:string,type:ToastType='')=>{
    setToast({msg,type,show:true});
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3500);
  },[]);

  const getStrength=(pw:string)=>{
    let s=0;
    if(pw.length>=8) s++;
    if(/[A-Z]/.test(pw)) s++;
    if(/[0-9]/.test(pw)) s++;
    if(/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthColor=(score:number)=>score<=1?'#b05252':score<=2?'#b8935a':'#4a6741';
  const strengthLabel=(score:number)=>['','Weak','Fair','Good','Strong'][score]||'';

  /* When user picks a dial code, also pre-fill country name if empty */
  const handleDialChange = (code: string) => {
    setRDialCode(code);
    const found = COUNTRY_CODES.find(c => c.code === code);
    if (found && !rCountry) setRCountry(found.name);
  };

  const handleUnInput=(val:string)=>{
    setRUn(val); setRUnCls(''); setRUnMsg(''); setRUnChecking(false);
    if(unTimer.current) clearTimeout(unTimer.current);
    const v=val.trim().toLowerCase();
    if(!v) return;
    if(v.length<3){setRUnCls('fi-err');setRUnMsg('⚠ Must be at least 3 characters.');return;}
    if(!/^[a-z0-9._]+$/.test(v)){setRUnCls('fi-err');setRUnMsg('⚠ Only letters, numbers, dots and underscores.');return;}
    setRUnChecking(true); setRUnMsg('Checking availability…');
    unTimer.current=setTimeout(async()=>{
      const {data,error}=await supabase.from('profiles').select('username').eq('username',v).maybeSingle();
      setRUnChecking(false);
      if(data){setRUnCls('fi-err');setRUnMsg('✕ Username taken. Try another.');}
      else if(error){setRUnCls('fi-err');setRUnMsg('✕ Error checking username.');}
      else{setRUnCls('fi-good');setRUnMsg('✓ Username available!');}
    },900);
  };

  const handleRefBlur=async()=>{
    const val=rRef.trim();
    if(!val){setRRefMsg('');return;}
    const {data}=await supabase.from('profiles').select('id').eq('referral_code',val).maybeSingle();
    if(data){setRRefCls('fi-good');setRRefMsg('✓ Valid referral code applied!');}
    else{setRRefCls('fi-err');setRRefMsg('✕ Invalid referral code.');}
  };

  const handleCpwInput=(val:string)=>{
    setRCpw(val);
    if(!val){setRCpwMsg('');return;}
    if(rPw===val){setRCpwCls('fi-good');setRCpwMsg('✓ Passwords match.');setRCpwMsgType('ok');}
    else{setRCpwCls('fi-err');setRCpwMsg('✕ Passwords do not match.');setRCpwMsgType('err');}
  };

  const handleRegister=async(e:React.FormEvent)=>{
    e.preventDefault();
    let valid=true;
    const first=rFirst.trim(), last=rLast.trim(), un=rUn.trim(), email=rEmail.trim(), phone=rPhone.trim(), pw=rPw, cpw=rCpw;

    if(!first||first.length<1){setRFirstCls('fi-err');setRFirstMsg('⚠ First name is required.');valid=false;}
    else{setRFirstCls('fi-good');setRFirstMsg('');}

    if(!last||last.length<1){setRLastCls('fi-err');setRLastMsg('⚠ Last name is required.');valid=false;}
    else{setRLastCls('fi-good');setRLastMsg('');}

    if(!un||un.length<3){setRUnCls('fi-err');setRUnMsg('⚠ Username must be at least 3 characters.');valid=false;}

    if(!email){setREmailCls('fi-err');setREmailMsg('⚠ Email is required.');valid=false;}
    else if(!EMAIL_RX.test(email)){setREmailCls('fi-err');setREmailMsg('⚠ Enter a valid email address.');valid=false;}
    else{setREmailCls('fi-good');setREmailMsg('');}

    if(!pw||pw.length<8){setRPwCls('fi-err');setRPwMsg('⚠ Password must be at least 8 characters.');valid=false;}
    if(!cpw){setRCpwCls('fi-err');setRCpwMsg('⚠ Please confirm your password.');setRCpwMsgType('err');valid=false;}
    else if(pw!==cpw){setRCpwCls('fi-err');setRCpwMsg('✕ Passwords do not match.');setRCpwMsgType('err');valid=false;}

    if(!rTerms){setRTermsMsg('⚠ You must accept the Terms & Conditions.');valid=false;}
    else setRTermsMsg('');

    if(!valid){showToast('⚠ Please fix the errors above.','err');return;}
    setRLoading(true);

    const fullPhone = phone ? `${selectedCountry.dial}${phone}` : '';

    const {error}=await supabase.auth.signUp({
      email,
      password: pw,
      options:{
        data:{
          first_name: first,
          last_name: last,
          username: un,
          phone: fullPhone,
          country: rCountry.trim() || selectedCountry.name,
          referral_by_code: rRef.trim() || null,
        }
      }
    });

    setRLoading(false);
    if(error){showToast('✕ '+error.message,'err');}
    else{
      showToast('✓ Account created! Please check your email.','ok');
      setTimeout(()=>router.push('/auth/signin'),2500);
    }
  };

  const EyeOpen=()=>(<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);
  const EyeClosed=()=>(<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);

  return (
    <>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>
      <div className={`toast${toast.show?' show':''}${toast.type?' '+toast.type:''}`}>{toast.msg}</div>

      <a className="back-btn" href="/auth/signin">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </a>

      <div className="page-shell">
        <div className="auth-card" style={{maxWidth:500,animation:'fadeView .35s ease both'}}>
          <div className="card-logo">
            <div className="logo-icon"/>
            <div className="logo-name">Vault<span>X</span></div>
          </div>
          <h1 className="card-heading">Create account</h1>
          <p className="card-sub">Join thousands of investors growing capital through structured seasons.</p>

          <form className="form-stack" onSubmit={handleRegister} noValidate>

            {/* First Name + Last Name — side by side */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="fg">
                <label className="fl">First Name</label>
                <input className={`fi${rFirstCls?' '+rFirstCls:''}`} type="text" placeholder="Rakib" autoComplete="given-name"
                  value={rFirst} onChange={e=>setRFirst(e.target.value)}/>
                {rFirstMsg&&<div className="msg msg-err">{rFirstMsg}</div>}
              </div>
              <div className="fg">
                <label className="fl">Last Name</label>
                <input className={`fi${rLastCls?' '+rLastCls:''}`} type="text" placeholder="Kowshar" autoComplete="family-name"
                  value={rLast} onChange={e=>setRLast(e.target.value)}/>
                {rLastMsg&&<div className="msg msg-err">{rLastMsg}</div>}
              </div>
            </div>

            {/* Username */}
            <div className="fg">
              <label className="fl">Username</label>
              <input className={`fi${rUnCls?' '+rUnCls:''}`} type="text" placeholder="rakib.investor" autoComplete="off"
                value={rUn} onChange={e=>handleUnInput(e.target.value)}/>
              {rUnMsg&&(
                <div className={`msg ${rUnCls==='fi-err'?'msg-err':rUnCls==='fi-good'?'msg-ok':'msg-info'}`}>
                  {rUnChecking?<span className="un-checking"><span className="un-spinner"/>{rUnMsg}</span>:rUnMsg}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="fg">
              <label className="fl">Email Address</label>
              <input className={`fi${rEmailCls?' '+rEmailCls:''}`} type="email" placeholder="you@example.com" autoComplete="email"
                value={rEmail} onChange={e=>setREmail(e.target.value)}/>
              {rEmailMsg&&<div className="msg msg-err">{rEmailMsg}</div>}
            </div>

            {/* Phone — country dial code + number */}
            <div className="fg">
              <label className="fl">Phone Number</label>
              <div className="phone-row" style={{gap:0,border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden',background:'var(--cream)'}}>
                {/* Dial code selector */}
                <div style={{position:'relative',flexShrink:0}}>
                  <select
                    value={rDialCode}
                    onChange={e=>handleDialChange(e.target.value)}
                    style={{
                      padding:'11px 28px 11px 10px',height:'100%',background:'var(--parchment)',
                      border:'none',borderRight:'1px solid var(--border)',
                      fontFamily:"'DM Sans',sans-serif",fontSize:'.82rem',color:'var(--ink)',
                      outline:'none',cursor:'pointer',appearance:'none',WebkitAppearance:'none',
                      minWidth:90,
                    }}
                  >
                    {COUNTRY_CODES.map(c=>(
                      <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                    ))}
                  </select>
                  {/* Chevron */}
                  <span style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',fontSize:'.6rem',color:'var(--text-secondary)'}}>▼</span>
                </div>
                {/* Number input */}
                <input
                  className={`fi${rPhoneCls?' '+rPhoneCls:''}`}
                  type="tel" placeholder="1712-345678" autoComplete="tel"
                  value={rPhone} onChange={e=>setRPhone(e.target.value)}
                  style={{border:'none',borderRadius:0,flex:1,background:'transparent'}}
                />
              </div>
              {rPhoneMsg&&<div className="msg msg-err">{rPhoneMsg}</div>}
            </div>

            {/* Country name */}
            <div className="fg">
              <label className="fl">Country</label>
              <select
                className={`fi${rCountryCls?' '+rCountryCls:''}`}
                value={rCountry}
                onChange={e=>{
                  setRCountry(e.target.value);
                  // Also sync dial code when country changes
                  const found=COUNTRY_CODES.find(c=>c.name===e.target.value);
                  if(found) setRDialCode(found.code);
                }}
                style={{appearance:'none',WebkitAppearance:'none',
                  backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9' stroke='%236b6459' stroke-width='1.8' fill='none'/%3E%3C/svg%3E\")",
                  backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center',backgroundSize:'16px',paddingRight:34,cursor:'pointer'}}
              >
                <option value="">Select your country…</option>
                {COUNTRY_CODES.map(c=>(
                  <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Referral Code */}
            <div className="fg">
              <label className="fl">
                Referral Code <span style={{fontSize:'.6rem',color:'var(--gold)',letterSpacing:'.08em'}}>(Optional)</span>
              </label>
              <input className={`fi${rRefCls?' '+rRefCls:''}`} type="text" placeholder="e.g. VX-AB12CD" autoComplete="off"
                value={rRef} onChange={e=>setRRef(e.target.value)} onBlur={handleRefBlur}/>
              {rRefMsg&&<div className={`msg ${rRefCls==='fi-good'?'msg-ok':'msg-err'}`}>{rRefMsg}</div>}
            </div>

            {/* Password */}
            <div className="fg">
              <label className="fl">Password</label>
              <div className="pw-wrap">
                <input className={`fi${rPwCls?' '+rPwCls:''}`} type={rPwShow?'text':'password'}
                  placeholder="Create a strong password" autoComplete="new-password"
                  value={rPw} onChange={e=>{setRPw(e.target.value);setPwStrength(getStrength(e.target.value));}}/>
                <button type="button" className="pw-eye" onClick={()=>setRPwShow(v=>!v)}>
                  {rPwShow?<EyeClosed/>:<EyeOpen/>}
                </button>
              </div>
              <div className="strength-bar">
                {[1,2,3,4].map(i=>(
                  <div key={i} className="strength-seg"
                    style={{background:rPw&&i<=pwStrength?strengthColor(pwStrength):'var(--parchment)'}}/>
                ))}
              </div>
              {rPw&&<div className={`msg ${pwStrength<=1?'msg-err':pwStrength<=2?'msg-info':'msg-ok'}`}>{strengthLabel(pwStrength)}</div>}
              {rPwMsg&&<div className="msg msg-err">{rPwMsg}</div>}
            </div>

            {/* Confirm Password */}
            <div className="fg">
              <label className="fl">Confirm Password</label>
              <div className="pw-wrap">
                <input className={`fi${rCpwCls?' '+rCpwCls:''}`} type={rCpwShow?'text':'password'}
                  placeholder="Repeat your password" autoComplete="new-password"
                  value={rCpw} onChange={e=>handleCpwInput(e.target.value)}/>
                <button type="button" className="pw-eye" onClick={()=>setRCpwShow(v=>!v)}>
                  {rCpwShow?<EyeClosed/>:<EyeOpen/>}
                </button>
              </div>
              {rCpwMsg&&<div className={`msg ${rCpwMsgType==='ok'?'msg-ok':'msg-err'}`}>{rCpwMsg}</div>}
            </div>

            {/* Terms */}
            <label className="check-row" style={{marginTop:2}}>
              <input type="checkbox" checked={rTerms} onChange={e=>{setRTerms(e.target.checked);if(e.target.checked)setRTermsMsg('');}}/>
              <span className="check-label">
                I agree to the <a onClick={()=>showToast('Terms & Conditions — coming soon.')}>Terms &amp; Conditions</a>
                {' '}and <a onClick={()=>showToast('Privacy Policy — coming soon.')}>Privacy Policy</a>
              </span>
            </label>
            {rTermsMsg&&<div className="msg msg-err">{rTermsMsg}</div>}

            <button type="submit" className="btn-primary" style={{marginTop:6}} disabled={rLoading}>
              <span>{rLoading?'Creating account…':'Create Account →'}</span>
            </button>
          </form>

          <div className="switch-row">
            Already have an account?&nbsp;
            <button className="switch-link" onClick={()=>router.push('/auth/signin')}>Sign in →</button>
          </div>
        </div>
      </div>

      <div className="page-caption">© 2025 VaultX · All rights reserved</div>

      <style>{`
        @keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}