import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { motion, useScroll, useTransform } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowRight, Bell, CheckCircle2, ChevronRight, CircleAlert, ClipboardCheck,
  FileText, Flame, Heart, Landmark, Languages, MapPin, Menu, MessageSquareText,
  MoreHorizontal, Plus, Search, ShieldCheck, Sparkles, ThumbsUp, X
} from 'lucide-react';

const initialReports = [
  { id: 'CL-2026-1842', title: 'Overflowing drain near Community Hall', category: 'Drainage', area: 'Jagmohan Nagar, Bhubaneswar, Odisha', distance: '120 m', status: 'In Progress', created: 'Today, 10:24 AM', votes: 28, color: '#ff8b3d', detail: 'Drain water is overflowing onto the road after the morning rain. Pedestrians and school buses are affected.', department: 'Sanitation & Drainage', image: '🌊' },
  { id: 'CL-2026-1837', title: 'Broken streetlight at Block C crossing', category: 'Streetlight', area: 'Jagmohan Nagar, Bhubaneswar, Odisha', distance: '280 m', status: 'Assigned', created: 'Yesterday', votes: 17, color: '#8f6cff', detail: 'The crossing has been dark for the last three nights. Visibility is poor after sunset.', department: 'Electrical Maintenance', image: '💡' },
  { id: 'CL-2026-1828', title: 'Deep pothole on Main Market Road', category: 'Roads', area: 'Jagmohan Nagar, Bhubaneswar, Odisha', distance: '410 m', status: 'Received', created: '2 days ago', votes: 41, color: '#ef5f70', detail: 'A pothole beside the bus stop is causing traffic to swerve into the opposite lane.', department: 'Roads & Works', image: '🕳️' },
  { id: 'CL-2026-1804', title: 'Waste collection missed on 7th Lane', category: 'Waste', area: 'Saheed Nagar', distance: '650 m', status: 'Resolved', created: '4 days ago', votes: 13, color: '#2bb7a8', detail: 'Household waste has not been collected since Monday.', department: 'Solid Waste Management', image: '♻️' }
];

const proposals = [
  { id: 1, title: 'Resurface Main Market Road', location: 'Market Road corridor', cost: '₹4.5L', votes: 284, target: 500, tag: 'Roads', color: '#ee6a52' },
  { id: 2, title: 'Install 18 solar streetlights', location: 'Block C & Community Park', cost: '₹3.1L', votes: 227, target: 500, tag: 'Safety', color: '#7d6bd9' },
  { id: 3, title: 'Upgrade storm-water drains', location: 'Jagmohan Nagar, Bhubaneswar, Phase 2', cost: '₹5.8L', votes: 193, target: 500, tag: 'Drainage', color: '#20a7a1' }
];

