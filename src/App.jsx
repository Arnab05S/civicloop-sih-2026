import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { motion, useScroll, useTransform } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowRight, Bell, CheckCircle2, ChevronRight, CircleAlert, ClipboardCheck,
  FileText, Flame, Heart, Landmark, MapPin, Menu, MessageSquareText,
  MoreHorizontal, Plus, Search, ShieldCheck, Sparkles, ThumbsUp, X
} from 'lucide-react';

const initialReports = [
  { id: 'CL-2026-1842', title: 'Overflowing drain near Community Hall', category: 'Drainage', area: 'Jagmohan Nagar, Bhubaneswar', distance: '120 m', status: 'In Progress', created: 'Today, 10:24 AM', votes: 28, color: '#ff8b3d', detail: 'Drain water is overflowing onto the road after the morning rain. Pedestrians and school buses are affected.', department: 'Sanitation & Drainage', image: '🌊' },
  { id: 'CL-2026-1837', title: 'Broken streetlight at Block C crossing', category: 'Streetlight', area: 'Jagmohan Nagar, Bhubaneswar', distance: '280 m', status: 'Assigned', created: 'Yesterday', votes: 17, color: '#8f6cff', detail: 'The crossing has been dark for the last three nights. Visibility is poor after sunset.', department: 'Electrical Maintenance', image: '💡' },
  { id: 'CL-2026-1828', title: 'Deep pothole on Main Market Road', category: 'Roads', area: 'Jagmohan Nagar, Bhubaneswar', distance: '410 m', status: 'Received', created: '2 days ago', votes: 41, color: '#ef5f70', detail: 'A pothole beside the bus stop is causing traffic to swerve into the opposite lane.', department: 'Roads & Works', image: '🕳️' },
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
const statusStyle = { Received: 'status-received', Assigned: 'status-assigned', 'In Progress': 'status-progress', Resolved: 'status-resolved' };
const normaliseReport = (r) => ({ id: r.ticket || r.id, title: r.title, category: r.category, area: r.area, lat: r.lat, lng: r.lng, distance: 'Nearby', status: r.status, created: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Just now', votes: r.support_count ?? r.votes ?? 1, color: categoryColor[r.category] || '#64748b', detail: r.detail, department: r.department, image: iconFor(r.category) });

function StatusPill({ status }) { return <span className={`status ${statusStyle[status] || ''}`}><span></span>{status}</span>; }
function Avatar({ children, tone = 'teal' }) { return <span className={`avatar ${tone}`}>{children}</span>; }

export default function App() {
  const [view, setView] = useState('home');
  const [reports, setReports] = useState(() => JSON.parse(localStorage.getItem('civicloop-reports') || 'null') || initialReports);
  const [votes, setVotes] = useState(() => JSON.parse(localStorage.getItem('civicloop-votes') || '{}'));
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ title: '', category: 'Roads', detail: '', area: 'Jagmohan Nagar, Bhubaneswar' });
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 650], [0, 85]);

  useEffect(() => localStorage.setItem('civicloop-reports', JSON.stringify(reports)), [reports]);
  useEffect(() => { fetch(`${API}/reports`).then(r => r.ok ? r.json() : Promise.reject()).then(rows => setReports(rows.map(normaliseReport))).catch(() => {}); }, []);
  useEffect(() => localStorage.setItem('civicloop-votes', JSON.stringify(votes)), [votes]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  const filteredReports = useMemo(() => reports.filter(r => `${r.title} ${r.category} ${r.area}`.toLowerCase().includes(query.toLowerCase())), [reports, query]);
  const openReport = () => { setForm({ title: '', category: 'Roads', detail: '', area: 'Jagmohan Nagar, Bhubaneswar' }); setModal(true); };
  const submitReport = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.detail.trim()) return setToast('Please add an issue title and description.');
    try {
      const res = await fetch(`${API}/reports`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...form, lat:20.2961, lng:85.8245}) });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json(); const report = normaliseReport(data.report);
      setReports(current => data.duplicate ? current.map(r => r.id === report.id ? report : r) : [report, ...current]);
      setModal(false); setView('reports'); setToast(data.duplicate ? `Linked to nearby report ${report.id}; its community support is now ${report.votes}.` : `Report ${report.id} logged and routed to ${report.department}.`);
    } catch {
      const report = { id: `CL-2026-${Math.floor(1900 + Math.random() * 700)}`, title: form.title.trim(), category: form.category, area: form.area, distance: 'Just now', status: 'Received', created: 'Just now', votes: 1, color: categoryColor[form.category], detail: form.detail.trim(), department: departmentFor(form.category), image: iconFor(form.category) };
      setReports([report, ...reports]); setModal(false); setView('reports'); setToast(`Report ${report.id} saved in offline demo mode.`);
    }
  };
  const vote = async (id) => { if (votes[id]) return setToast('Your vote is already counted — thank you for participating.'); try { const key = localStorage.getItem('civicloop-voter') || `demo-${crypto.randomUUID()}`; localStorage.setItem('civicloop-voter', key); const res = await fetch(`${API}/proposals/${id}/vote`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter_key:key})}); if (!res.ok && res.status !== 409) throw new Error(); setVotes({ ...votes, [id]: true }); setToast(res.status === 409 ? 'Your previous vote is already recorded in the audit trail.' : 'Vote recorded in the public audit trail.'); } catch { setVotes({ ...votes, [id]: true }); setToast('Vote saved in offline demo mode.'); } };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setView('home')} aria-label="CivicLoop home"><span className="brand-mark"><span></span><span></span><span></span></span><span>Civic<span>Loop</span></span></button>
      <nav className="nav-links">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Home</button>
        <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}>Explore issues</button>
        <button className={view === 'budget' ? 'active' : ''} onClick={() => setView('budget')}>Community budget</button>
      </nav>
      <div className="header-actions"><button className="notification" onClick={() => setToast('You have 2 status updates to review.')}><Bell size={19}/><i></i></button><button className="profile" onClick={() => setMenu(!menu)}><Avatar tone="navy">AS</Avatar><span>Arnab S.</span><ChevronRight size={15} className={menu ? 'rotate' : ''}/></button><button className="mobile-menu" onClick={() => setMenu(!menu)}><Menu size={22}/></button></div>
      {menu && <div className="user-menu"><button onClick={() => {setView('profile');setMenu(false)}}>My civic profile</button><button onClick={() => {setView('reports');setMenu(false)}}>My reports</button><button onClick={() => setToast('Demo mode — no account data is shared.')}>Privacy & data</button></div>}
    </header>

    {view === 'home' && <Home reports={reports} setView={setView} openReport={openReport} vote={vote} votes={votes} heroParallax={heroParallax}/>} 
    {view === 'reports' && <Explore reports={filteredReports} query={query} setQuery={setQuery} openReport={openReport} setView={setView}/>} 
    {view === 'budget' && <Budget vote={vote} votes={votes} openReport={openReport}/>} 
    {view === 'profile' && <Profile reports={reports} setView={setView}/>} 

    <footer><div className="footer-brand"><span className="brand-mark small"><span></span><span></span><span></span></span> Civic<span>Loop</span></div><p>Transparent action. Better cities, together.</p><div><a href="#privacy" onClick={(e)=>{e.preventDefault();setToast('CivicLoop protects identities by default in this demo.')}}>Privacy</a><a href="#about" onClick={(e)=>{e.preventDefault();setToast('Built for SOA Ideathon 2026.')}}>About</a><a href="#help" onClick={(e)=>{e.preventDefault();setToast('Help center coming soon.')}}>Help</a></div></footer>
    {modal && <ReportModal form={form} setForm={setForm} close={() => setModal(false)} submit={submitReport} reports={reports}/>} 
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={() => setToast('')}><X size={16}/></button></div>}
  </div>;
}

