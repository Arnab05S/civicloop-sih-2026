# CivicLoop

CivicLoop closes the loop between citizens and cities: reports become traceable work, repeated reports become hotspots, and hotspots become evidence-backed public-work proposals that neighbours can support.

## What is implemented

- Responsive React web experience with reporting, issue exploration, hotspot view, profile, and community budgeting.
- FastAPI backend with persistent local SQLite data.
- Automatic category-to-department routing.
- Lightweight local duplicate flagging using nearby-report + text similarity. The production interface is designed for sentence-transformer embeddings.
- Report status tracking and append-only audit entries.
- Hotspot detection across spatially nearby reports.
- Automatic proposals generated from report hotspots, evidence lookup, and a one-vote-per-demo-resident mechanism.
- Seeded Jagmohan Nagar, Bhubaneswar dataset so the pitch starts with meaningful evidence, not an empty dashboard.

## Run locally

Open two terminals in the project root.

**Backend**

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

**Frontend**

```powershell
npm run dev
```

Open: http://127.0.0.1:5173

## Demo sequence for judges

1. Report a drainage / road / streetlight issue in Jagmohan Nagar, Bhubaneswar.
2. Show automatic department routing and duplicate feedback.
3. Open **Explore issues** to show public status visibility and clustered hotspots.
4. Open **Community budget** and explain that proposals originate from recurring evidence, not a manual list.
5. Show proposal evidence through `GET /proposals/{id}/evidence` in the API docs, then vote once. The audit log (`/audit-log`) proves a transparent change record.

## Production handoff

SQLite is used only to make the hackathon prototype portable. Before deployment, swap storage to PostgreSQL + PostGIS, use `ST_ClusterDBSCAN` for robust hotspot clustering, and replace the demo token similarity function with `sentence-transformers` (`all-MiniLM-L6-v2`). Add authenticated resident eligibility, image storage, staff roles, rate limits, and consent/retention controls before working with real civic reports.

## Differentiator

Civic reporting tools already exist. CivicLoop's differentiator is the visible chain from **real complaint patterns → detected hotspot → generated public-work proposal → privacy-preserving citizen vote → auditable decision**.