const API = import.meta.env.VITE_API_URL || 'https://civicloop-api.onrender.com';
const categoryColor = { Roads: '#ef5f70', Drainage: '#ff8b3d', Streetlight: '#8f6cff', Waste: '#2bb7a8', Water: '#177e89', Other: '#64748b' };
const categories = ['Roads', 'Drainage', 'Streetlight', 'Waste', 'Water', 'Other'];
// Deliberately curated: broad national coverage without loading a large location dataset into the MVP.
const locations = [
  { label: 'Jagmohan Nagar, Bhubaneswar, Odisha', lat: 20.2961, lng: 85.8245 },
  { label: 'Patia, Bhubaneswar, Odisha', lat: 20.3530, lng: 85.8206 },
  { label: 'Bandra West, Mumbai, Maharashtra', lat: 19.0596, lng: 72.8295 },
  { label: 'Koregaon Park, Pune, Maharashtra', lat: 18.5362, lng: 73.8935 },
  { label: 'Dharampeth, Nagpur, Maharashtra', lat: 21.1403, lng: 79.0569 },
  { label: 'Navrangpura, Ahmedabad, Gujarat', lat: 23.0407, lng: 72.5619 },
  { label: 'Panjim, Panaji, Goa', lat: 15.4989, lng: 73.8278 },
  { label: 'C-Scheme, Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { label: 'Hauz Khas, New Delhi, Delhi', lat: 28.5494, lng: 77.2001 },
  { label: 'Sector 17, Chandigarh, Chandigarh', lat: 30.7409, lng: 76.7813 },
  { label: 'Gomti Nagar, Lucknow, Uttar Pradesh', lat: 26.8508, lng: 81.0013 },
  { label: 'Rajbagh, Srinagar, Jammu and Kashmir', lat: 34.0307, lng: 74.8509 },
  { label: 'Arera Colony, Bhopal, Madhya Pradesh', lat: 23.2319, lng: 77.4320 },
  { label: 'Vijay Nagar, Indore, Madhya Pradesh', lat: 22.7533, lng: 75.8937 },
  { label: 'Telibandha, Raipur, Chhattisgarh', lat: 21.2391, lng: 81.6812 },
  { label: 'Indiranagar, Bengaluru, Karnataka', lat: 12.9784, lng: 77.6408 },
  { label: 'Banjara Hills, Hyderabad, Telangana', lat: 17.4156, lng: 78.4347 },
  { label: 'Adyar, Chennai, Tamil Nadu', lat: 13.0067, lng: 80.2575 },
  { label: 'Fort Kochi, Kochi, Kerala', lat: 9.9656, lng: 76.2425 },
  { label: 'MVP Colony, Visakhapatnam, Andhra Pradesh', lat: 17.7385, lng: 83.3385 },
  { label: 'White Town, Puducherry, Puducherry', lat: 11.9315, lng: 79.8347 },
  { label: 'Park Street, Kolkata, West Bengal', lat: 22.5518, lng: 88.3528 },
  { label: 'Bistupur, Jamshedpur, Jharkhand', lat: 22.8028, lng: 86.1837 },
  { label: 'Fraser Road, Patna, Bihar', lat: 25.6105, lng: 85.1410 },
  { label: 'Paltan Bazar, Guwahati, Assam', lat: 26.1836, lng: 91.7538 },
  { label: 'Police Bazar, Shillong, Meghalaya', lat: 25.5712, lng: 91.8822 },
  { label: 'Kunjaban, Agartala, Tripura', lat: 23.8487, lng: 91.2918 },
  { label: 'Thangal Bazar, Imphal, Manipur', lat: 24.8097, lng: 93.9409 },
  { label: 'Dhobinala, Dimapur, Nagaland', lat: 25.9081, lng: 93.7265 },
  { label: 'Zarkawt, Aizawl, Mizoram', lat: 23.7270, lng: 92.7178 },
  { label: 'Ganga Market, Itanagar, Arunachal Pradesh', lat: 27.0844, lng: 93.6053 },
  { label: 'Deorali, Gangtok, Sikkim', lat: 27.3189, lng: 88.6084 },
  { label: 'Kashmiri Gate, New Delhi, Delhi', lat: 28.6650, lng: 77.2290 },
  { label: 'Kakkanad, Kochi, Kerala', lat: 10.0159, lng: 76.3419 }
];
const locationByLabel = Object.fromEntries(locations.map(location => [location.label, location]));
const statusStyle = { Received: 'status-received', Assigned: 'status-assigned', 'In Progress': 'status-progress', Resolved: 'status-resolved' };
const normaliseReport = (r) => ({ id: r.ticket || r.id, title: r.title, category: r.category, area: r.area, lat: r.lat, lng: r.lng, distance: 'Nearby', status: r.status, created: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Just now', votes: r.support_count ?? r.votes ?? 1, color: categoryColor[r.category] || '#64748b', detail: r.detail, department: r.department, image: iconFor(r.category) });

const translations = {"en":{"home":"Home","explore":"Explore issues","budget":"Community budget","report":"Report an issue","hero":"See an issue.","heroEm":"Start a solution.","heroText":"CivicLoop turns everyday reports into visible action — and gives your neighbourhood a say in what gets fixed next.","exploreLocal":"Explore local issues","live":"Live civic pulse","issues":"Issues in your area","support":"Support this cause","supportDone":"Support recorded","details":"Issue details","photo":"Incident photo","addPhoto":"Add incident photo","photoHint":"Upload a clear image of the issue (JPG, PNG or WebP; max 2 MB).","sortRecent":"Most recent","sortSupport":"Most supported","sortAttention":"Needs attention","handling":"How CivicLoop is handling this","view":"View"},"hi":{"home":"होम","explore":"समस्याएँ देखें","budget":"सामुदायिक बजट","report":"समस्या दर्ज करें","hero":"समस्या देखें।","heroEm":"समाधान शुरू करें।","heroText":"CivicLoop रोज़मर्रा की रिपोर्टों को दिखाई देने वाली कार्रवाई में बदलता है।","exploreLocal":"स्थानीय समस्याएँ देखें","live":"लाइव नागरिक स्थिति","issues":"आपके क्षेत्र की समस्याएँ","support":"इस कारण का समर्थन करें","supportDone":"समर्थन दर्ज हुआ","details":"समस्या का विवरण","photo":"घटना की फोटो","addPhoto":"घटना की फोटो जोड़ें","photoHint":"समस्या की स्पष्ट फोटो अपलोड करें।","sortRecent":"सबसे हाल की","sortSupport":"सबसे अधिक समर्थित","sortAttention":"तत्काल ध्यान","handling":"CivicLoop इस समस्या को कैसे संभाल रहा है","view":"देखें"},"or":{"home":"ହୋମ","explore":"ସମସ୍ୟା ଦେଖନ୍ତୁ","budget":"ସମୁଦାୟ ବଜେଟ୍","report":"ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ","hero":"ସମସ୍ୟା ଦେଖନ୍ତୁ।","heroEm":"ସମାଧାନ ଆରମ୍ଭ କରନ୍ତୁ।","heroText":"CivicLoop ଦୈନନ୍ଦିନ ରିପୋର୍ଟକୁ ଦୃଶ୍ୟମାନ କାର୍ଯ୍ୟରେ ପରିଣତ କରେ।","exploreLocal":"ସ୍ଥାନୀୟ ସମସ୍ୟା ଦେଖନ୍ତୁ","live":"ଲାଇଭ୍ ନାଗରିକ ସ୍ଥିତି","issues":"ଆପଣଙ୍କ ଅଞ୍ଚଳର ସମସ୍ୟା","support":"ଏହି କାରଣକୁ ସମର୍ଥନ କରନ୍ତୁ","supportDone":"ସମର୍ଥନ ରେକର୍ଡ ହେଲା","details":"ସମସ୍ୟା ବିବରଣୀ","photo":"ଘଟଣାର ଫଟୋ","addPhoto":"ଘଟଣାର ଫଟୋ ଯୋଡନ୍ତୁ","photoHint":"ସମସ୍ୟାର ସ୍ପଷ୍ଟ ଫଟୋ ଅପଲୋଡ କରନ୍ତୁ।","sortRecent":"ସବୁଠୁ ନୂଆ","sortSupport":"ସର୍ବାଧିକ ସମର୍ଥିତ","sortAttention":"ଜରୁରୀ ଧ୍ୟାନ","handling":"CivicLoop ଏହି ସମସ୍ୟାକୁ କିପରି ଦେଖୁଛି","view":"ଦେଖନ୍ତୁ"},"ta":{"home":"முகப்பு","explore":"புகார்களைப் பார்க்க","budget":"சமூக பட்ஜெட்","report":"புகார் அளிக்க","hero":"சிக்கலைக் காணுங்கள்.","heroEm":"தீர்வைத் தொடங்குங்கள்.","heroText":"CivicLoop அன்றாட புகார்களை கண்ணுக்குத் தெரியும் நடவடிக்கையாக மாற்றுகிறது.","exploreLocal":"உள்ளூர் சிக்கல்களைப் பார்க்க","live":"நேரடி குடிமக்கள் நிலவரம்","issues":"உங்கள் பகுதி சிக்கல்கள்","support":"இந்தக் கோரிக்கையை ஆதரிக்கவும்","supportDone":"ஆதரவு பதிவு செய்யப்பட்டது","details":"சிக்கல் விவரங்கள்","photo":"சம்பவப் படம்","addPhoto":"சம்பவப் படத்தைச் சேர்க்கவும்","photoHint":"சிக்கலின் தெளிவான படத்தைப் பதிவேற்றவும்.","sortRecent":"மிக அண்மையது","sortSupport":"அதிக ஆதரவு","sortAttention":"கவனம் தேவை","handling":"CivicLoop இந்த சிக்கலை எவ்வாறு கையாள்கிறது","view":"பார்க்க"}};
const languageNames = {"en":"English","hi":"Hindi (हिन्दी)","or":"Odia (ଓଡ଼ିଆ)","ta":"Tamil (தமிழ்)"};
const lifecycleSteps = ['Received', 'Assigned', 'In Progress', 'Resolved'];
function StatusPill({ status }) { return <span className={`status ${statusStyle[status] || ''}`}><span></span>{status}</span>; }
function Lifecycle({ status }) { const current = Math.max(0, lifecycleSteps.indexOf(status)); return <div className="mini-lifecycle" aria-label={`Issue lifecycle: ${status}`}>{lifecycleSteps.map((step, index) => <span key={step} className={index <= current ? 'complete' : ''}><i>{index < current ? '✓' : index + 1}</i><b>{step}</b></span>)}</div>; }
function CountUp({ value, prefix = '', suffix = '' }) { const [display, setDisplay] = useState(0); useEffect(() => { let frame; const start = performance.now(); const duration = 850; const update = now => { const progress = Math.min(1, (now - start) / duration); setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) frame = requestAnimationFrame(update); }; frame = requestAnimationFrame(update); return () => cancelAnimationFrame(frame); }, [value]); return <strong>{prefix}{display.toLocaleString()}{suffix}</strong>; }
function Avatar({ children, tone = 'teal' }) { return <span className={`avatar ${tone}`}>{children}</span>; }

export default function App() {
  const [view, setView] = useState('home');
  const [reports, setReports] = useState(() => JSON.parse(localStorage.getItem('civicloop-reports') || 'null') || initialReports);
  const [votes, setVotes] = useState(() => JSON.parse(localStorage.getItem('civicloop-votes') || '{}'));
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('recent');
  const [selectedReport, setSelectedReport] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('civicloop-language') || 'en');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [supportedReports, setSupportedReports] = useState(() => JSON.parse(localStorage.getItem('civicloop-report-support') || '{}'));
  const [form, setForm] = useState({ title: '', category: 'Roads', detail: '', area: 'Jagmohan Nagar, Bhubaneswar, Odisha' });
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 650], [0, 85]);

  useEffect(() => localStorage.setItem('civicloop-reports', JSON.stringify(reports)), [reports]);
  useEffect(() => { fetch(`${API}/reports`).then(r => r.ok ? r.json() : Promise.reject()).then(rows => setReports(rows.map(normaliseReport))).catch(() => {}); }, []);
  useEffect(() => localStorage.setItem('civicloop-votes', JSON.stringify(votes)), [votes]);
  useEffect(() => localStorage.setItem('civicloop-report-support', JSON.stringify(supportedReports)), [supportedReports]);
  useEffect(() => localStorage.setItem('civicloop-language', language), [language]);
  const t = (key) => translations[language]?.[key] || translations.en[key] || key;
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  const filteredReports = useMemo(() => reports.filter(r => `${r.title} ${r.category} ${r.area}`.toLowerCase().includes(query.toLowerCase())), [reports, query]);
  const sortedReports = useMemo(() => {
    const rows = [...filteredReports];
    if (sortMode === 'support') return rows.sort((a, b) => b.votes - a.votes);
    if (sortMode === 'status') { const rank = { 'In Progress': 0, Assigned: 1, Received: 2, Resolved: 3 }; return rows.sort((a, b) => rank[a.status] - rank[b.status]); }
    return rows;
  }, [filteredReports, sortMode]);
  const cycleSort = () => setSortMode(mode => mode === 'recent' ? 'support' : mode === 'support' ? 'status' : 'recent');
  const supportReport = (id) => {
    if (supportedReports[id]) return setToast('You already support this issue ? thank you.');
    setSupportedReports(current => ({...current, [id]: true}));
    setReports(current => current.map(report => report.id === id ? {...report, votes: report.votes + 1} : report));
    setToast('Your support has been added to this issue.');
  };
  const openReport = () => { setForm({ title: '', category: 'Roads', detail: '', incident_image: '', area: 'Jagmohan Nagar, Bhubaneswar, Odisha' }); setModal(true); };
  const submitReport = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.detail.trim()) return setToast('Please add an issue title and description.');
    try {
      const selectedLocation = locationByLabel[form.area] || locations[0];
      const res = await fetch(`${API}/reports`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...form, lat:selectedLocation.lat, lng:selectedLocation.lng}) });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json(); const report = normaliseReport(data.report);
      setReports(current => data.duplicate ? current.map(r => r.id === report.id ? report : r) : [report, ...current]);
      setModal(false); setView('reports'); setToast(data.duplicate ? `Linked to nearby report ${report.id}; its community support is now ${report.votes}.` : `Report ${report.id} logged and routed to ${report.department}.`);
    } catch {
      const report = { id: `CL-2026-${Math.floor(1900 + Math.random() * 700)}`, title: form.title.trim(), category: form.category, area: form.area, distance: 'Just now', status: 'Received', created: 'Just now', votes: 1, color: categoryColor[form.category], detail: form.detail.trim(), incident_image: form.incident_image || null, department: departmentFor(form.category), image: iconFor(form.category) };
      setReports([report, ...reports]); setModal(false); setView('reports'); setToast(`Report ${report.id} saved in offline demo mode.`);
    }
  };
  const vote = async (id) => { if (votes[id]) return setToast('Your vote is already counted — thank you for participating.'); try { const key = localStorage.getItem('civicloop-voter') || `demo-${crypto.randomUUID()}`; localStorage.setItem('civicloop-voter', key); const res = await fetch(`${API}/proposals/${id}/vote`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter_key:key})}); if (!res.ok && res.status !== 409) throw new Error(); setVotes({ ...votes, [id]: true }); setToast(res.status === 409 ? 'Your previous vote is already recorded in the audit trail.' : 'Vote recorded in the public audit trail.'); } catch { setVotes({ ...votes, [id]: true }); setToast('Vote saved in offline demo mode.'); } };

  return <div className="app-shell" lang={language}>
    <header className="topbar">
      <button className="brand" onClick={() => setView('home')} aria-label="CivicLoop home"><span className="brand-mark"><span></span><span></span><span></span></span><span>Civic<span>Loop</span></span></button>
      <nav className="nav-links"><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>{t('home')}</button><button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}>{t('explore')}</button><button className={view === 'budget' ? 'active' : ''} onClick={() => setView('budget')}>{t('budget')}</button></nav>
      <div className="header-actions"><button className="language-toggle" aria-label="Choose language" onClick={() => {setLanguageOpen(open => !open);setMenu(false);setNotificationsOpen(false)}}><Languages size={18}/><span>{languageNames[language]}</span></button><button className="notification" aria-label="Open notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(open => !open); setMenu(false); }}><Bell size={19}/><i></i></button><button className="profile" onClick={() => {setMenu(!menu);setNotificationsOpen(false)}}><Avatar tone="navy">AS</Avatar><span>Arnab S.</span><ChevronRight size={15} className={menu ? 'rotate' : ''}/></button><button className="mobile-menu" onClick={() => {setMenu(!menu);setNotificationsOpen(false)}}><Menu size={22}/></button></div>
      {languageOpen && <div className="language-menu">{Object.keys(languageNames).map(code => <button key={code} className={language === code ? 'active' : ''} onClick={() => {setLanguage(code);setLanguageOpen(false)}}>{languageNames[code]}</button>)}</div>}
      {notificationsOpen && <div className="notification-panel" role="status"><div className="notification-head"><div><b>Notifications</b><span>2 new updates</span></div><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={16}/></button></div><button className="notification-item" onClick={() => {setView('reports');setNotificationsOpen(false)}}><span className="notification-icon progress"><ClipboardCheck size={16}/></span><span><b>Drainage issue updated</b><small>Community Hall report is now in progress.</small></span></button><button className="notification-item" onClick={() => {setView('budget');setNotificationsOpen(false)}}><span className="notification-icon vote"><Heart size={16}/></span><span><b>Community support is growing</b><small>Market Road has received 284 votes.</small></span></button><button className="notification-footer" onClick={() => {setView('reports');setNotificationsOpen(false)}}>View all activity <ArrowRight size={15}/></button></div>}
      {menu && <div className="user-menu"><button onClick={() => {setView('profile');setMenu(false)}}>My civic profile</button><button onClick={() => {setView('reports');setMenu(false)}}>My reports</button><button onClick={() => setToast('Demo mode ? no account data is shared.')}>Privacy & data</button></div>}
    </header>

    {view === 'home' && <Home reports={reports} setView={setView} openReport={openReport} vote={vote} votes={votes} heroParallax={heroParallax} t={t}/>} 
    {view === 'reports' && <Explore reports={sortedReports} query={query} setQuery={setQuery} openReport={openReport} sortMode={sortMode} cycleSort={cycleSort} selectReport={setSelectedReport} t={t}/>} 
    {view === 'budget' && <Budget vote={vote} votes={votes} openReport={openReport}/>} 
    {view === 'profile' && <Profile reports={reports} setView={setView}/>} 

    <footer><div className="footer-brand"><span className="brand-mark small"><span></span><span></span><span></span></span> Civic<span>Loop</span></div><p>Transparent action. Better cities, together.</p><div><a href="#privacy" onClick={(e)=>{e.preventDefault();setToast('CivicLoop protects identities by default in this demo.')}}>Privacy</a><a href="#about" onClick={(e)=>{e.preventDefault();setToast('Built for SOA Ideathon 2026.')}}>About</a><a href="#help" onClick={(e)=>{e.preventDefault();setToast('Help center coming soon.')}}>Help</a></div></footer>
    {modal && <ReportModal form={form} setForm={setForm} close={() => setModal(false)} submit={submitReport} reports={reports} t={t}/>} 
    {selectedReport && <ReportDetail report={selectedReport} close={() => setSelectedReport(null)} support={() => supportReport(selectedReport.id)} supported={Boolean(supportedReports[selectedReport.id])} t={t}/>} 
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={() => setToast('')}><X size={16}/></button></div>}
  </div>;
}

