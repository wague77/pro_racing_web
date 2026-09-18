import os
import re
import time
import asyncio
import logging
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Annotated

import jwt
import bcrypt
import httpx
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator
from bson import ObjectId
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET_KEY"]
JWT_ALGO = "HS256"
ADMIN_USERNAME = os.environ["ADMIN_USERNAME"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
PMU_BASE_URL = os.environ["PMU_BASE_URL"]

# Google Play — vérification serveur des achats (IAP)
GOOGLE_PLAY_PACKAGE_NAME = os.environ.get("GOOGLE_PLAY_PACKAGE_NAME", "com.emergent.pmupredictor.mh7rhy")
GOOGLE_PLAY_SA_JSON = os.environ.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "").strip()

PMU_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("turfpro")

app = FastAPI(title="TurfPro API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Mongo helpers
# ---------------------------------------------------------------------------
def _to_str_id(v) -> str:
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_to_str_id)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Simple in-memory TTL cache for PMU responses (avoid IP throttling)
# ---------------------------------------------------------------------------
_CACHE: dict = {}


def cache_get(key: str, ttl: int):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def cache_set(key: str, value):
    _CACHE[key] = (time.time(), value)


def pmu_fetch(path: str, ttl: int = 60):
    cached = cache_get(path, ttl)
    if cached is not None:
        return cached
    url = f"{PMU_BASE_URL}/{path}"
    try:
        resp = requests.get(url, headers=PMU_HEADERS, timeout=12)
    except requests.RequestException as e:
        logger.error("PMU request failed: %s", e)
        raise HTTPException(status_code=502, detail="Impossible de contacter l'API PMU")
    if resp.status_code == 204 or not resp.content:
        return None
    if resp.status_code != 200:
        logger.warning("PMU %s -> %s", url, resp.status_code)
        raise HTTPException(status_code=502, detail=f"Erreur API PMU ({resp.status_code})")
    data = resp.json()
    cache_set(path, data)
    return data


# ---------------------------------------------------------------------------
# Auth models & utils
# ---------------------------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class AdminLogin(BaseModel):
    password: str


class RedeemRequest(BaseModel):
    code: str


class CreateCodeRequest(BaseModel):
    label: Optional[str] = None
    max_uses: Optional[int] = None  # None = unlimited
    expires_days: Optional[float] = None  # None = n'expire jamais
    expires_at: Optional[str] = None  # date ISO précise (prioritaire sur expires_days)


class AccessCodeOut(BaseModel):
    id: PyObjectId = Field(alias="_id", serialization_alias="id")
    code: str
    label: Optional[str] = None
    active: bool = True
    usage_count: int = 0
    max_uses: Optional[int] = None
    created_at: str
    expires_at: Optional[str] = None
    online_count: Optional[int] = 0

    model_config = {"populate_by_name": True}


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(subject: str, role: str, extra: dict | None = None) -> str:
    payload = {"sub": subject, "role": role, "exp": now_utc() + timedelta(days=30)}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


async def require_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    payload = decode_token(creds.credentials)
    
    role = payload.get("role")
    code = payload.get("code")

    if role == "demo" or (role == "user" and code == "ACCÈS LIBRE"):
        state = await free_access_state()
        if not state["active"]:
            raise HTTPException(status_code=401, detail="Le mode démo a été désactivé")
    elif role == "user" and code and code not in ("DEMO", "IAP"):
        code_id = payload.get("sub")
        try:
            from bson import ObjectId
            oid = ObjectId(code_id)
            code_doc = await db.access_codes.find_one({"_id": oid})
            if not code_doc or not code_doc.get("active"):
                raise HTTPException(status_code=401, detail="Code d'accès révoqué ou supprimé")
        except Exception:
            raise HTTPException(status_code=401, detail="Token invalide")

    return payload


async def require_admin(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    payload = decode_token(creds.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return payload


async def require_full(user: dict = Depends(require_user)) -> dict:
    """Réservé à l'accès complet : refuse le mode démo (403)."""
    if user.get("role") == "demo":
        raise HTTPException(status_code=403, detail="Fonctionnalité réservée à l'accès complet")
    return user


# ---------------------------------------------------------------------------
# Pronostic algorithm (weighted advanced analysis)
# ---------------------------------------------------------------------------
def parse_musique(musique: Optional[str]) -> List[int]:
    """Return list of finishing positions, most recent first. 0 = disqualified/fell."""
    if not musique:
        return []
    tokens = re.findall(r"(\d{1,2}|[DTARN])([ampts])", musique)
    out = []
    for pos, _disc in tokens:
        out.append(int(pos) if pos.isdigit() else 0)
    return out


def form_score(musique: Optional[str]) -> float:
    results = parse_musique(musique)
    if not results:
        return 50.0
    total_w = 0.0
    total_s = 0.0
    for i, pos in enumerate(results[:8]):
        w = 0.88 ** i
        if pos == 1:
            s = 100
        elif pos == 2:
            s = 82
        elif pos == 3:
            s = 66
        elif pos in (4, 5):
            s = 46
        elif pos in (6, 7):
            s = 30
        elif pos == 0:
            s = 8
        else:
            s = 20
        total_s += s * w
        total_w += w
    return total_s / total_w if total_w else 50.0


def _clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))


def get_cote(p: dict) -> Optional[float]:
    for key in ("dernierRapportDirect", "dernierRapportReference"):
        r = p.get(key)
        if r and isinstance(r.get("rapport"), (int, float)) and r["rapport"] > 0:
            return float(r["rapport"])
    return None


DEFAULT_ANALYSIS = {"favoriMax": 6.0, "outsiderMax": 15.0, "baisseSeuil": 5.0, "scoreMinJouer": 55.0}


def cote_categorie(cote: Optional[float], cfg: Optional[dict] = None) -> str:
    """Classe un cheval selon sa cote : favori (vert) / outsider (orange) / tocard (rouge)."""
    cfg = cfg or DEFAULT_ANALYSIS
    if cote is None or cote <= 0:
        return "inconnu"
    if cote <= cfg["favoriMax"]:
        return "favori"
    if cote <= cfg["outsiderMax"]:
        return "outsider"
    return "tocard"


