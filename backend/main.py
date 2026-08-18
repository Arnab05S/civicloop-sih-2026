"""CivicLoop demo API.

Portable hackathon implementation: SQLite stores the demo data locally. In production, migrate the
reports table to PostgreSQL + PostGIS and replace the grid clustering function with ST_ClusterDBSCAN.
"""
from __future__ import annotations

import math
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import numpy as np
from sentence_transformers import SentenceTransformer

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "civicloop.db"
app = FastAPI(title="CivicLoop API", version="0.1.0", description="Evidence-grounded civic reporting and participatory budgeting.")
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"], allow_origin_regex=r"https://([a-z0-9-]+\.)?vercel\.app", allow_methods=["*"], allow_headers=["*"])

print("Loading AI Embedding Model (all-MiniLM-L6-v2)...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("AI Model loaded successfully!")

DEPARTMENTS = {
    "Roads": "Roads & Works", "Drainage": "Sanitation & Drainage", "Streetlight": "Electrical Maintenance",
    "Waste": "Solid Waste Management", "Water": "Water Supply", "Other": "Civic Response Team"
}
VALID_STATUS = {"Received", "Assigned", "In Progress", "Resolved"}

class ReportCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    category: str
    detail: str = Field(min_length=8, max_length=1500)
    area: str = Field(default="Jagmohan Nagar, Bhubaneswar", max_length=80)
    lat: float = 20.2961
    lng: float = 85.8245
    incident_image: str | None = Field(default=None, max_length=1_600_000)

class StatusUpdate(BaseModel):
    status: Literal["Received", "Assigned", "In Progress", "Resolved"]
    resolution_photo_url: str | None = None

class VoteCreate(BaseModel):
    voter_key: str = Field(min_length=3, max_length=80)

@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

def as_dict(row):
    return dict(row) if row else None

def log_event(conn, event_type: str, entity_type: str, entity_id: int, summary: str):
    conn.execute("INSERT INTO audit_log (event_type, entity_type, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?)", (event_type, entity_type, entity_id, summary, now()))

def distance_m(lat1, lng1, lat2, lng2):
    # Sufficient for small-neighbourhood demo radius calculations.
    return math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2) * 111_000

def init_db():
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT, ticket TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
            category TEXT NOT NULL, detail TEXT NOT NULL, area TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Received', department TEXT NOT NULL, support_count INTEGER NOT NULL DEFAULT 1,
            duplicate_of INTEGER, incident_image TEXT, resolution_photo_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT, hotspot_key TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
            category TEXT NOT NULL, area TEXT NOT NULL, report_count INTEGER NOT NULL, severity INTEGER NOT NULL,
            estimated_cost TEXT NOT NULL, votes INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, proposal_id INTEGER NOT NULL, voter_key TEXT NOT NULL,
            created_at TEXT NOT NULL, UNIQUE(proposal_id, voter_key)
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL
        );
        """)
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(reports)").fetchall()}
        if "incident_image" not in columns:
            conn.execute("ALTER TABLE reports ADD COLUMN incident_image TEXT")
        has_rows = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
        if not has_rows:
            seed_reports(conn)
        seed_city_demo_reports(conn)

def seed_reports(conn):
    samples = [
        ("Overflowing drain near Community Hall", "Drainage", "Drain water is overflowing onto the road after morning rain. Pedestrians and school buses are affected.", "Jagmohan Nagar, Bhubaneswar", 20.2958, 85.8242, "In Progress", 28),
        ("Drain blocked beside Community Hall", "Drainage", "The roadside drain has been blocked and dirty water is flowing onto the lane.", "Jagmohan Nagar, Bhubaneswar", 20.2960, 85.8246, "Assigned", 19),
        ("Water logging at Community Hall corner", "Drainage", "Heavy rain causes water to collect near the community hall entrance every day.", "Jagmohan Nagar, Bhubaneswar", 20.2956, 85.8243, "Received", 14),
        ("Broken streetlight at Block C crossing", "Streetlight", "The crossing has been dark for three nights. Visibility is poor after sunset.", "Jagmohan Nagar, Bhubaneswar", 20.2972, 85.8261, "Assigned", 17),
        ("Streetlight not working near Block C park", "Streetlight", "Lamp pole is off near the park gate and children walk through this road at night.", "Jagmohan Nagar, Bhubaneswar", 20.2973, 85.8263, "Received", 11),
        ("Deep pothole on Main Market Road", "Roads", "A pothole beside the bus stop makes traffic swerve into the opposite lane.", "Jagmohan Nagar, Bhubaneswar", 20.2940, 85.8230, "Received", 41),
        ("Large road crater near Market bus stop", "Roads", "Large hole in the road at the bus stop is dangerous for motorcycles and autos.", "Jagmohan Nagar, Bhubaneswar", 20.2942, 85.8232, "In Progress", 25),
        ("Uneven road surface on Market Road", "Roads", "The road surface has multiple deep breaks along the market corridor.", "Jagmohan Nagar, Bhubaneswar", 20.2943, 85.8228, "Assigned", 16),
        ("Waste collection missed on 7th Lane", "Waste", "Household waste has not been collected since Monday.", "Saheed Nagar", 20.3014, 85.8290, "Resolved", 13),
    ]
    for idx, (title, cat, detail, area, lat, lng, status, support) in enumerate(samples, 1):
        stamp = now()
        cur = conn.execute("""INSERT INTO reports (ticket,title,category,detail,area,lat,lng,status,department,support_count,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (f"CL-2026-{1800+idx}", title, cat, detail, area, lat, lng, status, DEPARTMENTS[cat], support, stamp, stamp))
        log_event(conn, "report_seeded", "report", cur.lastrowid, f"Seeded report: {title}")
    generate_proposals(conn)