function Home({ reports, setView, openReport, vote, votes, heroParallax, t }) {
  const recent = reports.slice(0, 3);
  return <main>
    <motion.section className="hero" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.55}}><motion.div className="hero-copy" initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.08}}><div className="eyebrow"><Sparkles size={15}/>{t('live')}</div><h1>{t('hero')}<br/><em>{t('heroEm')}</em></h1><p>{t('heroText')}</p><div className="hero-actions"><button className="button primary" onClick={openReport}><Plus size={19}/>{t('report')}</button><button className="button soft" onClick={() => setView('reports')}>{t('exploreLocal')} <ArrowRight size={17}/></button></div><div className="trust-row"><div className="people"><Avatar>RK</Avatar><Avatar tone="orange">PM</Avatar><Avatar tone="purple">S</Avatar><Avatar tone="green">A</Avatar></div><span>Joined by <b>2,400+ neighbours</b> this month</span></div></motion.div><motion.div className="hero-art" style={{y:heroParallax}} initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{duration:.7,delay:.15}}><div className="city-sun"></div><div className="cityscape"><span></span><span></span><span></span><span></span><span></span><span></span></div><div className="india-coverage"><span>Bhubaneswar</span><span>Mumbai</span><span>New Delhi</span><span>Chennai</span></div><div className="issue-pin pin-one"><CircleAlert size={16}/><b>12</b></div><div className="issue-pin pin-two"><Flame size={16}/></div><div className="issue-pin pin-three"><CheckCircle2 size={16}/></div><div className="map-card"><div><span className="live-dot"></span> Live in your area</div><b>24 active reports</b><button onClick={() => setView('reports')}>View map <ArrowRight size={14}/></button></div></motion.div></motion.section>
    <motion.section className="metrics" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.35}} transition={{duration:.45}}><div><CountUp value={1284}/><span>issues reported</span></div><div><CountUp value={78} suffix="%"/><span>resolved this quarter</span></div><div><strong>₹18.6L</strong><span>community budget voted</span></div><div><CountUp value={3950}/><span>neighbours engaged</span></div></motion.section>
    <motion.section className="section recent-section" initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.5}}><div className="section-heading"><div><span className="eyebrow">Across India, locally accountable</span><h2>What communities are reporting</h2><p>Live civic signals from Bhubaneswar, Mumbai, New Delhi and Chennai.</p></div><button className="text-button" onClick={() => setView('reports')}>View all issues <ArrowRight size={17}/></button></div><div className="report-grid">{recent.map(r => <ReportCard key={r.id} report={r} />)}</div></motion.section>
    <motion.section className="section hotspot-wrap" initial={{opacity:0,y:32}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.18}} transition={{duration:.55}}><div className="hotspot-graphic"><div className="map-label label-a">Market Road <b>7 reports</b></div><div className="map-label label-b">Community Hall <b>5 reports</b></div><div className="map-label label-c">7th Lane <b>3 reports</b></div><div className="hotspot hot-a"></div><div className="hotspot hot-b"></div><div className="hotspot hot-c"></div><div className="map-lines"></div></div><div className="hotspot-copy"><span className="eyebrow"><Flame size={15}/> Evidence, not guesswork</span><h2>Spot the pattern.<br/>Fix the root cause.</h2><p>When reports cluster, CivicLoop brings the evidence together — helping the city prioritize the infrastructure that will make the biggest difference.</p><ul><li><span className="bullet teal"></span>Recurring issues mapped in real time</li><li><span className="bullet purple"></span>Clear evidence for better public spending</li><li><span className="bullet orange"></span>Open progress from report to resolution</li></ul><button className="button outline" onClick={() => setView('reports')}>See neighbourhood insights <ArrowRight size={17}/></button></div></motion.section>
    <motion.section className="budget-banner" initial={{opacity:0,scale:.98}} whileInView={{opacity:1,scale:1}} viewport={{once:true,amount:.2}} transition={{duration:.55}}><div><span className="eyebrow"><Landmark size={15}/> Participatory budgeting</span><h2>Your neighbourhood has a budget.<br/><em>Help decide where it goes.</em></h2><p>Vote for public-work proposals backed by real local report data.</p><button className="button light" onClick={() => setView('budget')}>Explore the community budget <ArrowRight size={17}/></button></div><div className="budget-art"><div className="vote-card"><span>Most supported</span><h3>Resurface<br/>Market Road</h3><div className="mini-bar"><i></i></div><small>284 neighbours support this</small></div><div className="budget-circle"><Landmark size={35}/></div></div></motion.section>
  </main>;
}