def compute_pronostic(participants: List[dict], cfg: Optional[dict] = None) -> List[dict]:
    cfg = cfg or DEFAULT_ANALYSIS
    runners = [p for p in participants if p.get("statut") == "PARTANT"]
    if not runners:
        runners = participants

    implied = {}
    earnings_per = {}
    for p in runners:
        num = p.get("numPmu")
        cote = get_cote(p)
        implied[num] = (1.0 / cote) if cote else 0.0
        nc = p.get("nombreCourses") or 0
        gains = (p.get("gainsParticipant") or {}).get("gainsCarriere") or 0
        earnings_per[num] = (gains / nc) if nc else 0.0

    max_implied = max(implied.values()) if implied else 0.0
    max_implied = max_implied or 1.0
    max_earn = max(earnings_per.values()) if earnings_per else 0.0
    max_earn = max_earn or 1.0

    W = {"market": 0.30, "form": 0.25, "win": 0.15, "place": 0.12, "earn": 0.18}
    scored = []
    for p in runners:
        num = p.get("numPmu")
        nc = p.get("nombreCourses") or 0
        nv = p.get("nombreVictoires") or 0
        npl = p.get("nombrePlaces") or 0

        cote = get_cote(p)
        market = _clamp((implied[num] / max_implied) * 100)
        form = form_score(p.get("musique"))
        win = _clamp((nv / nc) * 300) if nc else 45.0
        place = _clamp((npl / nc) * 130) if nc else 45.0
        earn = _clamp((earnings_per[num] / max_earn) * 100)

        score = (
            market * W["market"]
            + form * W["form"]
            + win * W["win"]
            + place * W["place"]
            + earn * W["earn"]
        )

        drivers = [
            ("cote favorable" if cote and cote < 6 else None, market),
            ("forme récente solide", form),
            (f"{nv} victoire(s) sur {nc} courses" if nc else None, win),
            ("régularité aux places", place),
            ("gains de carrière élevés", earn),
        ]
        drivers = [d for d in drivers if d[0]]
        drivers.sort(key=lambda x: x[1], reverse=True)
        reasons = [d[0] for d in drivers[:2]]
        reasoning = " · ".join(reasons) if reasons else "Analyse statistique"

        scored.append(
            {
                "numPmu": num,
                "nom": p.get("nom"),
                "driver": p.get("driver"),
                "entraineur": p.get("entraineur"),
                "cote": cote,
                "categorie": cote_categorie(cote, cfg),
                "musique": p.get("musique"),
                "score": round(score, 1),
                "reasoning": reasoning,
                "breakdown": {
                    "cote": round(market, 1),
                    "forme": round(form, 1),
                    "victoires": round(win, 1),
                    "places": round(place, 1),
                    "gains": round(earn, 1),
                },
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    best = scored[0]["score"] if scored else 100
    for i, s in enumerate(scored):
        s["rank"] = i + 1
        s["confidence"] = round((s["score"] / best) * 100) if best else 0
    return scored


def compute_tocards(scored: List[dict], top_n: int = 8, cfg: Optional[dict] = None) -> List[dict]:
    """Outsiders à jouer en dehors du top IA : grosses cotes mais profil intéressant."""
    cfg = cfg or DEFAULT_ANALYSIS
    candidates = [
        s for s in scored if s.get("rank", 99) > top_n and s.get("cote") and s["cote"] >= 8
    ]
    # priorise le meilleur score parmi les outsiders (le marché les sous-estime)
    candidates.sort(key=lambda x: x["score"], reverse=True)
    out = []
    for s in candidates[:3]:
        forme = (s.get("breakdown") or {}).get("forme", 0)
        why = "forme intéressante" if forme >= 55 else "profil à surprise"
        out.append(
            {
                "numPmu": s["numPmu"],
                "nom": s["nom"],
                "driver": s["driver"],
                "cote": s["cote"],
                "categorie": cote_categorie(s["cote"], cfg),
                "score": s["score"],
                "rank": s["rank"],
                "reasoning": f"Grosse cote ({s['cote']:.0f}/1) · {why}",
            }
        )
    return out


def _rapport_val(p: dict, key: str) -> Optional[float]:
    r = p.get(key)
    if r and isinstance(r.get("rapport"), (int, float)) and r["rapport"] > 0:
        return float(r["rapport"])
    return None


def compute_cotes_analysis(participants: List[dict], cfg: Optional[dict] = None) -> dict:
    """Analyse de l'évolution des cotes (référence matin -> direct live) et projection
    de la cote cible au départ, avec signal 'à jouer' pour les chevaux dont l'argent rentre."""
    cfg = cfg or DEFAULT_ANALYSIS
    seuil = cfg["baisseSeuil"]
    score_min = cfg["scoreMinJouer"]
    runners = [p for p in participants if p.get("statut") == "PARTANT"] or participants
    scored = compute_pronostic(participants, cfg)
    score_by_num = {s["numPmu"]: s for s in scored}

    rows = []
    for p in runners:
        num = p.get("numPmu")
        ref = _rapport_val(p, "dernierRapportReference")
        direct = _rapport_val(p, "dernierRapportDirect")
        current = direct if direct is not None else ref
        # variation référence -> direct
        variation = None
        direction = "stable"
        if ref and direct:
            variation = round(((direct - ref) / ref) * 100, 1)
            if variation <= -seuil:
                direction = "baisse"   # la cote baisse = argent qui rentre (steamer)
            elif variation >= seuil:
                direction = "hausse"   # la cote grimpe = délaissé (drift)
        # projection de la cote au départ : le mouvement se poursuit partiellement
        cote_cible = current
        if current is not None:
            if ref and direct:
                delta = direct - ref
                cote_cible = round(max(1.1, direct + delta * 0.5), 1)
            else:
                cote_cible = round(current, 1)

        sc = score_by_num.get(num)
        score = sc["score"] if sc else 0
        confidence = sc.get("confidence", 0) if sc else 0

        # signal : baisse marquée + bon profil IA => à jouer
        signal = "neutre"
        if direction == "baisse" and score >= score_min:
            signal = "jouer"
        elif direction == "baisse":
            signal = "surveiller"
        elif direction == "hausse" and score < score_min:
            signal = "eviter"

        rows.append(
            {
                "numPmu": num,
                "nom": p.get("nom"),
                "driver": p.get("driver"),
                "coteReference": round(ref, 1) if ref else None,
                "coteDirect": round(direct, 1) if direct else None,
                "coteCible": cote_cible,
                "variation": variation,
                "direction": direction,
                "categorie": cote_categorie(current, cfg),
                "signal": signal,
                "score": score,
                "confidence": confidence,
            }
        )

    # numéros à jouer : signaux 'jouer' triés par baisse la plus forte puis score
    a_jouer = sorted(
        [r for r in rows if r["signal"] == "jouer"],
        key=lambda x: (x["variation"] if x["variation"] is not None else 0, -x["score"]),
    )
    # tri d'affichage : cote directe croissante (favoris en premier)
    rows.sort(key=lambda x: (x["coteDirect"] if x["coteDirect"] is not None else 999))
    return {"analysis": rows, "aJouer": [r["numPmu"] for r in a_jouer]}


# ---------------------------------------------------------------------------
# PMU routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "TurfPro API", "status": "ok"}


def _is_quinte_plus(course: dict) -> bool:
    """Détecte la course support du Quinté+ via la liste des paris (dispo aussi en historique)."""
    paris = course.get("paris")
    if not isinstance(paris, list):
        return False
    for p in paris:
        if isinstance(p, dict):
            t = str(p.get("typePari") or p.get("type") or "").upper()
        else:
            t = str(p).upper()
        if "QUINTE_PLUS" in t:
            return True
    return False


@api_router.get("/pmu/programme/{date}")
async def get_programme(date: str, _user: dict = Depends(require_user)):
    """date format: DDMMYYYY"""
    data = pmu_fetch(f"{date}", ttl=120)
    if not data or "programme" not in data:
        return {"date": date, "reunions": []}
    prog = data["programme"]
    reunions = []
    for r in prog.get("reunions", []):
        hippo = r.get("hippodrome") or {}
        courses = []
        for c in r.get("courses", []):
            courses.append(
                {
                    "numOrdre": c.get("numOrdre"),
                    "numExterne": c.get("numExterne"),
                    "libelle": c.get("libelle"),
                    "libelleCourt": c.get("libelleCourt"),
                    "heureDepart": c.get("heureDepart"),
                    "distance": c.get("distance"),
                    "discipline": c.get("discipline"),
                    "specialite": c.get("specialite"),
                    "montantPrix": c.get("montantPrix"),
                    "nombreDeclaresPartants": c.get("nombreDeclaresPartants"),
                    "arriveeDefinitive": c.get("arriveeDefinitive", False),
                    "departImminent": c.get("departImminent", False),
                    "quinte": _is_quinte_plus(c),
                }
            )
        reunions.append(
            {
                "numOfficiel": r.get("numOfficiel"),
                "numExterne": r.get("numExterne"),
                "nature": r.get("nature"),
                "hippodrome": {
                    "code": hippo.get("code"),
                    "libelleCourt": hippo.get("libelleCourt"),
                    "libelleLong": hippo.get("libelleLong"),
                },
                "pays": (r.get("pays") or {}).get("libelle"),
                "courses": courses,
            }
        )
    return {"date": date, "reunions": reunions}


def _fetch_participants(date: str, r: int, c: int) -> List[dict]:
    data = pmu_fetch(f"{date}/R{r}/C{c}/participants", ttl=45)
    if not data:
        return []
    return data.get("participants", [])


@api_router.get("/pmu/course/{date}/{r}/{c}/participants")
async def get_participants(date: str, r: int, c: int, _user: dict = Depends(require_user)):
    participants = _fetch_participants(date, r, c)
    out = []
    for p in participants:
        gains = p.get("gainsParticipant") or {}
        out.append(
            {
                "numPmu": p.get("numPmu"),
                "nom": p.get("nom"),
                "age": p.get("age"),
                "sexe": p.get("sexe"),
                "race": p.get("race"),
                "statut": p.get("statut"),
                "driver": p.get("driver"),
                "entraineur": p.get("entraineur"),
                "proprietaire": p.get("proprietaire"),
                "musique": p.get("musique"),
                "cote": get_cote(p),
                "tendance": (p.get("dernierRapportReference") or {}).get("indicateurTendance"),
                "nombreCourses": p.get("nombreCourses"),
                "nombreVictoires": p.get("nombreVictoires"),
                "nombrePlaces": p.get("nombrePlaces"),
                "nombrePlacesSecond": p.get("nombrePlacesSecond"),
                "nombrePlacesTroisieme": p.get("nombrePlacesTroisieme"),
                "gainsCarriere": gains.get("gainsCarriere"),
                "gainsVictoires": gains.get("gainsVictoires"),
                "gainsAnneeEnCours": gains.get("gainsAnneeEnCours"),
                "nomPere": p.get("nomPere"),
                "nomMere": p.get("nomMere"),
                "handicapPoids": p.get("handicapPoids"),
                "deferre": p.get("deferre"),
                "oeilleres": p.get("oeilleres"),
                "urlCasaque": p.get("urlCasaque"),
                "commentaire": (p.get("commentaireApresCourse") or {}).get("texte"),
                "avisEntraineur": p.get("avisEntraineur"),
                "ordreArrivee": p.get("ordreArrivee"),
            }
        )
    arrivee = sorted(
        [
            {"ordre": x["ordreArrivee"], "numPmu": x["numPmu"], "nom": x["nom"], "cote": x["cote"]}
            for x in out
            if isinstance(x.get("ordreArrivee"), int) and x["ordreArrivee"] > 0
        ],
        key=lambda z: z["ordre"],
    )
    return {"participants": out, "arrivee": arrivee, "termine": len(arrivee) > 0}


@api_router.get("/pmu/pronostic/{date}/{r}/{c}")
async def get_pronostic(date: str, r: int, c: int, _user: dict = Depends(require_full)):
    participants = _fetch_participants(date, r, c)
    if not participants:
        return {"selection": [], "tocards": [], "count": 0}
    cfg = await get_analysis_config()
    scored = compute_pronostic(participants, cfg)
    selection = scored[:8]
    tocards = compute_tocards(scored, top_n=8, cfg=cfg)
    return {"selection": selection, "tocards": tocards, "count": len(selection)}


@api_router.get("/pmu/pronostic-demo/{date}/{r}/{c}")
async def get_pronostic_demo(date: str, r: int, c: int, _user: dict = Depends(require_user)):
    """Pronostic d'UNE seule course, accessible aux utilisateurs démo après visionnage
    d'une publicité récompensée (déblocage côté client). Identique à get_pronostic."""
    participants = _fetch_participants(date, r, c)
    if not participants:
        return {"selection": [], "tocards": [], "count": 0}
    cfg = await get_analysis_config()
    scored = compute_pronostic(participants, cfg)
    selection = scored[:8]
    tocards = compute_tocards(scored, top_n=8, cfg=cfg)
    return {"selection": selection, "tocards": tocards, "count": len(selection)}


@api_router.get("/pmu/cotes-analysis/{date}/{r}/{c}")
async def get_cotes_analysis(date: str, r: int, c: int, _user: dict = Depends(require_full)):
    participants = _fetch_participants(date, r, c)
    if not participants:
        return {"analysis": [], "aJouer": []}
    cfg = await get_analysis_config()
    return compute_cotes_analysis(participants, cfg)


@api_router.get("/pmu/cotes-demo/{date}/{r}/{c}")
async def get_cotes_demo(date: str, r: int, c: int, _user: dict = Depends(require_user)):
    """Analyse des cotes d'UNE course, débloquée en démo via pub récompensée."""
    participants = _fetch_participants(date, r, c)
    if not participants:
        return {"analysis": [], "aJouer": []}
    cfg = await get_analysis_config()
    return compute_cotes_analysis(participants, cfg)


@api_router.get("/pmu/course/{date}/{r}/{c}/rapports")
async def get_rapports(date: str, r: int, c: int, _user: dict = Depends(require_user)):
    """Rapports définitifs (gains) d'une course terminée."""
    data = pmu_fetch(f"{date}/R{r}/C{c}/rapports-definitifs", ttl=300)
    if not data or not isinstance(data, list):
        return {"rapports": [], "disponible": False}
    keep = {
        "SIMPLE_GAGNANT",
        "SIMPLE_PLACE",
        "COUPLE_GAGNANT",
        "COUPLE_PLACE",
        "COUPLE_ORDRE",
        "TRIO",
        "TIERCE",
        "QUARTE_PLUS",
        "QUINTE_PLUS",
        "DEUX_SUR_QUATRE",
        "MULTI",
    }
    out = []
    for pari in data:
        tp = pari.get("typePari")
        if tp not in keep:
            continue
        rapports = []
        for rp in pari.get("rapports", []):
            rapports.append(
                {
                    "libelle": rp.get("libelle"),
                    "combinaison": rp.get("combinaison"),
                    "dividende": round((rp.get("dividendePourUnEuro") or 0) / 100, 2),
                }
            )
        if rapports:
            out.append(
                {
                    "typePari": tp,
                    "famille": pari.get("famillePari"),
                    "miseBase": round((pari.get("miseBase") or 0) / 100, 2),
                    "rapports": rapports,
                }
            )
    return {"rapports": out, "disponible": len(out) > 0}


# ---------------------------------------------------------------------------
# Performance IA — backtest sur la course support du Quinté+ uniquement
# Période configurable côté admin (7 jours à 365 jours).
# ---------------------------------------------------------------------------
perf_state = {"running": False, "processed": 0}
PERF_CONFIG_ID = "perf_config"
DEFAULT_PERF_DAYS = 7


def _last_dates(days: int) -> List[str]:
    today = now_utc()
    return [(today - timedelta(days=i)).strftime("%d%m%Y") for i in range(days)]


def _is_quinte(course: dict) -> bool:
    for p in course.get("paris", []) or []:
        if p.get("typePari") == "QUINTE_PLUS":
            return True
    return False


async def get_perf_days() -> int:
    doc = await db.settings.find_one({"_id": PERF_CONFIG_ID})
    days = (doc or {}).get("days", DEFAULT_PERF_DAYS)
    try:
        days = int(days)
    except Exception:
        days = DEFAULT_PERF_DAYS
    return max(7, min(365, days))


async def _compute_performance(days: int, limit: int = 120):
    if perf_state["running"]:
        return
    perf_state["running"] = True
    perf_state["processed"] = 0
    processed = 0
    try:
        for date in _last_dates(days):
            try:
                prog = await asyncio.to_thread(pmu_fetch, f"{date}", 300)
            except Exception:
                continue
            if not prog or "programme" not in prog:
                continue
            for reunion in prog["programme"].get("reunions", []):
                rnum = reunion.get("numExterne") or reunion.get("numOfficiel")
                for course in reunion.get("courses", []):
                    # Course support du Quinté+ uniquement
                    if not _is_quinte(course):
                        continue
                    if not course.get("arriveeDefinitive"):
                        continue
                    cnum = course.get("numExterne") or course.get("numOrdre")
                    key = f"{date}-R{rnum}-C{cnum}"
                    if await db.perf_quinte.find_one({"_id": key}):
                        continue
                    try:
                        parts = await asyncio.to_thread(_fetch_participants, date, rnum, cnum)
                    except Exception:
                        continue
                    pos_by_num = {
                        p.get("numPmu"): p.get("ordreArrivee")
                        for p in parts
                        if isinstance(p.get("ordreArrivee"), int) and p.get("ordreArrivee") > 0
                    }
                    if not pos_by_num:
                        continue
                    sel = compute_pronostic(parts)
                    if not sel:
                        continue
                    fav = sel[0]
                    fav_pos = pos_by_num.get(fav["numPmu"])
                    trio = [s["numPmu"] for s in sel[:3]]
                    trio_hits = sum(1 for n in trio if pos_by_num.get(n) and pos_by_num[n] <= 3)
                    quinte5 = [s["numPmu"] for s in sel[:5]]
                    quinte_hits = sum(1 for n in quinte5 if pos_by_num.get(n) and pos_by_num[n] <= 5)
                    await db.perf_quinte.update_one(
                        {"_id": key},
                        {
                            "$set": {
                                "date": date,
                                "r": rnum,
                                "c": cnum,
                                "hippodrome": (reunion.get("hippodrome") or {}).get("libelleCourt"),
                                "favNum": fav["numPmu"],
                                "favPos": fav_pos,
                                "won": fav_pos == 1,
                                "placed": fav_pos is not None and fav_pos <= 3,
                                "trioHits": trio_hits,
                                "quinteHits": quinte_hits,
                                "computed_at": now_utc().isoformat(),
                            }
                        },
                        upsert=True,
                    )
                    processed += 1
                    perf_state["processed"] = processed
                    await asyncio.sleep(0.03)
                    if processed >= limit:
                        return
    finally:
        perf_state["running"] = False


@api_router.get("/performance")
async def get_performance(_user: dict = Depends(require_full)):
    days = await get_perf_days()
    dates = _last_dates(days)
    results = [r async for r in db.perf_quinte.find({"date": {"$in": dates}}).limit(5000)]
    races = len(results)
    won = sum(1 for r in results if r.get("won"))
    placed = sum(1 for r in results if r.get("placed"))
    trio = sum(r.get("trioHits", 0) for r in results)
    quinte = sum(r.get("quinteHits", 0) for r in results)

    by_day: dict = {}
    for r in results:
        d = r["date"]
        by_day.setdefault(d, {"date": d, "races": 0, "won": 0, "placed": 0, "hippodrome": r.get("hippodrome")})
        by_day[d]["races"] += 1
        by_day[d]["won"] += 1 if r.get("won") else 0
        by_day[d]["placed"] += 1 if r.get("placed") else 0
    day_list = sorted(by_day.values(), key=lambda x: datetime.strptime(x["date"], "%d%m%Y"), reverse=True)

    asyncio.create_task(_compute_performance(days))

    return {
        "days": days,
        "scope": "quinte",
        "races": races,
        "favWon": won,
        "favPlaced": placed,
        "winRate": round(won / races * 100, 1) if races else 0,
        "placeRate": round(placed / races * 100, 1) if races else 0,
        "trioAvg": round(trio / races, 2) if races else 0,
        "quinteAvg": round(quinte / races, 2) if races else 0,
        "byDay": day_list,
        "computing": perf_state["running"],
        "processed": perf_state["processed"],
    }


class PerfConfigRequest(BaseModel):
    days: int


@api_router.get("/admin/perf-config")
async def get_perf_config(_admin: dict = Depends(require_admin)):
    return {"days": await get_perf_days()}


@api_router.post("/admin/perf-config")
async def set_perf_config(body: PerfConfigRequest, _admin: dict = Depends(require_admin)):
    days = max(7, min(365, int(body.days)))
    await db.settings.update_one(
        {"_id": PERF_CONFIG_ID},
        {"$set": {"days": days, "updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    asyncio.create_task(_compute_performance(days))
    return {"days": days}


# ---------------------------------------------------------------------------
# Rate Limiting (Login)
# ---------------------------------------------------------------------------
_failed_logins: dict = {}

def check_login_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    info = _failed_logins.get(ip)
    if info:
        if info["count"] >= 2 and info["blocked_until"] > now:
            raise HTTPException(status_code=429, detail="Compte temporairement bloqué suite à plusieurs échecs. Veuillez réessayer plus tard.")
        elif info["blocked_until"] <= now:
            # Réinitialiser si le blocage est terminé
            if info["count"] >= 2:
                _failed_logins[ip] = {"count": 0, "blocked_until": 0}

def record_login_failure(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    if ip not in _failed_logins:
        _failed_logins[ip] = {"count": 1, "blocked_until": 0}
    else:
        _failed_logins[ip]["count"] += 1
    
    if _failed_logins[ip]["count"] >= 2:
        _failed_logins[ip]["blocked_until"] = now + 900 # 15 minutes de blocage

def record_login_success(request: Request):
    ip = request.client.host if request.client else "unknown"
    if ip in _failed_logins:
        _failed_logins[ip] = {"count": 0, "blocked_until": 0}

# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/admin/login", response_model=TokenResponse)
async def admin_login(body: AdminLogin, request: Request):
    check_login_rate_limit(request)
    # Connexion par mot de passe uniquement (identifiant côté serveur, non demandé).
    admin = await db.admins.find_one({"username": ADMIN_USERNAME})
    # Vérifie toujours un hash (même si absent) pour limiter les attaques par timing.
    stored = admin["hashed_password"] if admin else hash_password("dummy-constant-password")
    if not verify_password(body.password, stored) or not admin:
        record_login_failure(request)
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    record_login_success(request)
    token = create_token(str(admin["_id"]), "admin")
    return TokenResponse(access_token=token, role="admin")


@api_router.post("/auth/redeem", response_model=TokenResponse)
async def redeem_code(body: RedeemRequest, request: Request):
    check_login_rate_limit(request)
    code = (body.code or "").strip().upper()
    # Code démo permanent : marche toujours, donne le mode démo (accès limité).
    if code == "DEMO2026":
        token = create_token("demo", "demo", {"code": "DEMO"})
        return TokenResponse(access_token=token, role="demo")
    doc = await db.access_codes.find_one({"code": code})
    if not doc:
        record_login_failure(request)
        raise HTTPException(status_code=400, detail="Code d'accès invalide")
    if not doc.get("active", True):
        record_login_failure(request)
        raise HTTPException(status_code=400, detail="Ce code a été désactivé")
    max_uses = doc.get("max_uses")
    if max_uses is not None and doc.get("usage_count", 0) >= max_uses:
        raise HTTPException(status_code=400, detail="Limite d'utilisation atteinte")
    expires_at = doc.get("expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) <= now_utc():
                raise HTTPException(status_code=400, detail="Ce code a expiré")
        except HTTPException:
            raise
        except Exception:
            pass
    await db.access_codes.update_one(
        {"_id": doc["_id"]},
        {"$inc": {"usage_count": 1}, "$set": {"last_used_at": now_utc().isoformat()}},
    )
    record_login_success(request)
    token = create_token(str(doc["_id"]), "user", {"code": code})
    return TokenResponse(access_token=token, role="user")


@api_router.post("/auth/demo", response_model=TokenResponse)
async def demo_login():
    """Mode démo gratuit : accès limité sans code (3 courses, fonctions premium verrouillées)."""
    state = await free_access_state()
    if not state["active"]:
        raise HTTPException(status_code=400, detail="Le mode démo est actuellement désactivé")
    token = create_token("demo", "demo", {"code": "DEMO"})
    return TokenResponse(access_token=token, role="demo")


class IapVerifyRequest(BaseModel):
    productId: str
    purchaseToken: str
    packageName: Optional[str] = None


def _verify_google_play_sync(product_id: str, purchase_token: str) -> dict:
    """Vérifie un achat auprès de la Google Play Developer API.
    Retourne {ok, reason, state}. 'not_configured' si le compte de service est absent."""
    if not GOOGLE_PLAY_SA_JSON:
        return {"ok": False, "reason": "not_configured"}
    try:
        import json as _json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        scopes = ["https://www.googleapis.com/auth/androidpublisher"]
        raw = GOOGLE_PLAY_SA_JSON.strip()
        if raw.startswith("{"):
            # Contenu JSON injecté via variable d'environnement (recommandé en prod)
            creds = service_account.Credentials.from_service_account_info(_json.loads(raw), scopes=scopes)
        elif os.path.exists(raw):
            # Chemin vers un fichier de compte de service (usage local/sandbox)
            creds = service_account.Credentials.from_service_account_file(raw, scopes=scopes)
        else:
            return {"ok": False, "reason": "not_configured"}
        service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)
        result = (
            service.purchases()
            .products()
            .get(packageName=GOOGLE_PLAY_PACKAGE_NAME, productId=product_id, token=purchase_token)
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("Google Play verify error: %s", e)
        return {"ok": False, "reason": "api_error"}
    # purchaseState : 0 = Acheté, 1 = Annulé, 2 = En attente
    state = result.get("purchaseState", 1)
    return {"ok": state == 0, "state": state, "reason": "ok" if state == 0 else "not_purchased"}


@api_router.post("/iap/google/verify", response_model=TokenResponse)
async def iap_verify(body: IapVerifyRequest, _user: dict = Depends(require_user)):
    """Débloque l'accès complet UNIQUEMENT après vérification serveur de l'achat auprès
    de Google Play (aucune confiance au client). Nécessite un compte de service configuré
    via GOOGLE_PLAY_SERVICE_ACCOUNT_JSON."""
    if not body.purchaseToken or not body.productId:
        raise HTTPException(status_code=400, detail="Achat incomplet")

    # Anti-rejeu : un jeton d'achat déjà vérifié ne peut pas resservir pour un autre produit.
    existing = await db.purchases.find_one({"purchaseToken": body.purchaseToken})
    if existing and existing.get("verified") and existing.get("productId") != body.productId:
        raise HTTPException(status_code=409, detail="Jeton d'achat déjà utilisé")

    verification = await asyncio.to_thread(_verify_google_play_sync, body.productId, body.purchaseToken)
    if not verification.get("ok"):
        if verification.get("reason") == "not_configured":
            raise HTTPException(
                status_code=503,
                detail="Vérification des achats indisponible (configuration serveur manquante).",
            )
        raise HTTPException(status_code=402, detail="Achat non vérifié auprès de Google Play.")

    await db.purchases.update_one(
        {"purchaseToken": body.purchaseToken},
        {
            "$set": {
                "productId": body.productId,
                "purchaseToken": body.purchaseToken,
                "packageName": body.packageName or GOOGLE_PLAY_PACKAGE_NAME,
                "platform": "google_play",
                "state": "PURCHASED",
                "verified": True,
                "verified_at": now_utc().isoformat(),
            }
        },
        upsert=True,
    )
    token = create_token(f"iap:{body.purchaseToken[:24]}", "user", {"code": "IAP", "productId": body.productId})
    return TokenResponse(access_token=token, role="user")


@api_router.get("/auth/me")
async def me(user: dict = Depends(require_user)):
    expires_at = None
    code = user.get("code")
    if user.get("role") == "user" and code and code != "ACCÈS LIBRE":
        doc = await db.access_codes.find_one({"code": code})
        if doc:
            expires_at = doc.get("expires_at")
    return {"role": user.get("role"), "code": code, "expires_at": expires_at}


@api_router.get("/auth/validate")
async def validate_session(device_id: Optional[str] = None, user: dict = Depends(require_user)):
    """Vérifie que la session est toujours valide (code actif/non expiré, appareil non bloqué).
    Renvoie 401 si le code a été révoqué/expiré ou si l'appareil a été bloqué (déconnexion à distance)."""
    # Blocage d'un appareil précis (révocation à distance par l'admin)
    if device_id:
        dev = await db.devices.find_one({"_id": device_id})
        if dev and dev.get("blocked"):
            raise HTTPException(status_code=401, detail="Cet appareil a été bloqué par l'administrateur")
    if user.get("role") == "admin":
        return {"valid": True}
    if user.get("role") == "demo":
        return {"valid": True}
    code = user.get("code")
    if code == "IAP":
        return {"valid": True}
    if code == "ACCÈS LIBRE":
        state = await free_access_state()
        if not state["active"]:
            raise HTTPException(status_code=401, detail="L'accès libre a expiré")
        return {"valid": True}
    doc = await db.access_codes.find_one({"code": code})
    if not doc or not doc.get("active", True):
        raise HTTPException(status_code=401, detail="Ce code a été désactivé")
    expires_at = doc.get("expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) <= now_utc():
                raise HTTPException(status_code=401, detail="Ce code a expiré")
        except HTTPException:
            raise
        except Exception:
            pass
    return {"valid": True}


# ---------------------------------------------------------------------------
# Free access (temporary open access, toggled by admin)
# ---------------------------------------------------------------------------
FREE_ACCESS_ID = "free_access"


async def free_access_state() -> dict:
    doc = await db.settings.find_one({"_id": FREE_ACCESS_ID})
    if not doc:
        return {"active": False, "expires_at": None}
    enabled = doc.get("enabled", False)
    expires_at = doc.get("expires_at")
    active = False
    if enabled:
        if expires_at is None:
            active = True
        else:
            try:
                active = datetime.fromisoformat(expires_at) > now_utc()
            except Exception:
                active = False
    return {"active": active, "expires_at": expires_at}


class FreeAccessRequest(BaseModel):
    enabled: bool
    hours: Optional[float] = None  # None + enabled => illimité


@api_router.get("/settings/free-access")
async def get_free_access():
    return await free_access_state()


@api_router.post("/auth/free-access", response_model=TokenResponse)
async def free_access_login():
    state = await free_access_state()
    if not state["active"]:
        raise HTTPException(status_code=400, detail="L'accès libre n'est pas activé")
    token = create_token("free", "user", {"code": "ACCÈS LIBRE"})
    return TokenResponse(access_token=token, role="user")


@api_router.post("/admin/free-access")
async def set_free_access(body: FreeAccessRequest, _admin: dict = Depends(require_admin)):
    expires_at = None
    if body.enabled and body.hours is not None:
        expires_at = (now_utc() + timedelta(hours=body.hours)).isoformat()
    await db.settings.update_one(
        {"_id": FREE_ACCESS_ID},
        {"$set": {"enabled": body.enabled, "expires_at": expires_at, "updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    return await free_access_state()


# ---------------------------------------------------------------------------
# Admin access-code management
# ---------------------------------------------------------------------------
def _gen_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


@api_router.post("/admin/access-codes", response_model=AccessCodeOut)
async def create_code(body: CreateCodeRequest, _admin: dict = Depends(require_admin)):
    code = _gen_code()
    while await db.access_codes.find_one({"code": code}):
        code = _gen_code()
    doc = {
        "code": code,
        "label": body.label,
        "active": True,
        "usage_count": 0,
        "max_uses": body.max_uses,
        "created_at": now_utc().isoformat(),
        "expires_at": body.expires_at
        if body.expires_at
        else (now_utc() + timedelta(days=body.expires_days)).isoformat()
        if body.expires_days
        else None,
    }
    res = await db.access_codes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return AccessCodeOut(**doc)


@api_router.get("/admin/access-codes", response_model=List[AccessCodeOut])
async def list_codes(_admin: dict = Depends(require_admin)):
    five_mins_ago = (now_utc() - timedelta(minutes=5)).isoformat()
    pipeline = [
        {"$match": {"last_seen": {"$gte": five_mins_ago}}},
        {"$group": {"_id": "$code", "count": {"$sum": 1}}}
    ]
    online_counts = {}
    async for d in db.devices.aggregate(pipeline):
        if d["_id"]:
            online_counts[d["_id"]] = d["count"]

    out = []
    cursor = db.access_codes.find().sort("created_at", -1).limit(2000)
    async for doc in cursor:
        doc["online_count"] = online_counts.get(doc["code"], 0)
        out.append(AccessCodeOut(**doc))
    return out


@api_router.post("/admin/access-codes/{code_id}/revoke", response_model=AccessCodeOut)
async def revoke_code(code_id: str, _admin: dict = Depends(require_admin)):
    oid = ObjectId(code_id)
    res = await db.access_codes.update_one({"_id": oid}, {"$set": {"active": False}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Code introuvable")
    doc = await db.access_codes.find_one({"_id": oid})
    return AccessCodeOut(**doc)


@api_router.post("/admin/access-codes/{code_id}/activate", response_model=AccessCodeOut)
async def activate_code(code_id: str, _admin: dict = Depends(require_admin)):
    oid = ObjectId(code_id)
    res = await db.access_codes.update_one({"_id": oid}, {"$set": {"active": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Code introuvable")
    doc = await db.access_codes.find_one({"_id": oid})
    return AccessCodeOut(**doc)


@api_router.delete("/admin/access-codes/{code_id}")
async def delete_code(code_id: str, _admin: dict = Depends(require_admin)):
    oid = ObjectId(code_id)
    res = await db.access_codes.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Code introuvable")
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Appareils / installations
# ---------------------------------------------------------------------------
class DeviceRegister(BaseModel):
    deviceId: str
    platform: Optional[str] = None
    osName: Optional[str] = None
    osVersion: Optional[str] = None
    model: Optional[str] = None
    brand: Optional[str] = None
    deviceName: Optional[str] = None
    appVersion: Optional[str] = None


@api_router.post("/devices/register")
async def register_device(body: DeviceRegister, user: dict = Depends(require_user)):
    now = now_utc().isoformat()
    set_fields = {
        "platform": body.platform,
        "osName": body.osName,
        "osVersion": body.osVersion,
        "model": body.model,
        "brand": body.brand,
        "deviceName": body.deviceName,
        "appVersion": body.appVersion,
        "code": user.get("code"),
        "role": user.get("role"),
        "last_seen": now,
    }
    await db.devices.update_one(
        {"_id": body.deviceId},
        {"$set": set_fields, "$inc": {"sessions": 1}, "$setOnInsert": {"first_seen": now}},
        upsert=True,
    )
    # Diffusion auto d'une notif "nouvelle mise à jour" (non bloquant)
    try:
        await _maybe_announce_version(body.appVersion)
    except Exception:
        pass
    return {"ok": True}


@api_router.get("/admin/devices")
async def list_devices(_admin: dict = Depends(require_admin)):
    out = []
    async for d in db.devices.find().sort("last_seen", -1).limit(10000):
        d["deviceId"] = d.pop("_id")
        out.append(d)
    android = sum(1 for d in out if (d.get("platform") == "android"))
    ios = sum(1 for d in out if (d.get("platform") == "ios"))
    return {"devices": out, "count": len(out), "android": android, "ios": ios}


@api_router.post("/admin/devices/{device_id}/block")
async def block_device(device_id: str, _admin: dict = Depends(require_admin)):
    res = await db.devices.update_one({"_id": device_id}, {"$set": {"blocked": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appareil introuvable")
    return {"ok": True, "blocked": True}


@api_router.post("/admin/devices/{device_id}/unblock")
async def unblock_device(device_id: str, _admin: dict = Depends(require_admin)):
    res = await db.devices.update_one({"_id": device_id}, {"$set": {"blocked": False}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appareil introuvable")
    return {"ok": True, "blocked": False}


ANALYSIS_CONFIG_ID = "analysis_config"


async def get_analysis_config() -> dict:
    doc = await db.settings.find_one({"_id": ANALYSIS_CONFIG_ID})
    cfg = dict(DEFAULT_ANALYSIS)
    if doc:
        for k in DEFAULT_ANALYSIS:
            v = doc.get(k)
            if isinstance(v, (int, float)):
                cfg[k] = float(v)
    return cfg


class AnalysisConfigRequest(BaseModel):
    favoriMax: float
    outsiderMax: float
    baisseSeuil: float
    scoreMinJouer: float


@api_router.get("/admin/analysis-config")
async def get_analysis_config_route(_admin: dict = Depends(require_admin)):
    return await get_analysis_config()


@api_router.post("/admin/analysis-config")
async def set_analysis_config(body: AnalysisConfigRequest, _admin: dict = Depends(require_admin)):
    favori = max(1.5, min(30.0, round(float(body.favoriMax), 1)))
    outsider = max(favori + 0.5, min(100.0, round(float(body.outsiderMax), 1)))
    seuil = max(1.0, min(50.0, round(float(body.baisseSeuil), 1)))
    score_min = max(0.0, min(100.0, round(float(body.scoreMinJouer), 1)))
    cfg = {"favoriMax": favori, "outsiderMax": outsider, "baisseSeuil": seuil, "scoreMinJouer": score_min}
    await db.settings.update_one(
        {"_id": ANALYSIS_CONFIG_ID},
        {"$set": {**cfg, "updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    return cfg



SHARE_CONFIG_ID = "share_config"
DEFAULT_SHARE_THRESHOLD = 3


async def get_share_threshold() -> int:
    doc = await db.settings.find_one({"_id": SHARE_CONFIG_ID})
    try:
        t = int((doc or {}).get("threshold", DEFAULT_SHARE_THRESHOLD))
    except Exception:
        t = DEFAULT_SHARE_THRESHOLD
    return max(2, min(20, t))


class ShareConfigRequest(BaseModel):
    threshold: int


@api_router.get("/admin/share-config")
async def get_share_config(_admin: dict = Depends(require_admin)):
    return {"threshold": await get_share_threshold()}


@api_router.post("/admin/share-config")
async def set_share_config(body: ShareConfigRequest, _admin: dict = Depends(require_admin)):
    threshold = max(2, min(20, int(body.threshold)))
    await db.settings.update_one(
        {"_id": SHARE_CONFIG_ID},
        {"$set": {"threshold": threshold, "updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    return {"threshold": threshold}


LOGIN_CONFIG_ID = "login_config"

class LoginConfigRequest(BaseModel):
    payment_link: str
    whatsapp_link: str = ""
    show_demo_button: bool

@api_router.get("/auth/login-config")
async def get_login_config():
    doc = await db.settings.find_one({"_id": LOGIN_CONFIG_ID})
    if not doc:
        return {
            "payment_link": "https://royalcoachingturf.myshopify.com/products/abonnement-vip-coaching-turf-logiciel-mensuels", 
            "whatsapp_link": "https://chat.whatsapp.com/DpH06b5N4Gn7dmhIlnlm8z?s=sh&p=a&mlu=4&ilr=4", 
            "show_demo_button": True
        }
    return {
        "payment_link": doc.get("payment_link", ""),
        "whatsapp_link": doc.get("whatsapp_link", ""),
        "show_demo_button": doc.get("show_demo_button", True)
    }

@api_router.post("/admin/login-config")
async def set_login_config(body: LoginConfigRequest, _admin: dict = Depends(require_admin)):
    await db.settings.update_one(
        {"_id": LOGIN_CONFIG_ID},
        {"$set": {"payment_link": body.payment_link, "whatsapp_link": body.whatsapp_link, "show_demo_button": body.show_demo_button, "updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    return {"payment_link": body.payment_link, "whatsapp_link": body.whatsapp_link, "show_demo_button": body.show_demo_button}


@api_router.get("/admin/sharing-alerts")
async def sharing_alerts(_admin: dict = Depends(require_admin)):
    """Codes utilisés par un nombre d'appareils >= seuil (détection de partage)."""
    threshold = await get_share_threshold()
    by_code: dict = {}
    async for d in db.devices.find({}, {"code": 1, "blocked": 1, "platform": 1}).limit(20000):
        code = d.get("code")
        if not code or code == "ACCÈS LIBRE":
            continue
        entry = by_code.setdefault(code, {"code": code, "total": 0, "active": 0, "blocked": 0, "platforms": {}})
        entry["total"] += 1
        if d.get("blocked"):
            entry["blocked"] += 1
        else:
            entry["active"] += 1
        p = d.get("platform") or "autre"
        entry["platforms"][p] = entry["platforms"].get(p, 0) + 1
    alerts = []
    for code, e in by_code.items():
        if e["active"] >= threshold:
            cd = await db.access_codes.find_one({"code": code})
            e["codeId"] = str(cd["_id"]) if cd else None
            e["codeActive"] = bool(cd.get("active", True)) if cd else False
            alerts.append(e)
    alerts.sort(key=lambda x: x["active"], reverse=True)
    return {"threshold": threshold, "alerts": alerts, "count": len(alerts)}


@api_router.post("/admin/codes/{code}/block-devices")
async def block_code_devices(code: str, _admin: dict = Depends(require_admin)):
    """Bloque tous les appareils rattachés à un code (réponse au partage)."""
    res = await db.devices.update_many({"code": code.upper()}, {"$set": {"blocked": True}})
    return {"ok": True, "blocked": res.modified_count}


# ---------------------------------------------------------------------------
# Notifications push (relais géré par Emergent)
# ---------------------------------------------------------------------------
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")

_push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str  # "android" | "ios"
    device_token: str


@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    # Mémorise l'utilisateur pour les diffusions (broadcast nouvelle version).
    # On ne stocke PAS le device_token (résolu côté Emergent), seulement l'user_id.
    try:
        await db.push_users.update_one(
            {"_id": body.user_id},
            {"$set": {"platform": body.platform, "updated_at": now_utc().isoformat()}},
            upsert=True,
        )
    except Exception:
        pass
    resp = await _push_client.post("/api/v1/push/users/register", json=body.model_dump())
    if resp.status_code == 401:
        raise HTTPException(status_code=500, detail="EMERGENT_PUSH_KEY manquant ou invalide")
    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail="Service push indisponible")
    resp.raise_for_status()
    return {"status": "registered"}


async def send_push(recipients: List[str], data: dict, idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        raise ValueError("data doit contenir title et message")
    # Max 100 destinataires par appel → on découpe.
    for i in range(0, len(recipients), 100):
        chunk = recipients[i:i + 100]
        payload: dict = {"recipients": chunk, "data": data}
        if idempotency_key:
            payload["$idempotency_key"] = f"{idempotency_key}:{i}"
        resp = await _push_client.post("/api/v1/push/trigger", json=payload)
        if resp.status_code == 401:
            raise HTTPException(status_code=500, detail="EMERGENT_PUSH_KEY manquant ou invalide")
        if resp.status_code >= 500:
            raise HTTPException(status_code=502, detail="Service push indisponible")
        resp.raise_for_status()


VERSION_CONFIG_ID = "app_version"


def _parse_version(v: Optional[str]) -> tuple:
    if not v:
        return ()
    parts = re.findall(r"\d+", str(v))
    return tuple(int(p) for p in parts[:4])


async def _maybe_announce_version(app_version: Optional[str]) -> None:
    """Diffuse automatiquement une notif dès qu'une version plus récente est détectée."""
    new_v = _parse_version(app_version)
    if not new_v:
        return
    doc = await db.settings.find_one({"_id": VERSION_CONFIG_ID})
    current = _parse_version((doc or {}).get("version"))
    if current and new_v <= current:
        return  # pas plus récent → rien à faire
    first_init = doc is None  # première init : mémorise sans notifier (évite le spam)
    await db.settings.update_one(
        {"_id": VERSION_CONFIG_ID},
        {"$set": {"version": str(app_version), "announced_at": now_utc().isoformat()}},
        upsert=True,
    )
    if first_init:
        return
    recipients = [u["_id"] async for u in db.push_users.find({}, {"_id": 1}).limit(100000)]
    if not recipients:
        return
    try:
        await send_push(
            recipients=recipients,
            data={
                "title": "Nouvelle mise à jour disponible 🎉",
                "message": f"La version {app_version} de Pro-Racing Stats est là. Mettez à jour pour profiter des dernières améliorations.",
            },
            idempotency_key=f"version-{app_version}",
        )
        logger.info("Push nouvelle version %s diffusé à %d appareils", app_version, len(recipients))
    except Exception as e:
        logger.warning("Diffusion push échouée (non bloquant): %s", e)


@api_router.get("/admin/push-stats")
async def push_stats(_admin: dict = Depends(require_admin)):
    total = await db.push_users.count_documents({})
    doc = await db.settings.find_one({"_id": VERSION_CONFIG_ID})
    return {"registered": total, "current_version": (doc or {}).get("version")}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    existing = await db.admins.find_one({"username": ADMIN_USERNAME})
    if not existing:
        await db.admins.insert_one(
            {"username": ADMIN_USERNAME, "hashed_password": hash_password(ADMIN_PASSWORD), "role": "admin"}
        )
        logger.info("Seeded admin user")
    elif not verify_password(ADMIN_PASSWORD, existing["hashed_password"]):
        # Rotation : le mot de passe configuré a changé → on met à jour le hash.
        await db.admins.update_one(
            {"_id": existing["_id"]},
            {"$set": {"hashed_password": hash_password(ADMIN_PASSWORD), "role": "admin"}},
        )
        logger.info("Admin password rotated")
    await db.access_codes.create_index("code", unique=True)
    if not await db.access_codes.find_one({"code": "TURFPRO1"}):
        try:
            await db.access_codes.insert_one(
                {
                    "code": "TURFPRO1",
                    "label": "Code démo",
                    "active": True,
                    "usage_count": 0,
                    "max_uses": None,
                    "created_at": now_utc().isoformat(),
                }
            )
        except Exception:
            pass


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


################################################################################