def seed_city_demo_reports(conn):
    """Add a few Mumbai examples once, without changing existing demo or user reports."""
    samples = [
        ("Water logging near Bandra Bandstand", "Drainage", "Rainwater collects along the Bandstand promenade and blocks the pedestrian path after showers.", "Bandra West, Mumbai, Maharashtra", 19.0601, 72.8197, "Received", 22),
        ("Storm drain blocked on Hill Road", "Drainage", "The roadside drain on Hill Road is blocked with debris and causes water to spill onto the carriageway.", "Bandra West, Mumbai, Maharashtra", 19.0614, 72.8251, "Assigned", 18),
        ("Damaged footpath near Linking Road", "Roads", "Broken paving near Linking Road forces pedestrians onto the busy road during the evening rush.", "Bandra West, Mumbai, Maharashtra", 19.0652, 72.8338, "In Progress", 16),
        ("Streetlight out on Carter Road", "Streetlight", "A lamp post near Carter Road promenade has been off for several nights and the walkway is poorly lit.", "Bandra West, Mumbai, Maharashtra", 19.0678, 72.8199, "Received", 14),
        ("Damaged footpath near Hauz Khas Metro", "Roads", "Broken paving near Hauz Khas Metro forces pedestrians toward the road during busy evening hours.", "Hauz Khas, New Delhi, Delhi", 28.5438, 77.2060, "Assigned", 20),
        ("Streetlight dark near Deer Park", "Streetlight", "The pathway beside Deer Park is poorly lit after sunset because a streetlight has stopped working.", "Hauz Khas, New Delhi, Delhi", 28.5542, 77.1948, "Received", 15),
        ("Water logging near Adyar Bridge", "Drainage", "Rainwater builds up near Adyar Bridge and slows pedestrians, buses and two-wheelers during monsoon showers.", "Adyar, Chennai, Tamil Nadu", 13.0060, 80.2551, "In Progress", 24),
        ("Waste bins overflowing in Besant Nagar", "Waste", "Public bins near the beach-side lane have not been cleared and waste is overflowing onto the footpath.", "Besant Nagar, Chennai, Tamil Nadu", 13.0012, 80.2664, "Received", 17),
    ]
    inserted = False
    for idx, (title, cat, detail, area, lat, lng, status, support) in enumerate(samples, 10):
        ticket = f"CL-2026-{1800 + idx}"
        exists = conn.execute("SELECT id FROM reports WHERE ticket=?", (ticket,)).fetchone()
        if exists:
            continue
        stamp = now()
        cur = conn.execute("""INSERT INTO reports (ticket,title,category,detail,area,lat,lng,status,department,support_count,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (ticket, title, cat, detail, area, lat, lng, status, DEPARTMENTS[cat], support, stamp, stamp))
        log_event(conn, "report_seeded", "report", cur.lastrowid, f"Seeded Mumbai demo report: {title}")
        inserted = True
    if inserted:
        generate_proposals(conn)

def cluster_reports(rows, radius=350):
    remaining = [dict(r) for r in rows]
    clusters = []
    while remaining:
        anchor = remaining.pop(0)
        cluster = [anchor]
        changed = True
        while changed:
            changed = False
            for candidate in remaining[:]:
                if candidate["category"] != anchor["category"]:
                    continue
                if any(distance_m(candidate["lat"], candidate["lng"], x["lat"], x["lng"]) <= radius for x in cluster):
                    cluster.append(candidate); remaining.remove(candidate); changed = True
        if len(cluster) >= 2:
            clusters.append(cluster)
    return clusters

def generate_proposals(conn):
    rows = conn.execute("SELECT * FROM reports WHERE duplicate_of IS NULL").fetchall()
    created = 0
    for cluster in cluster_reports(rows):
        category, area = cluster[0]["category"], cluster[0]["area"]
        report_ids = sorted(x["id"] for x in cluster)
        key = f"{category}:{area}:{','.join(map(str, report_ids))}"
        title = f"{category} upgrade — {len(cluster)} reports near {area}"
        severity = sum(x["support_count"] for x in cluster)
        cost = {"Roads": "₹4.5L", "Drainage": "₹5.8L", "Streetlight": "₹3.1L"}.get(category, "₹2.5L")
        exists = conn.execute("SELECT id FROM proposals WHERE hotspot_key=?", (key,)).fetchone()
        if not exists:
            cur = conn.execute("INSERT INTO proposals (hotspot_key,title,category,area,report_count,severity,estimated_cost,created_at) VALUES (?,?,?,?,?,?,?,?)", (key,title,category,area,len(cluster),severity,cost,now()))
            log_event(conn, "proposal_generated", "proposal", cur.lastrowid, f"Proposal generated from {len(cluster)} {category.lower()} reports in {area}")
            created += 1
    return created

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"message": "CivicLoop backend is alive", "docs": "/docs"}

@app.get("/health")
def health():
    return {"ok": True, "storage": "SQLite demo database", "production_migration": "PostgreSQL + PostGIS"}

@app.get("/reports")
def list_reports(area: str | None = None, category: str | None = None, status: str | None = None):
    clauses, vals = ["1=1"], []
    for col, value in (("area", area), ("category", category), ("status", status)):
        if value:
            clauses.append(f"{col}=?"); vals.append(value)
    with db() as conn:
        rows = conn.execute(f"SELECT * FROM reports WHERE {' AND '.join(clauses)} ORDER BY created_at DESC", vals).fetchall()
    return [as_dict(row) for row in rows]

@app.get("/reports/{ticket}")
def get_report(ticket: str):
    with db() as conn:
        report = conn.execute("SELECT * FROM reports WHERE ticket=?", (ticket,)).fetchone()
        if not report: raise HTTPException(404, "Report not found")
        events = conn.execute("SELECT * FROM audit_log WHERE entity_type='report' AND entity_id=? ORDER BY created_at ASC", (report["id"],)).fetchall()
    return {"report": as_dict(report), "audit_trail": [as_dict(e) for e in events]}

@app.post("/reports", status_code=201)
def create_report(payload: ReportCreate):
    category = payload.category if payload.category in DEPARTMENTS else "Other"
    with db() as conn:
        nearby = conn.execute("SELECT * FROM reports WHERE category=? AND duplicate_of IS NULL", (category,)).fetchall()
        
        match = None
        if nearby:
            new_vector = model.encode([payload.detail])[0]
            norm_new = np.linalg.norm(new_vector)
            
            for r in nearby:
                if distance_m(payload.lat, payload.lng, r["lat"], r["lng"]) <= 250:
                    existing_vector = model.encode([r["detail"]])[0]
                    norm_existing = np.linalg.norm(existing_vector)
                    
                    similarity = np.dot(new_vector, existing_vector) / (norm_new * norm_existing)
                    
                    if similarity >= 0.50:
                        match = r
                        break

        if match:
            conn.execute("UPDATE reports SET support_count=support_count+1, updated_at=? WHERE id=?", (now(), match["id"]))
            log_event(conn, "duplicate_confirmed", "report", match["id"], f"A similar report was linked; support count increased.")
            report = conn.execute("SELECT * FROM reports WHERE id=?", (match["id"],)).fetchone()
            return {"report": as_dict(report), "duplicate": True, "message": "Linked to a nearby related report."}
        
        count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0] + 1
        stamp = now(); ticket = f"CL-2026-{1800+count}"
        cur = conn.execute("""INSERT INTO reports (ticket,title,category,detail,area,lat,lng,status,department,incident_image,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (ticket,payload.title,category,payload.detail,payload.area,payload.lat,payload.lng,"Received",DEPARTMENTS[category],payload.incident_image,stamp,stamp))
        log_event(conn, "report_created", "report", cur.lastrowid, f"Report received and routed to {DEPARTMENTS[category]}.")
        generate_proposals(conn)
        report = conn.execute("SELECT * FROM reports WHERE id=?", (cur.lastrowid,)).fetchone()
        
    return {"report": as_dict(report), "duplicate": False, "message": "Report logged and routed."}

@app.put("/reports/{ticket}/status")
def update_status(ticket: str, payload: StatusUpdate):
    with db() as conn:
        report = conn.execute("SELECT * FROM reports WHERE ticket=?", (ticket,)).fetchone()
        if not report: raise HTTPException(404, "Report not found")
        conn.execute("UPDATE reports SET status=?, resolution_photo_url=COALESCE(?,resolution_photo_url), updated_at=? WHERE id=?", (payload.status,payload.resolution_photo_url,now(),report["id"]))
        log_event(conn, "status_updated", "report", report["id"], f"Status changed from {report['status']} to {payload.status}.")
        updated = conn.execute("SELECT * FROM reports WHERE id=?", (report["id"],)).fetchone()
    return as_dict(updated)

@app.get("/hotspots")
def hotspots():
    with db() as conn:
        clusters = cluster_reports(conn.execute("SELECT * FROM reports WHERE duplicate_of IS NULL").fetchall())
    return [{"category": c[0]["category"], "area": c[0]["area"], "report_count": len(c), "support_count": sum(x["support_count"] for x in c), "lat": sum(x["lat"] for x in c)/len(c), "lng": sum(x["lng"] for x in c)/len(c), "report_tickets": [x["ticket"] for x in c]} for c in clusters]

@app.post("/proposals/generate")
def regenerate_proposals():
    with db() as conn:
        created = generate_proposals(conn)
    return {"created": created}

@app.get("/proposals")
def list_proposals():
    with db() as conn:
        rows = conn.execute("SELECT * FROM proposals ORDER BY (votes + severity/10.0) DESC, created_at DESC").fetchall()
    return [as_dict(row) for row in rows]

@app.get("/proposals/{proposal_id}/evidence")
def proposal_evidence(proposal_id: int):
    with db() as conn:
        proposal = conn.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
        if not proposal: raise HTTPException(404, "Proposal not found")
        reports = conn.execute("SELECT * FROM reports WHERE category=? AND area=? AND duplicate_of IS NULL ORDER BY support_count DESC", (proposal["category"], proposal["area"])).fetchall()
    return {"proposal": as_dict(proposal), "reports": [as_dict(r) for r in reports]}

@app.post("/proposals/{proposal_id}/vote")
def vote(proposal_id: int, payload: VoteCreate):
    with db() as conn:
        proposal = conn.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
        if not proposal: raise HTTPException(404, "Proposal not found")
        try:
            conn.execute("INSERT INTO votes (proposal_id,voter_key,created_at) VALUES (?,?,?)", (proposal_id,payload.voter_key,now()))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "This voter has already supported this proposal.")
        conn.execute("UPDATE proposals SET votes=votes+1 WHERE id=?", (proposal_id,))
        log_event(conn, "vote_cast", "proposal", proposal_id, "Anonymous resident vote recorded.")
        updated = conn.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
    return as_dict(updated)

@app.get("/audit-log")
def audit_log(limit: int = 50):
    with db() as conn:
        rows = conn.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?", (min(max(limit, 1), 100),)).fetchall()
    return [as_dict(row) for row in rows]