function ReportCard({ report }) { return <motion.article className="report-card" initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} whileHover={{y:-6,scale:1.01}} viewport={{once:true,amount:.2}} transition={{duration:.32}}><div className="report-visual" style={{background: `${report.color}16`}}><span style={{background: report.color}}>{report.image}</span><div className="category-label" style={{color: report.color}}>{report.category}</div></div><div className="report-body"><div className="report-status"><StatusPill status={report.status}/><span>{report.created}</span></div><h3>{report.title}</h3><p><MapPin size={14}/>{report.area} · {report.distance}</p><Lifecycle status={report.status}/><div className="report-footer"><span><ThumbsUp size={15}/>{report.votes} neighbours</span><button>Details <ChevronRight size={15}/></button></div></div></motion.article> }

function Explore({ reports, query, setQuery, openReport, sortMode, cycleSort, selectReport, t }) { const sortLabel = sortMode === 'recent' ? t('sortRecent') : sortMode === 'support' ? t('sortSupport') : t('sortAttention'); return <main className="page"><div className="page-heading"><div><span className="eyebrow">{t('live')}</span><h1>{t('issues')}</h1><p>Every report is visible. Every update leaves a trail.</p></div><button className="button primary" onClick={openReport}><Plus size={19}/>{t('report')}</button></div><div className="explore-layout"><aside className="filters"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reports"/></div><h4>Issue category</h4>{categories.map((c,i)=><label key={c}><input type="checkbox" defaultChecked={i < 4}/><span>{c}</span><b>{[12,8,7,4,3,2][i]}</b></label>)}<h4>Report status</h4>{['Received','Assigned','In Progress','Resolved'].map(s=><label key={s}><input type="checkbox" defaultChecked/><StatusPill status={s}/></label>)}<button className="text-button" onClick={()=>setQuery('')}>Clear filters</button></aside><section className="issues-list"><div className="list-top"><b>{reports.length} reports nearby</b><span>Sorted by: <button onClick={cycleSort} aria-label="Change issue sort order">{sortLabel} <ChevronRight size={14}/></button></span></div>{reports.map(r=><div className="issue-row" key={r.id}><div className="issue-icon" style={{background:`${r.color}18`, color:r.color}}>{r.image}</div><div className="issue-content"><div><StatusPill status={r.status}/><small>{r.id}</small></div><h3>{r.title}</h3><p><MapPin size={14}/>{r.area} ? {r.distance} <span>?</span> Routed to {r.department}</p></div><div className="issue-row-right"><span><ThumbsUp size={15}/>{r.votes}</span><button onClick={()=>selectReport(r)}>{t('view')} <ChevronRight size={16}/></button></div></div>)}</section><IssueMap reports={reports}/></div></main> }

function ReportDetail({ report, close, support, supported, t }) { return <div className="modal-backdrop" onMouseDown={close}><section className="modal report-detail" onMouseDown={e=>e.stopPropagation()} aria-label="Issue details"><div className="modal-head"><div><span className="eyebrow"><MapPin size={14}/>{t('details')}</span><h2>{report.title}</h2></div><button aria-label="Close issue details" onClick={close}><X size={20}/></button></div><div className="detail-content"><div className="detail-meta"><StatusPill status={report.status}/><span>{report.id}</span><span><MapPin size={14}/>{report.area}</span></div><p>{report.detail}</p>{report.incident_image && <figure className="detail-photo"><img src={report.incident_image} alt="Incident evidence provided with the report"/><figcaption>{t('photo')}</figcaption></figure>}<div className="detail-route"><ClipboardCheck size={19}/><div><b>{t('handling')}</b><span>This report is routed to {report.department}. Its visible lifecycle helps residents follow the issue from report to resolution.</span></div></div><div className="detail-support"><div><ThumbsUp size={19}/><span><b>{report.votes} neighbours support this</b><small>Community support helps show the scale of the problem.</small></span></div><button className={`button ${supported ? 'voted' : 'primary'}`} onClick={support}>{supported ? <><CheckCircle2 size={17}/>{t('supportDone')}</> : <><Heart size={17}/>{t('support')}</>}</button></div></div></section></div>}

function MapViewport({ reports }) {
  const map = useMap();
  useEffect(() => {
    const points = reports.filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    if (points.length > 1) map.fitBounds(points.map(r => [r.lat, r.lng]), { padding: [22, 22], maxZoom: 15 });
  }, [map, reports]);
  return null;
}
function issueMarker(report) {
  return L.divIcon({ className: 'issue-marker-wrap', html: `<span class="issue-marker" style="background:${report.color}"><span>${report.image}</span></span>`, iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -28] });
}
function IssueMap({ reports }) {
  const mappable = reports.filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  return <aside className="map-panel live-map-panel"><div className="map-head"><div><span className="live-dot"></span> Live issue map</div><span>{mappable.length} reports</span></div><div className="leaflet-wrap"><MapContainer center={[20.2961, 85.8245]} zoom={14} scrollWheelZoom className="issue-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapViewport reports={mappable}/>{mappable.map(r => <Marker key={r.id} position={[r.lat, r.lng]} icon={issueMarker(r)}><Popup><div className="map-popup"><b>{r.title}</b><span>{r.category} · {r.status}</span><small>{r.area}<br/>Routed to {r.department}</small></div></Popup></Marker>)}</MapContainer></div><div className="hotspot-list"><b>Map guide</b><p><span className="hotspot-dot red"></span>Tap a marker for status and routing</p><p><span className="hotspot-dot orange"></span>Map centres on reports in your vicinity</p></div></aside>
}