function Home({ reports, setView, openReport, vote, votes, heroParallax }) {
  const recent = reports.slice(0, 3);
  return <main>
    <motion.section className="hero" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.55}}><motion.div className="hero-copy" initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.08}}><div className="eyebrow"><Sparkles size={15}/> Community-powered civic action</div><h1>See an issue.<br/><em>Start a solution.</em></h1><p>CivicLoop turns everyday reports into visible action — and gives your neighbourhood a say in what gets fixed next.</p><div className="hero-actions"><button className="button primary" onClick={openReport}><Plus size={19}/>Report an issue</button><button className="button soft" onClick={() => setView('reports')}>Explore local issues <ArrowRight size={17}/></button></div><div className="trust-row"><div className="people"><Avatar>RK</Avatar><Avatar tone="orange">PM</Avatar><Avatar tone="purple">S</Avatar><Avatar tone="green">A</Avatar></div><span>Joined by <b>2,400+ neighbours</b> this month</span></div></motion.div><motion.div className="hero-art" style={{y:heroParallax}} initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{duration:.7,delay:.15}}><div className="city-sun"></div><div className="cityscape"><span></span><span></span><span></span><span></span><span></span><span></span></div><div className="issue-pin pin-one"><CircleAlert size={16}/><b>12</b></div><div className="issue-pin pin-two"><Flame size={16}/></div><div className="issue-pin pin-three"><CheckCircle2 size={16}/></div><div className="map-card"><div><span className="live-dot"></span> Live in your area</div><b>24 active reports</b><button onClick={() => setView('reports')}>View map <ArrowRight size={14}/></button></div></motion.div></motion.section>
    <motion.section className="metrics" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.35}} transition={{duration:.45}}><div><strong>1,284</strong><span>issues reported</span></div><div><strong>78%</strong><span>resolved this quarter</span></div><div><strong>₹18.6L</strong><span>community budget voted</span></div><div><strong>3,950</strong><span>neighbours engaged</span></div></motion.section>
    <motion.section className="section recent-section" initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.5}}><div className="section-heading"><div><span className="eyebrow">Around Jagmohan Nagar, Bhubaneswar</span><h2>What your neighbours are reporting</h2><p>Track the issues that matter where you live.</p></div><button className="text-button" onClick={() => setView('reports')}>View all issues <ArrowRight size={17}/></button></div><div className="report-grid">{recent.map(r => <ReportCard key={r.id} report={r} />)}</div></motion.section>
    <motion.section className="section hotspot-wrap" initial={{opacity:0,y:32}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.18}} transition={{duration:.55}}><div className="hotspot-graphic"><div className="map-label label-a">Market Road <b>7 reports</b></div><div className="map-label label-b">Community Hall <b>5 reports</b></div><div className="map-label label-c">7th Lane <b>3 reports</b></div><div className="hotspot hot-a"></div><div className="hotspot hot-b"></div><div className="hotspot hot-c"></div><div className="map-lines"></div></div><div className="hotspot-copy"><span className="eyebrow"><Flame size={15}/> Evidence, not guesswork</span><h2>Spot the pattern.<br/>Fix the root cause.</h2><p>When reports cluster, CivicLoop brings the evidence together — helping the city prioritize the infrastructure that will make the biggest difference.</p><ul><li><span className="bullet teal"></span>Recurring issues mapped in real time</li><li><span className="bullet purple"></span>Clear evidence for better public spending</li><li><span className="bullet orange"></span>Open progress from report to resolution</li></ul><button className="button outline" onClick={() => setView('reports')}>See neighbourhood insights <ArrowRight size={17}/></button></div></motion.section>
    <motion.section className="budget-banner" initial={{opacity:0,scale:.98}} whileInView={{opacity:1,scale:1}} viewport={{once:true,amount:.2}} transition={{duration:.55}}><div><span className="eyebrow"><Landmark size={15}/> Participatory budgeting</span><h2>Your neighbourhood has a budget.<br/><em>Help decide where it goes.</em></h2><p>Vote for public-work proposals backed by real local report data.</p><button className="button light" onClick={() => setView('budget')}>Explore the community budget <ArrowRight size={17}/></button></div><div className="budget-art"><div className="vote-card"><span>Most supported</span><h3>Resurface<br/>Market Road</h3><div className="mini-bar"><i></i></div><small>284 neighbours support this</small></div><div className="budget-circle"><Landmark size={35}/></div></div></motion.section>
  </main>;
}

function ReportCard({ report }) { return <motion.article className="report-card" initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} whileHover={{y:-6,scale:1.01}} viewport={{once:true,amount:.2}} transition={{duration:.32}}><div className="report-visual" style={{background: `${report.color}16`}}><span style={{background: report.color}}>{report.image}</span><div className="category-label" style={{color: report.color}}>{report.category}</div></div><div className="report-body"><div className="report-status"><StatusPill status={report.status}/><span>{report.created}</span></div><h3>{report.title}</h3><p><MapPin size={14}/>{report.area} · {report.distance}</p><div className="report-footer"><span><ThumbsUp size={15}/>{report.votes} neighbours</span><button>Details <ChevronRight size={15}/></button></div></div></motion.article> }

function Explore({ reports, query, setQuery, openReport, setView }) { return <main className="page"><div className="page-heading"><div><span className="eyebrow">Live civic pulse</span><h1>Issues in your area</h1><p>Every report is visible. Every update leaves a trail.</p></div><button className="button primary" onClick={openReport}><Plus size={19}/>Report an issue</button></div><div className="explore-layout"><aside className="filters"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reports"/></div><h4>Issue category</h4>{categories.map((c,i)=><label key={c}><input type="checkbox" defaultChecked={i < 4}/><span>{c}</span><b>{[12,8,7,4,3,2][i]}</b></label>)}<h4>Report status</h4>{['Received','Assigned','In Progress','Resolved'].map(s=><label key={s}><input type="checkbox" defaultChecked/><StatusPill status={s}/></label>)}<button className="text-button" onClick={()=>setQuery('')}>Clear filters</button></aside><section className="issues-list"><div className="list-top"><b>{reports.length} reports nearby</b><span>Sorted by: <button>Most recent <ChevronRight size={14}/></button></span></div>{reports.map(r=><div className="issue-row" key={r.id}><div className="issue-icon" style={{background:`${r.color}18`, color:r.color}}>{r.image}</div><div className="issue-content"><div><StatusPill status={r.status}/><small>{r.id}</small></div><h3>{r.title}</h3><p><MapPin size={14}/>{r.area} · {r.distance} <span>·</span> Routed to {r.department}</p></div><div className="issue-row-right"><span><ThumbsUp size={15}/>{r.votes}</span><button onClick={()=>setView('home')}>View <ChevronRight size={16}/></button></div></div>)}</section><IssueMap reports={reports}/></div></main> }

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

function ReportModal({ form, setForm, close, submit, reports }) { const sameCategory = reports.filter(r=>r.category===form.category && r.area===form.area).slice(0,1); return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">New civic report</span><h2>Help us see the issue clearly</h2></div><button onClick={close}><X size={20}/></button></div><form onSubmit={submit}><label>What needs attention?<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Pothole near bus stop" /></label><div className="two-col"><label>Issue type<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Neighbourhood<select value={form.area} onChange={e=>setForm({...form,area:e.target.value})}><option>Jagmohan Nagar, Bhubaneswar</option><option>Saheed Nagar</option><option>Patia</option></select></label></div><label>Describe what you saw<textarea value={form.detail} onChange={e=>setForm({...form,detail:e.target.value})} placeholder="Include the landmark, severity, and when you noticed it." rows="4"/></label>{sameCategory.length>0 && form.title && <div className="duplicate-hint"><Sparkles size={18}/><span><b>Possible related issue:</b> {sameCategory[0].title} is already open nearby. We’ll link reports so the team sees the full picture.</span></div>}<div className="privacy-note"><ShieldCheck size={17}/>Your name and contact details are protected by default.</div><div className="modal-actions"><button type="button" className="button soft" onClick={close}>Cancel</button><button className="button primary" type="submit">Submit report <ArrowRight size={17}/></button></div></form></div></div> }
function departmentFor(c){return ({Roads:'Roads & Works',Drainage:'Sanitation & Drainage',Streetlight:'Electrical Maintenance',Waste:'Solid Waste Management',Water:'Water Supply'})[c]||'Civic Response Team'}
function iconFor(c){return ({Roads:'🛣️',Drainage:'🌊',Streetlight:'💡',Waste:'♻️',Water:'💧'})[c]||'📍'}