function Budget({ vote, votes, openReport }) { return <main className="page budget-page"><div className="page-heading"><div><span className="eyebrow"><Landmark size={15}/> Participatory budgeting</span><h1>Your voice shapes the city</h1><p>Support public works that are backed by real reports from your neighbourhood.</p></div><div className="budget-total"><small>2026 community fund</small><b>₹18.6 Lakhs</b><span>for Jagmohan Nagar, Bhubaneswar</span></div></div><div className="budget-info"><ShieldCheck size={21}/><span>Each eligible resident can vote once on every proposal. Votes are public in aggregate, private by identity.</span></div><div className="proposal-grid">{proposals.map(p=>{let n=p.votes+(votes[p.id]?1:0);return <article className="proposal" key={p.id}><div className="proposal-top" style={{background:`linear-gradient(140deg, ${p.color}, #15213a)`}}><span>{p.tag}</span><div className="proposal-illustration">{p.tag==='Roads'?'🛣️':p.tag==='Safety'?'💡':'🌧️'}</div></div><div className="proposal-content"><div className="proposal-title"><h2>{p.title}</h2><span>{p.cost}</span></div><p><MapPin size={14}/>{p.location}</p><div className="support"><div><b>{n}</b> neighbour votes</div><span>{Math.round(n/p.target*100)}%</span></div><div className="bar"><i style={{width:`${n/p.target*100}%`,background:p.color}}></i></div><button className={`button ${votes[p.id]?'voted':'primary'} full`} onClick={()=>vote(p.id)}>{votes[p.id]?<><CheckCircle2 size={17}/>Vote recorded</>:<><Heart size={17}/>Support this proposal</>}</button></div></article>})}</div><section className="propose-box"><div><MessageSquareText size={27}/><div><h2>Have another priority in mind?</h2><p>New proposals must be supported by local issue evidence — start by reporting the problem.</p></div></div><button className="button outline" onClick={openReport}>Report an issue <ArrowRight size={17}/></button></section></main> }

function Profile({ reports, setView }) { return <main className="page profile-page"><div className="profile-hero"><Avatar tone="navy">AS</Avatar><div><span className="eyebrow">Civic profile</span><h1>Arnab S.</h1><p>Neighbour · Jagmohan Nagar, Bhubaneswar</p></div><button className="button outline" onClick={()=>setView('reports')}>Explore issues</button></div><div className="profile-stats"><div><strong>4</strong><span>reports raised</span></div><div><strong>12</strong><span>issues supported</span></div><div><strong>3</strong><span>budget votes</span></div></div><section className="section"><div className="section-heading"><div><span className="eyebrow">Your activity</span><h2>Reports you are following</h2></div><button className="button primary" onClick={()=>setView('reports')}>View issues</button></div><div className="report-grid">{reports.slice(0,3).map(r=><ReportCard key={r.id} report={r}/>)}</div></section></main> }

function ReportModal({ form, setForm, close, submit, reports, t }) { const sameCategory = reports.filter(r=>r.category===form.category && r.area===form.area).slice(0,1); return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">New civic report</span><h2>Help us see the issue clearly</h2></div><button onClick={close}><X size={20}/></button></div><form onSubmit={submit}><label>What needs attention?<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Pothole near bus stop" /></label><div className="two-col"><label>Issue type<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Neighbourhood<select value={form.area} onChange={e=>setForm({...form,area:e.target.value})}>{locations.map(location=><option key={location.label} value={location.label}>{location.label}</option>)}</select><small className="location-context">City and state are included for accurate routing.</small></label></div><label>Describe what you saw<textarea value={form.detail} onChange={e=>setForm({...form,detail:e.target.value})} placeholder="Include the landmark, severity, and when you noticed it." rows="4"/></label><label className="photo-upload"><span>{t('addPhoto')}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) return alert('Please choose an image under 2 MB.'); const reader = new FileReader(); reader.onload = () => setForm({...form, incident_image: String(reader.result)}); reader.readAsDataURL(file); }}/><small>{t('photoHint')}</small>{form.incident_image && <div className="photo-preview"><img src={form.incident_image} alt="Incident preview"/><button type="button" onClick={() => setForm({...form,incident_image:''})}>Remove photo</button></div>}</label>{sameCategory.length>0 && form.title && <div className="duplicate-hint"><Sparkles size={18}/><span><b>Possible related issue:</b> {sameCategory[0].title} is already open nearby. We’ll link reports so the team sees the full picture.</span></div>}<div className="privacy-note"><ShieldCheck size={17}/>Your name and contact details are protected by default.</div><div className="modal-actions"><button type="button" className="button soft" onClick={close}>Cancel</button><button className="button primary" type="submit">Submit report <ArrowRight size={17}/></button></div></form></div></div> }
function departmentFor(c){return ({Roads:'Roads & Works',Drainage:'Sanitation & Drainage',Streetlight:'Electrical Maintenance',Waste:'Solid Waste Management',Water:'Water Supply'})[c]||'Civic Response Team'}
function iconFor(c){return ({Roads:'🛣️',Drainage:'🌊',Streetlight:'💡',Waste:'♻️',Water:'💧'})[c]||'📍'}
