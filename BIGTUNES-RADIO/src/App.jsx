import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cpltcslwtyjrnfkqmwph.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbHRjc2x3dHlqcm5ma3Ftd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2MDksImV4cCI6MjA5NDQ1MjYwOX0.swoUuU6vRImhxd-diSqDvE0pa6zmXh8l3_FLDS6ktmA";
const MAX_FILE_MB = 3;
const MAX_TRACKS = 3;
const FREE_TRACKS = 1;
const PRICE_PER_TRACK = 2.50;
const ADMIN_EMAILS = ["stompinent@gmail.com", "wilbertmarman@gmail.com"];
const VOTE_COOLDOWN_MS = 1000; // 1 seconde tussen stemmen
const BG_IMAGE = "https://cpltcslwtyjrnfkqmwph.supabase.co/storage/v1/object/public/BIGTUNESFOTO/AF552965-94A0-429F-A9E1-9F46C7F00BE9.png";
const TRACKS_PER_PAGE = 10; // ← hoeveel tracks per keer laden

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const COLOR_MAP = {
  coral:  { bg: "#FAECE7", accent: "#D85A30", text: "#993C1D", badge: "#F5C4B3" },
  teal:   { bg: "#E1F5EE", accent: "#1D9E75", text: "#0F6E56", badge: "#9FE1CB" },
  purple: { bg: "#EEEDFE", accent: "#7F77DD", text: "#534AB7", badge: "#CECBF6" },
  amber:  { bg: "#FAEEDA", accent: "#BA7517", text: "#854F0B", badge: "#FAC775" },
  pink:   { bg: "#FBEAF0", accent: "#D4537E", text: "#993556", badge: "#F4C0D1" },
  blue:   { bg: "#E6F1FB", accent: "#378ADD", text: "#185FA5", badge: "#B5D4F4" },
};

const GENRES = ["Electronic", "Hip-Hop", "Afrobeats", "Indie Pop", "Funk", "R&B", "Pop", "Rock", "Jazz", "Reggae", "Dancehall", "Klassiek", "Anders"];
const COLORS = Object.keys(COLOR_MAP);
const fmtTime = (s) => { if (!s || isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; };
const getWeek = (d = new Date()) => { const s = new Date(d.getFullYear(),0,1); return Math.ceil(((d-s)/86400000+s.getDay()+1)/7); };

// ── PWA SERVICE WORKER ──────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ── AUTH MODAL ──────────────────────────────────────────────
function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user); onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Controleer je e-mail om je account te bevestigen!");
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = { width:"100%", background:"rgba(12,5,2,0.9)", border:"1px solid rgba(155,107,58,0.25)", borderRadius:9, padding:"11px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:14, boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#0d0604", border:"1px solid rgba(155,107,58,0.3)", borderRadius:18, padding:24, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:18, fontWeight:700, color:"#f0ede8", marginBottom:4 }}>{mode==="login"?"Inloggen":"Account aanmaken"}</div>
        <div style={{ fontSize:12, color:"#666", fontFamily:"sans-serif", marginBottom:20 }}>Nodig om nummers te uploaden en te stemmen</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mailadres" type="email" style={inp}/>
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Wachtwoord" type="password" style={inp}/>
        </div>
        {error&&<div style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#D85A30", fontFamily:"sans-serif", marginBottom:12 }}>⚠️ {error}</div>}
        {success&&<div style={{ background:"rgba(29,158,117,0.1)", border:"1px solid rgba(29,158,117,0.3)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#1D9E75", fontFamily:"sans-serif", marginBottom:12 }}>✅ {success}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", background:"#9B6B3A", border:"none", borderRadius:11, padding:"13px", color:"#fff", fontFamily:"sans-serif", fontSize:15, fontWeight:700, cursor:loading?"default":"pointer", opacity:loading?0.7:1, marginBottom:10 }}>
          {loading?"Bezig...":mode==="login"?"Inloggen":"Aanmaken"}
        </button>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <button onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setSuccess("");}} style={{ background:"transparent", border:"none", color:"#888", fontFamily:"sans-serif", fontSize:12, cursor:"pointer" }}>
            {mode==="login"?"Nog geen account? Aanmelden":"Al een account? Inloggen"}
          </button>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#555", fontFamily:"sans-serif", fontSize:12, cursor:"pointer" }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

// ── BETAAL MODAL ────────────────────────────────────────────
function PaymentModal({ onClose, onPaid, trackTitle, artistName, userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("confirm"); // confirm | redirecting | verifying

  const EDGE_FUNCTION_URL = "https://cpltcslwtyjrnfkqmwph.supabase.co/functions/v1/bright-worker";

  const handlePay = async () => {
    setLoading(true);
    setError("");
    setStep("redirecting");
    try {
      const res = await fetch(`${EDGE_FUNCTION_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbHRjc2x3dHlqcm5ma3Ftd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2MDksImV4cCI6MjA5NDQ1MjYwOX0.swoUuU6vRImhxd-diSqDvE0pa6zmXh8l3_FLDS6ktmA" },
        body: JSON.stringify({ trackTitle, artistName, userId, returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      sessionStorage.setItem("bigtunes_payment_intent", data.paymentIntentId);
      sessionStorage.setItem("bigtunes_payment_user", userId);

      setStep("verifying");
      
      setTimeout(async () => {
        try {
          const verifyRes = await fetch(`${EDGE_FUNCTION_URL}?action=verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbHRjc2x3dHlqcm5ma3Ftd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2MDksImV4cCI6MjA5NDQ1MjYwOX0.swoUuU6vRImhxd-diSqDvE0pa6zmXh8l3_FLDS6ktmA" },
            body: JSON.stringify({ paymentIntentId: data.paymentIntentId, userId }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success || verifyData.status) {
            onPaid();
          } else {
            throw new Error("Betaling niet bevestigd");
          }
        } catch (e) {
          onPaid();
        }
        setLoading(false);
      }, 2000);

    } catch (err) {
      setError(err.message);
      setLoading(false);
      setStep("confirm");
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#0d0604", border:"1px solid rgba(155,107,58,0.3)", borderRadius:18, padding:24, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:22, textAlign:"center", marginBottom:8 }}>{step==="verifying"?"⏳":"🏦"}</div>
        <div style={{ fontSize:17, fontWeight:700, color:"#f0ede8", marginBottom:6, textAlign:"center" }}>
          {step==="verifying"?"Betaling verwerken...":"Betalen via iDEAL — €2,50"}
        </div>
        {step==="confirm"&&<>
          <div style={{ fontSize:13, color:"#888", fontFamily:"sans-serif", marginBottom:16, textAlign:"center", lineHeight:1.6 }}>
            Je 1e nummer is gratis. Extra nummers kosten €2,50 per track (max. 3 totaal).
          </div>
          <div style={{ background:"rgba(155,107,58,0.1)", border:"1px solid rgba(155,107,58,0.3)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#9B6B3A", fontFamily:"sans-serif" }}>
            📀 <strong style={{ color:"#f0ede8" }}>{trackTitle}</strong> van {artistName}
          </div>
          <div style={{ background:"rgba(29,100,200,0.08)", border:"1px solid rgba(29,100,200,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, fontFamily:"sans-serif", color:"#85B7EB" }}>
            🏦 Betaal veilig via iDEAL — jouw eigen bank<br/>
            <span style={{ fontSize:10, color:"#555", marginTop:4, display:"block" }}>ING · Rabobank · ABN AMRO · en meer</span>
          </div>
          {error&&<div style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#D85A30", fontFamily:"sans-serif", marginBottom:12 }}>⚠️ {error}</div>}
          <button onClick={handlePay} disabled={loading} style={{ width:"100%", background:"#003087", border:"none", borderRadius:11, padding:"13px", color:"#fff", fontFamily:"sans-serif", fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:10 }}>
            🏦 Betaal €2,50 via iDEAL
          </button>
          <button onClick={onClose} style={{ width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:11, padding:"11px", color:"#666", fontFamily:"sans-serif", fontSize:14, cursor:"pointer" }}>Annuleren</button>
          <div style={{ fontSize:10, color:"#444", fontFamily:"sans-serif", textAlign:"center", marginTop:10 }}>Veilig betalen via Stripe · iDEAL</div>
        </>}
        {step==="verifying"&&(
          <div style={{ textAlign:"center", padding:"20px 0", color:"#888", fontFamily:"sans-serif", fontSize:13 }}>
            Even geduld — betaling wordt bevestigd...
          </div>
        )}
      </div>
    </div>
  );
}

// ── COMMENTS ────────────────────────────────────────────────
function Comments({ trackId, user, isAdmin, onAuthRequired }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadComments(); }, [trackId]);

  const loadComments = async () => {
    const { data } = await supabase.from("comments").select("*").eq("track_id", trackId).order("created_at", { ascending: false });
    if (data) setComments(data);
  };

  const postComment = async () => {
    if (!user) { onAuthRequired(); return; }
    if (!text.trim() || text.length < 2) return;
    setLoading(true);
    await supabase.from("comments").insert({ track_id: trackId, user_id: user.id, username: user.email.split("@")[0], content: text.trim() });
    setText("");
    await loadComments();
    setLoading(false);
  };

  const deleteComment = async (id) => {
    await supabase.from("comments").delete().eq("id", id);
    await loadComments();
  };

  const inp = { width:"100%", background:"rgba(12,5,2,0.8)", border:"1px solid rgba(155,107,58,0.15)", borderRadius:9, padding:"10px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:13, boxSizing:"border-box", outline:"none", resize:"none" };

  return (
    <div style={{ background:"rgba(12,5,2,0.65)", border:"1px solid rgba(155,107,58,0.1)", borderRadius:13, padding:"13px", backdropFilter:"blur(8px)" }}>
      <div style={{ fontSize:9, color:"#555", fontFamily:"sans-serif", marginBottom:12, letterSpacing:1, textTransform:"uppercase" }}>💬 Reacties ({comments.length})</div>

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={user?"Schrijf een reactie...":"Log in om te reageren..."} rows={2} style={inp} onFocus={()=>!user&&onAuthRequired()}/>
        <button onClick={postComment} disabled={loading||!text.trim()} style={{ background:"#9B6B3A", border:"none", borderRadius:9, padding:"0 14px", color:"#fff", fontFamily:"sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0, opacity:!text.trim()?0.5:1 }}>
          {loading?"...":"→"}
        </button>
      </div>

      {comments.length === 0 && <div style={{ fontSize:12, color:"#444", fontFamily:"sans-serif", textAlign:"center", padding:"10px 0" }}>Nog geen reacties. Wees de eerste!</div>}

      {comments.map(c => (
        <div key={c.id} style={{ borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:10, marginTop:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <span style={{ fontSize:12, fontWeight:700, color:"#9B6B3A", fontFamily:"sans-serif" }}>{c.username}</span>
              <span style={{ fontSize:10, color:"#444", fontFamily:"sans-serif", marginLeft:8 }}>{new Date(c.created_at).toLocaleDateString("nl-NL")}</span>
            </div>
            {(isAdmin || user?.id === c.user_id) && (
              <button onClick={()=>deleteComment(c.id)} style={{ background:"transparent", border:"none", color:"#555", fontSize:11, cursor:"pointer", fontFamily:"sans-serif" }}>🗑</button>
            )}
          </div>
          <div style={{ fontSize:13, color:"#ccc", fontFamily:"sans-serif", marginTop:4, lineHeight:1.5 }}>{c.content}</div>
        </div>
      ))}
    </div>
  );
}

// ── DELEN ───────────────────────────────────────────────────
function ShareButtons({ track }) {
  const url = encodeURIComponent(`https://bigtunes-radio.vercel.app`);
  const text = encodeURIComponent(`🎵 Luister naar "${track.title}" van ${track.artist} op BIGTUNES RADIO!`);

  return (
    <div style={{ display:"flex", gap:8 }}>
      <a href={`https://wa.me/?text=${text}%20${url}`} target="_blank" rel="noreferrer" style={{ flex:1, background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)", borderRadius:10, padding:"10px", color:"#25D366", fontFamily:"sans-serif", fontSize:13, fontWeight:700, textAlign:"center", textDecoration:"none" }}>
        📱 WhatsApp
      </a>
      <a href={`https://www.instagram.com/`} target="_blank" rel="noreferrer" style={{ flex:1, background:"rgba(225,48,108,0.12)", border:"1px solid rgba(225,48,108,0.3)", borderRadius:10, padding:"10px", color:"#E1306C", fontFamily:"sans-serif", fontSize:13, fontWeight:700, textAlign:"center", textDecoration:"none" }}>
        📸 Instagram
      </a>
      <button onClick={()=>navigator.clipboard?.writeText(`BIGTUNES RADIO — ${track.title} van ${track.artist}`)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px", color:"#888", fontFamily:"sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>
        🔗 Kopieer
      </button>
    </div>
  );
}

// ── ADMIN PANEEL ────────────────────────────────────────────
function AdminPanel({ tracks, onDelete, onClose }) {
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = tracks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (track) => {
    if (confirmId !== track.id) { setConfirmId(track.id); return; }
    setDeleting(track.id);
    await onDelete(track);
    setDeleting(null);
    setConfirmId(null);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:9990, overflowY:"auto" }}>
      <div style={{ maxWidth:420, margin:"0 auto", padding:"20px 20px 60px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:2, color:"#9B6B3A", fontFamily:"sans-serif", fontWeight:700, marginBottom:2 }}>🔐 BEHEER</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>Admin Paneel</div>
            <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>{tracks.length} nummers totaal</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 14px", color:"#aaa", fontFamily:"sans-serif", fontSize:13, cursor:"pointer" }}>✕ Sluiten</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {[["Nummers",tracks.length,"#9B6B3A"],["Vlammen",tracks.reduce((s,t)=>s+t.flames,0),"#D85A30"],["Likes",tracks.reduce((s,t)=>s+t.likes,0),"#7F77DD"]].map(([l,v,c])=>(
            <div key={l} style={{ background:"rgba(12,5,2,0.8)", border:"1px solid rgba(155,107,58,0.1)", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif" }}>{l}</div>
            </div>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek nummer of artiest..." style={{ width:"100%", background:"rgba(12,5,2,0.8)", border:"1px solid rgba(155,107,58,0.12)", borderRadius:9, padding:"10px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:13, boxSizing:"border-box", outline:"none", marginBottom:14 }}/>

        {filtered.map(track => {
          const tc = COLOR_MAP[track.color]||COLOR_MAP.coral;
          const isConfirming = confirmId===track.id;
          return (
            <div key={track.id} style={{ background:"rgba(12,5,2,0.75)", border:`1px solid ${isConfirming?"#D85A30":"rgba(155,107,58,0.08)"}`, borderRadius:12, padding:"12px", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:`${tc.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>🎵</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f0ede8" }}>{track.title}</div>
                  <div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif" }}>{track.artist} · {track.genre}</div>
                  <div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginTop:2 }}>🔥{track.flames} ❤️{track.likes} · {track.month}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                {isConfirming ? (
                  <>
                    <button onClick={()=>setConfirmId(null)} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, padding:"6px 12px", color:"#888", fontFamily:"sans-serif", fontSize:12, cursor:"pointer" }}>Annuleer</button>
                    <button onClick={()=>handleDelete(track)} disabled={deleting===track.id} style={{ background:"#D85A30", border:"none", borderRadius:8, padding:"6px 14px", color:"#fff", fontFamily:"sans-serif", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      {deleting===track.id?"Bezig...":"Ja, verwijder"}
                    </button>
                  </>
                ) : (
                  <button onClick={()=>handleDelete(track)} style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:8, padding:"6px 14px", color:"#D85A30", fontFamily:"sans-serif", fontSize:12, fontWeight:600, cursor:"pointer" }}>🗑 Verwijderen</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [userVotes, setUserVotes] = useState({ flames: new Set(), likes: new Set() });
  const [voteCooldowns, setVoteCooldowns] = useState({});
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [view, setView] = useState("radio");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [chartPeriod, setChartPeriod] = useState("month");
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadData, setUploadData] = useState({ title:"", artist:"", genre:"", bio:"", color:"blue", isAmateur:true });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterGenre, setFilterGenre] = useState("Alles");
  const [sort, setSort] = useState("flames");
  const [playlist, setPlaylist] = useState([]);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // ── INFINITE SCROLL STATE ──────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(TRACKS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const [liveListeners, setLiveListeners] = useState(1);
  const audioRef = useRef(null);
  const fileRef = useRef(null);

  const currentTrack = playlist[playlistIndex] || null;
  const c = currentTrack ? (COLOR_MAP[currentTrack.color]||COLOR_MAP.coral) : COLOR_MAP.coral;
  const progress = audioDuration > 0 ? (currentTime/audioDuration)*100 : 0;

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user||null; setUser(u); setIsAdmin(u?ADMIN_EMAILS.includes(u.email):false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user||null; setUser(u); setIsAdmin(u?ADMIN_EMAILS.includes(u.email):false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Live luisteraars
  useEffect(() => {
    const channel = supabase.channel("live_listeners", { config: { presence: { key: Math.random().toString(36).slice(2) } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setLiveListeners((Object.keys(state).length || 1) + 43);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => { loadTracks(); const ch = supabase.channel("tracks").on("postgres_changes",{event:"*",schema:"public",table:"tracks"},()=>loadTracks()).subscribe(); return ()=>supabase.removeChannel(ch); }, []);
  useEffect(() => { if(user) loadUserVotes(); else setUserVotes({flames:new Set(),likes:new Set()}); }, [user]);
  useEffect(() => { if(user) loadUploadCount(); }, [user, tracks]);

  // Reset visibleCount wanneer filter/sort verandert
  useEffect(() => {
    setVisibleCount(TRACKS_PER_PAGE);
  }, [filterGenre, sort]);

  const loadTracks = async () => {
    setLoading(true);
    const { data } = await supabase.from("tracks").select("*").order("flames",{ascending:false});
    if (data) { setTracks(data); setPlaylist(shuffle(data)); setPlaylistIndex(0); }
    setLoading(false);
  };

  const loadUserVotes = async () => {
    const { data } = await supabase.from("votes").select("track_id,vote_type").eq("user_id",user.id);
    if (data) setUserVotes({ flames:new Set(data.filter(v=>v.vote_type==="flame").map(v=>v.track_id)), likes:new Set(data.filter(v=>v.vote_type==="like").map(v=>v.track_id)) });
  };

  const loadUploadCount = async () => {
    const { count } = await supabase.from("tracks").select("*",{count:"exact",head:true}).eq("user_id",user.id);
    setUploadCount(count||0);
  };

  // Audio
  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const onTime = ()=>setCurrentTime(audio.currentTime);
    const onDur = ()=>setAudioDuration(audio.duration||0);
    const onEnded = ()=>skipForward();
    audio.addEventListener("timeupdate",onTime); audio.addEventListener("loadedmetadata",onDur); audio.addEventListener("ended",onEnded);
    return ()=>{ audio.removeEventListener("timeupdate",onTime); audio.removeEventListener("loadedmetadata",onDur); audio.removeEventListener("ended",onEnded); };
  }, [playlistIndex,playlist]);

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const track = playlist[playlistIndex];
    if (track?.audio_url) { audio.src=track.audio_url; if(isPlaying) audio.play().catch(()=>{}); }
    else { audio.src=""; setCurrentTime(0); setAudioDuration(0); }
  }, [playlistIndex,playlist]);

  // ── INFINITE SCROLL: IntersectionObserver ─────────────────
  useEffect(() => {
    if (view !== "radio") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => prev + TRACKS_PER_PAGE);
            setIsLoadingMore(false);
          }, 400); // kleine vertraging voor smooth gevoel
        }
      },
      { rootMargin: "200px" } // start laden 200px voor het einde
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [view, isLoadingMore, visibleCount]);

  const togglePlay = () => {
    if (!currentTrack?.audio_url) { showToast("Geen audio beschikbaar","warn"); return; }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(()=>{}); setIsPlaying(true); }
  };

  const skipForward = () => { const n=(playlistIndex+1)%playlist.length; setPlaylistIndex(n); setCurrentTime(0); if(isPlaying) setTimeout(()=>audioRef.current?.play().catch(()=>{}),80); };
  const skipBack = () => {
    if (currentTime>3&&audioRef.current) { audioRef.current.currentTime=0; setCurrentTime(0); }
    else { const p=(playlistIndex-1+playlist.length)%playlist.length; setPlaylistIndex(p); setCurrentTime(0); if(isPlaying) setTimeout(()=>audioRef.current?.play().catch(()=>{}),80); }
  };
  const jumpToTrack = (track) => { const idx=playlist.findIndex(t=>t.id===track.id); if(idx>=0){setPlaylistIndex(idx);setCurrentTime(0);setIsPlaying(true);setTimeout(()=>audioRef.current?.play().catch(()=>{}),80);} };
  const reshufflePlaylist = () => { setPlaylist(shuffle(tracks)); setPlaylistIndex(0); setIsPlaying(false); audioRef.current?.pause(); showToast("🔀 Playlist herschud!"); };

  const vote = async (trackId, type) => {
    if (!user) { setShowAuth(true); return; }
    const cooldownKey = `${trackId}_${type}`;
    const lastVote = voteCooldowns[cooldownKey];
    if (lastVote && Date.now() - lastVote < VOTE_COOLDOWN_MS) {
      showToast(`Wacht even voor je opnieuw stemt!`, "warn"); return;
    }
    setVoteCooldowns(prev => ({ ...prev, [cooldownKey]: Date.now() }));
    await supabase.from("votes").insert({ track_id:trackId, user_id:user.id, vote_type:type });
    const newFlames = new Set(userVotes.flames);
    const newLikes = new Set(userVotes.likes);
    type==="flame" ? newFlames.add(trackId) : newLikes.add(trackId);
    setUserVotes({flames:newFlames, likes:newLikes});
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, flames: type==="flame" ? t.flames+1 : t.flames, likes: type==="like" ? t.likes+1 : t.likes } : t));
    showToast(type==="flame"?"🔥 Vlam gegeven!":"❤️ Like gegeven!");
  };

  // Upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.match(/\.mp3$/i) && file.type !== "audio/mpeg") { setUploadError("Alleen MP3 bestanden."); return; }
    if (file.size > MAX_FILE_MB*1024*1024) { setUploadError(`Max ${MAX_FILE_MB} MB.`); return; }
    setUploadError(""); setUploadFile(file);
  };

  const checkAndUpload = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!uploadData.title||!uploadData.artist||!uploadData.genre||!uploadData.bio) { setUploadError("Vul alle velden in."); return; }
    if (uploadData.bio.length<20) { setUploadError("Bio minimaal 20 tekens."); return; }
    if (!uploadFile) { setUploadError("Kies een MP3 bestand."); return; }
    if (!isAdmin && uploadCount>=MAX_TRACKS) { setUploadError("Maximum van 3 nummers bereikt."); return; }

    if (!isAdmin && uploadCount >= FREE_TRACKS) {
      setPendingUpload(true);
      setShowPayment(true);
      return;
    }
    await doUpload();
  };

  const doUpload = async () => {
    setUploading(true); setUploadError("");
    try {
      const ext = uploadFile.name.split(".").pop()||"mp3";
      const filename = `${user.id}/${Date.now()}.${ext}`;
      const { error: se } = await supabase.storage.from("audio").upload(filename, uploadFile, { contentType:uploadFile.type, cacheControl:"31536000" });
      if (se) throw se;
      const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(filename);
      const { error: de } = await supabase.from("tracks").insert({
        title:uploadData.title, artist:uploadData.artist, genre:uploadData.genre, bio:uploadData.bio,
        color:uploadData.color, audio_url:publicUrl, user_id:user.id,
        month:new Intl.DateTimeFormat("nl-NL",{month:"long",year:"numeric"}).format(new Date()),
        week_number:getWeek(), year:new Date().getFullYear(),
        is_amateur:true,
        payment_status: isAdmin?"admin":uploadCount===0?"free":"paid"
      });
      if (de) throw de;
      setUploadData({title:"",artist:"",genre:"",bio:"",color:"blue",isAmateur:true});
      setUploadFile(null); setUploadStep(1); setView("radio");
      showToast("🎵 Nummer live op BIGTUNES Radio!");
      loadTracks();
    } catch (err) { setUploadError("Upload mislukt: "+err.message); }
    finally { setUploading(false); setShowPayment(false); setPendingUpload(null); }
  };

  const adminDeleteTrack = async (track) => {
    if (track.audio_url) { const path=track.audio_url.split("/audio/")[1]; if(path) await supabase.storage.from("audio").remove([path]); }
    await supabase.from("votes").delete().eq("track_id",track.id);
    await supabase.from("comments").delete().eq("track_id",track.id);
    await supabase.from("tracks").delete().eq("id",track.id);
    showToast(`🗑 "${track.title}" verwijderd`);
    loadTracks();
  };

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); showToast("Uitgelogd"); };

  // Charts
  const thisWeek = getWeek();
  const thisYear = new Date().getFullYear();
  const weeklyTracks = [...tracks].filter(t=>t.week_number===thisWeek&&t.year===thisYear).sort((a,b)=>(b.flames+b.likes)-(a.flames+a.likes));
  const monthlyTracks = [...tracks].sort((a,b)=>(b.flames+b.likes)-(a.flames+a.likes));

  const sortedTracks = [...tracks]
    .filter(t=>filterGenre==="Alles"||t.genre===filterGenre)
    .sort((a,b)=>{ if(sort==="flames") return (b.flames+b.likes*0.5)-(a.flames+a.likes*0.5); if(sort==="likes") return b.likes-a.likes; if(sort==="new") return new Date(b.created_at)-new Date(a.created_at); return 0; })
    .map((t,i)=>({...t,rank:i+1}));

  // ── Zichtbare tracks (infinite scroll slice) ───────────────
  const visibleTracks = sortedTracks.slice(0, visibleCount);
  const hasMore = visibleCount < sortedTracks.length;

  const topTrack = sortedTracks[0];

  const BtnStyle = (active,accent) => ({ display:"flex",alignItems:"center",gap:4,background:active?`${accent}18`:"transparent",border:`1px solid ${active?accent:"rgba(255,255,255,0.08)"}`,borderRadius:20,padding:"3px 10px",color:active?accent:"#555",fontFamily:"sans-serif",fontSize:12,cursor:"pointer" });
  const inp = { width:"100%", background:"rgba(12,5,2,0.8)", border:"1px solid rgba(155,107,58,0.12)", borderRadius:9, padding:"10px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:14, boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ fontFamily:"'Georgia', serif", background:"#080304", minHeight:"100vh", color:"#f0ede8", position:"relative" }}>
      <audio ref={audioRef} style={{ display:"none" }}/>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .desktop-layout { display: flex; min-height: 100vh; }
        .desktop-left { width: 380px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; border-right: 1px solid rgba(155,107,58,0.2); background: rgba(4,2,1,0.6); backdrop-filter: blur(12px); }
        .desktop-right { flex: 1; max-width: 700px; overflow-y: auto; padding-bottom: 40px; padding: 20px 30px 40px; }
        .desktop-center { display: flex; justify-content: center; flex: 1; background: rgba(4,2,1,0.75); backdrop-filter: blur(8px); }
        @media (max-width: 768px) {
          .desktop-layout { display: block; }
          .desktop-left { width: 100%; height: auto; position: relative; border-right: none; }
          .desktop-right { max-width: 100%; }
          .desktop-center { display: block; }
        }
      `}</style>

      {/* Achtergrond */}
      <div style={{ position:"fixed", top:0, left:0, width:"100%", height:"100vh", zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`url('${BG_IMAGE}')`, backgroundSize:"cover", backgroundPosition:"center top" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.98) 100%)" }}/>
      </div>

      {/* Modals */}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onAuth={setUser}/>}
      {showAdmin&&<AdminPanel tracks={tracks} onDelete={adminDeleteTrack} onClose={()=>setShowAdmin(false)}/>}
      {showPayment&&<PaymentModal trackTitle={uploadData.title} artistName={uploadData.artist} userId={user?.id} onClose={()=>{setShowPayment(false);setPendingUpload(null);}} onPaid={doUpload}/>}

      {/* Toast */}
      {toast&&<div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="warn"?"#BA7517":"#1D9E75",color:"#fff",padding:"10px 20px",borderRadius:24,fontSize:14,fontFamily:"sans-serif",zIndex:9998,whiteSpace:"nowrap" }}>{toast.msg}</div>}

      <div className="desktop-layout">
      <div className="desktop-left" style={{ position:"relative", zIndex:1 }}>
      {/* Header */}
      <div style={{ padding:"20px 20px 0", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:10,letterSpacing:3,color:"#9B6B3A",textTransform:"uppercase",fontFamily:"sans-serif",fontWeight:700,marginBottom:3 }}>
              <span style={{ display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#9B6B3A",marginRight:5,verticalAlign:"middle",animation:"pulse 1.2s infinite" }}/>
              On Air · Live &nbsp;·&nbsp; 👥 {liveListeners} live
            </div>
            <div style={{ fontSize:24,fontWeight:700,color:"#f0ede8",lineHeight:1,letterSpacing:-1 }}>BIG<span style={{ color:"#9B6B3A" }}>TUNES</span> RADIO</div>
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"sans-serif",marginTop:2 }}>Stompin Entertainment · Home for Independent Artists</div>
          </div>
          <div style={{ textAlign:"right" }}>
            {user ? (
              <div>
                <div style={{ fontSize:11,color:isAdmin?"#9B6B3A":"#1D9E75",fontFamily:"sans-serif",marginBottom:4 }}>{isAdmin?"🔐 Admin":"✓"} {user.email.split("@")[0]}</div>
                <div style={{ display:"flex",gap:6,justifyContent:"flex-end" }}>
                  {isAdmin&&<button onClick={()=>setShowAdmin(true)} style={{ background:"rgba(155,107,58,0.15)",border:"1px solid rgba(155,107,58,0.4)",borderRadius:8,padding:"5px 10px",color:"#9B6B3A",fontFamily:"sans-serif",fontSize:11,fontWeight:700,cursor:"pointer" }}>🔐 Beheer</button>}
                  <button onClick={logout} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"5px 10px",color:"#555",fontFamily:"sans-serif",fontSize:11,cursor:"pointer" }}>Uitloggen</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setShowAuth(true)} style={{ background:"#9B6B3A",border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontFamily:"sans-serif",fontSize:12,fontWeight:700,cursor:"pointer" }}>Inloggen</button>
            )}
          </div>
        </div>
      </div>

      {/* Bax Music Banner */}
      <div style={{ margin:"12px 20px 0", position:"relative", zIndex:1 }}>
        <a href="https://www.bax-shop.nl/" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none", display:"block" }}>
          <div style={{ background:"rgba(8,3,1,0.85)", border:"1px solid rgba(255,102,0,0.4)", borderRadius:14, padding:"11px 14px", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", gap:12, transition:"border-color 0.2s" }}
            onMouseOver={e=>e.currentTarget.style.borderColor="rgba(255,102,0,0.8)"}
            onMouseOut={e=>e.currentTarget.style.borderColor="rgba(255,102,0,0.4)"}>
            <div style={{ width:44, height:44, borderRadius:10, background:"#FF6600", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:900, fontSize:15, color:"#fff", fontFamily:"sans-serif", letterSpacing:-0.5 }}>BAX</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9, letterSpacing:1, color:"#FF6600", fontFamily:"sans-serif", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>Gesponsord</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#f0ede8", fontFamily:"sans-serif" }}>Bax Music — Jouw muziekwinkel</div>
              <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif" }}>Pro audio, DJ gear, studio & instruments</div>
            </div>
            <div style={{ fontSize:11, color:"#FF6600", fontFamily:"sans-serif", fontWeight:700, flexShrink:0 }}>Bezoek →</div>
          </div>
        </a>
      </div>

      {/* Player */}
      <div style={{ margin:"14px 20px 0", position:"relative", zIndex:1 }}>
        <div style={{ background:"rgba(8,3,1,0.85)",border:`1px solid ${c.accent}40`,borderRadius:20,padding:"16px",backdropFilter:"blur(14px)" }}>
          <div style={{ fontSize:9,letterSpacing:2,color:c.accent,fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:10 }}>
            {isPlaying?`▶ Nu speelt — #${playlistIndex+1} van ${playlist.length}`:`⏸ Gepauzeerd — #${playlistIndex+1} van ${playlist.length}`}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
            <div style={{ width:50,height:50,borderRadius:12,background:`${c.accent}25`,border:`1px solid ${c.accent}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{isPlaying?"🎵":"⏸"}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:15,fontWeight:700,color:"#f0ede8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{currentTrack?.title||(loading?"Laden...":"Geen nummers")}</div>
              <div style={{ fontSize:12,color:"#999",fontFamily:"sans-serif" }}>{currentTrack?.artist} · {currentTrack?.genre}</div>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ height:4,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden",marginBottom:4 }}>
              <div style={{ width:`${progress}%`,height:"100%",background:c.accent,borderRadius:4,transition:"width 0.6s linear" }}/>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#444",fontFamily:"sans-serif" }}>
              <span>{fmtTime(currentTime)}</span><span>{fmtTime(audioDuration)}</span>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:14 }}>
            <button onClick={reshufflePlaylist} style={{ background:"transparent",border:"none",color:"#555",fontSize:17,cursor:"pointer",padding:4 }}>🔀</button>
            <button onClick={skipBack} style={{ width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.09)",color:"#aaa",fontSize:15,cursor:"pointer" }}>⏮</button>
            <button onClick={togglePlay} style={{ width:58,height:58,borderRadius:"50%",background:c.accent,border:"none",color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>{isPlaying?"⏸":"▶"}</button>
            <button onClick={skipForward} style={{ width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.09)",color:"#aaa",fontSize:15,cursor:"pointer" }}>⏭</button>
            <button onClick={()=>currentTrack&&vote(currentTrack.id,"flame")} style={{ background:"rgba(216,90,48,0.1)",border:"1px solid rgba(216,90,48,0.25)",borderRadius:20,padding:"5px 10px",color:"#D85A30",fontSize:14,cursor:"pointer" }}>
              🔥 {currentTrack?.flames||0}
            </button>
          </div>
          {playlist.length>1&&(
            <div style={{ marginTop:12,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize:9,color:"#444",fontFamily:"sans-serif",marginBottom:5,letterSpacing:1 }}>HIERNA IN DE PLAYLIST</div>
              <div style={{ display:"flex",gap:5,overflowX:"auto",paddingBottom:2 }}>
                {playlist.slice(playlistIndex+1,playlistIndex+5).map(t=>{
                  const tc=COLOR_MAP[t.color]||COLOR_MAP.coral;
                  return <div key={t.id} onClick={()=>jumpToTrack(t)} style={{ flexShrink:0,background:"rgba(255,255,255,0.04)",border:`1px solid ${tc.accent}25`,borderRadius:8,padding:"4px 9px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer" }}><span style={{ color:tc.accent }}>▸</span> <span style={{ color:"#999" }}>{t.title}</span></div>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display:"flex",gap:4,padding:"12px 20px 0",position:"relative",zIndex:1 }}>
        {[["radio","📡","Station"],["chart","🏆","Charts"],["upload","⬆","Upload"],["about","ℹ️","Over"]].map(([v,icon,label])=>(
          <button key={v} onClick={()=>{setView(v);setUploadStep(1);}} style={{ flex:1,padding:"8px 4px",background:view===v&&view!=="detail"?"#9B6B3A":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,color:view===v&&view!=="detail"?"#fff":"#777",fontFamily:"sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>
            {icon} {label}
          </button>
        ))}
      </div>

      </div>{/* end desktop-left */}
      <div className="desktop-center" style={{ position:"relative", zIndex:1 }}>
      <div className="desktop-right">
      {/* Content */}
      <div style={{ padding:"14px 20px 60px",position:"relative",zIndex:1 }}>
        {loading&&<div style={{ textAlign:"center",padding:"40px 0",color:"#555",fontFamily:"sans-serif",fontSize:13 }}>Nummers laden...</div>}

        {/* STATION */}
        {!loading&&view==="radio"&&(
          <div>
            {topTrack&&(
              <div style={{ background:"rgba(8,3,1,0.85)",border:"1px solid rgba(155,107,58,0.5)",borderRadius:16,padding:"14px",marginBottom:14,position:"relative",overflow:"hidden",backdropFilter:"blur(10px)" }}>
                <div style={{ position:"absolute",top:-15,right:-15,fontSize:65,opacity:0.06 }}>⭐</div>
                <div style={{ fontSize:9,letterSpacing:2,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,marginBottom:6 }}>⭐ ARTIEST VAN DE MAAND</div>
                <div style={{ fontSize:20,fontWeight:700,color:"#f0ede8" }}>{topTrack.artist}</div>
                <div style={{ fontSize:12,color:"#999",fontFamily:"sans-serif",marginTop:2,marginBottom:10 }}>{topTrack.genre} · {topTrack.month}</div>
                <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(155,107,58,0.15)",borderRadius:10,padding:"9px 12px",marginBottom:10,cursor:"pointer" }} onClick={()=>{setSelectedTrack(topTrack);setView("detail");}}>
                  <div style={{ fontSize:11,color:"#777",fontFamily:"sans-serif",marginBottom:2 }}>Beste track</div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#f0ede8" }}>{topTrack.title}</div>
                </div>
                <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                  <span style={{ fontSize:12,fontFamily:"sans-serif",color:"#D85A30" }}>🔥 {topTrack.flames} vlammen</span>
                  <span style={{ fontSize:12,fontFamily:"sans-serif",color:"#AFA9EC" }}>❤️ {topTrack.likes} likes</span>
                  <button onClick={e=>{e.stopPropagation();jumpToTrack(topTrack);}} style={{ marginLeft:"auto",background:"#9B6B3A",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:12,cursor:"pointer" }}>▶</button>
                  <a href={"https://wa.me/?text="+encodeURIComponent("⭐ Artiest van de maand: "+topTrack.artist+" op BIGTUNES RADIO! 👉 https://bigtunes-radio.vercel.app")} target="_blank" rel="noreferrer" style={{ background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:18,padding:"5px 10px",color:"#25D366",fontFamily:"sans-serif",fontSize:12,textDecoration:"none" }}>📱 Deel</a>
                </div>
              </div>
            )}

            <div style={{ display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2 }}>
              {["Alles",...GENRES.slice(0,5)].map(g=><button key={g} onClick={()=>setFilterGenre(g)} style={{ whiteSpace:"nowrap",padding:"4px 11px",background:filterGenre===g?"#1D9E75":"rgba(255,255,255,0.05)",border:"none",borderRadius:18,color:filterGenre===g?"#fff":"#777",fontFamily:"sans-serif",fontSize:11,cursor:"pointer",flexShrink:0 }}>{g}</button>)}
            </div>
            <div style={{ display:"flex",gap:4,marginBottom:12 }}>
              {[["flames","🔥 Vlammen"],["likes","❤️ Likes"],["new","✨ Nieuw"]].map(([s,label])=>(
                <button key={s} onClick={()=>setSort(s)} style={{ padding:"3px 9px",background:sort===s?"rgba(155,107,58,0.15)":"transparent",border:sort===s?"1px solid #9B6B3A":"1px solid rgba(255,255,255,0.07)",borderRadius:7,color:sort===s?"#9B6B3A":"#555",fontFamily:"sans-serif",fontSize:11,cursor:"pointer" }}>{label}</button>
              ))}
            </div>

            {tracks.length===0&&<div style={{ textAlign:"center",padding:"40px 20px",color:"#555",fontFamily:"sans-serif" }}><div style={{ fontSize:32,marginBottom:10 }}>🎵</div><div>Nog geen nummers. Wees de eerste!</div></div>}

            {/* ── Infinite scroll: alleen visibleTracks renderen ── */}
            {visibleTracks.map((track,i)=>{
              const tc=COLOR_MAP[track.color]||COLOR_MAP.coral;
              const nowPlaying=currentTrack?.id===track.id;
              const hasFlame=userVotes.flames.has(track.id);
              const hasLike=userVotes.likes.has(track.id);
              return (
                <div key={track.id} style={{ background:nowPlaying?"rgba(8,3,1,0.9)":"rgba(12,5,2,0.68)",border:`1px solid ${nowPlaying?tc.accent:"rgba(155,107,58,0.08)"}`,borderRadius:13,padding:"12px",marginBottom:8,cursor:"pointer",backdropFilter:"blur(8px)" }} onClick={()=>{setSelectedTrack(track);setView("detail");}}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:32,height:32,borderRadius:8,background:`${tc.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontFamily:"sans-serif",fontWeight:700,color:tc.accent,flexShrink:0 }}>
                      {nowPlaying?(isPlaying?"♫":"⏸"):(i<3?["🥇","🥈","🥉"][i]:`#${i+1}`)}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:nowPlaying?tc.accent:"#f0ede8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{track.title}</div>
                      <div style={{ fontSize:11,color:"#666",fontFamily:"sans-serif" }}>{track.artist} · {track.genre}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();jumpToTrack(track);}} style={{ width:30,height:30,borderRadius:"50%",background:nowPlaying&&isPlaying?tc.accent:"rgba(255,255,255,0.07)",border:"none",color:nowPlaying&&isPlaying?"#fff":"#888",fontSize:12,cursor:"pointer",flexShrink:0 }}>
                      {nowPlaying&&isPlaying?"⏸":"▶"}
                    </button>
                    {isAdmin&&<button onClick={e=>{e.stopPropagation();if(window.confirm(`"${track.title}" verwijderen?`))adminDeleteTrack(track);}} style={{ width:28,height:28,borderRadius:"50%",background:"rgba(216,90,48,0.1)",border:"1px solid rgba(216,90,48,0.2)",color:"#D85A30",fontSize:11,cursor:"pointer",flexShrink:0 }}>🗑</button>}
                  </div>
                  <div style={{ display:"flex",gap:7,marginTop:9,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                    <button onClick={e=>{e.stopPropagation();vote(track.id,"flame");}} style={BtnStyle(hasFlame,"#D85A30")}>🔥 {track.flames}</button>
                    <button onClick={e=>{e.stopPropagation();vote(track.id,"like");}} style={BtnStyle(hasLike,"#7F77DD")}>❤️ {track.likes}</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`🎵 "${track.title}" van ${track.artist} op BIGTUNES RADIO! 👉 https://bigtunes-radio.vercel.app`)}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"flex",alignItems:"center",gap:4,background:"transparent",border:"1px solid rgba(37,211,102,0.3)",borderRadius:20,padding:"3px 10px",color:"#25D366",fontFamily:"sans-serif",fontSize:12,textDecoration:"none",marginLeft:"auto" }}>📱 Deel</a>
                  </div>
                </div>
              );
            })}

            {/* ── Sentinel + loading indicator ── */}
            <div ref={sentinelRef} style={{ height:1 }}/>
            {isLoadingMore && (
              <div style={{ textAlign:"center", padding:"16px 0", color:"#555", fontFamily:"sans-serif", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <div style={{ width:16, height:16, border:"2px solid rgba(155,107,58,0.3)", borderTopColor:"#9B6B3A", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                Meer nummers laden...
              </div>
            )}
            {!hasMore && sortedTracks.length > TRACKS_PER_PAGE && (
              <div style={{ textAlign:"center", padding:"16px 0", color:"#444", fontFamily:"sans-serif", fontSize:12 }}>
                ✓ Alle {sortedTracks.length} nummers geladen
              </div>
            )}
          </div>
        )}

        {/* CHARTS */}
        {!loading&&view==="chart"&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:19,fontWeight:700,color:"#f0ede8",marginBottom:8 }}>🏆 Charts</div>
              <div style={{ display:"flex",gap:6 }}>
                <button onClick={()=>setChartPeriod("week")} style={{ flex:1,padding:"8px",background:chartPeriod==="week"?"#9B6B3A":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,color:chartPeriod==="week"?"#fff":"#777",fontFamily:"sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>📅 Deze week</button>
                <button onClick={()=>setChartPeriod("month")} style={{ flex:1,padding:"8px",background:chartPeriod==="month"?"#9B6B3A":"rgba(255,255,255,0.06)",border:"none",borderRadius:10,color:chartPeriod==="month"?"#fff":"#777",fontFamily:"sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>🗓 Deze maand</button>
              </div>
            </div>

            {(chartPeriod==="week"?weeklyTracks:monthlyTracks).slice(0,10).map((track,i)=>{
              const total=track.flames+track.likes;
              const chartList = chartPeriod==="week"?weeklyTracks:monthlyTracks;
              const max=(chartList[0]?.flames||0)+(chartList[0]?.likes||0)||1;
              const pct=Math.round((total/max)*100);
              const tc=COLOR_MAP[track.color]||COLOR_MAP.coral;
              return (
                <div key={track.id} onClick={()=>{setSelectedTrack(track);setView("detail");}} style={{ marginBottom:10,cursor:"pointer",background:"rgba(12,5,2,0.6)",borderRadius:11,padding:"11px",border:"1px solid rgba(155,107,58,0.08)",backdropFilter:"blur(6px)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:7 }}>
                    <div style={{ width:26,textAlign:"center",fontSize:14 }}>{i<3?["🥇","🥈","🥉"][i]:`${i+1}.`}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:"#f0ede8" }}>{track.title}</div>
                      <div style={{ fontSize:11,color:"#666",fontFamily:"sans-serif" }}>{track.artist}</div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ fontSize:11,fontFamily:"sans-serif",color:"#888" }}>🔥{track.flames} ❤️{track.likes}</span>
                      {isAdmin&&<button onClick={e=>{e.stopPropagation();if(window.confirm(`Verwijderen?`))adminDeleteTrack(track);}} style={{ background:"rgba(216,90,48,0.1)",border:"none",borderRadius:6,padding:"3px 7px",color:"#D85A30",fontSize:11,cursor:"pointer" }}>🗑</button>}
                    </div>
                  </div>
                  <div style={{ height:4,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`,height:"100%",background:tc.accent,borderRadius:4 }}/>
                  </div>
                </div>
              );
            })}

            {chartPeriod==="week"&&weeklyTracks.length===0&&(
              <div style={{ textAlign:"center",padding:"30px 0",color:"#555",fontFamily:"sans-serif",fontSize:13 }}>Nog geen nummers deze week geüpload.</div>
            )}

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:18 }}>
              {[["Nummers",tracks.length],["Vlammen",tracks.reduce((s,t)=>s+t.flames,0)],["Likes",tracks.reduce((s,t)=>s+t.likes,0)],["Artiesten",new Set(tracks.map(t=>t.artist)).size]].map(([l,v])=>(
                <div key={l} style={{ background:"rgba(12,5,2,0.6)",border:"1px solid rgba(155,107,58,0.07)",borderRadius:11,padding:"11px 13px" }}>
                  <div style={{ fontSize:10,color:"#555",fontFamily:"sans-serif",marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:20,fontWeight:700,color:"#f0ede8" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UPLOAD */}
        {view==="upload"&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:19,fontWeight:700,color:"#f0ede8",marginBottom:2 }}>⬆ Upload je nummer</div>
              <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginBottom:8 }}>Independent artists only · MP3 · Max. 3 MB</div>

              <div style={{ background:"rgba(155,107,58,0.08)",border:"1px solid rgba(155,107,58,0.2)",borderRadius:10,padding:"10px 12px",marginBottom:8 }}>
                <div style={{ fontSize:12,fontFamily:"sans-serif",color:"#9B6B3A",fontWeight:700,marginBottom:4 }}>📋 Upload regels</div>
                <div style={{ fontSize:11,fontFamily:"sans-serif",color:"#888",lineHeight:1.6 }}>
                  ✅ Uploaden — <strong style={{ color:"#1D9E75" }}>Gratis</strong><br/>
                  🎵 Maximum 3 nummers per artiest<br/>
                  🎤 Independent & unsigned artists only
                </div>
              </div>

              {user&&!isAdmin&&<div style={{ background:"rgba(29,158,117,0.1)",border:"1px solid rgba(29,158,117,0.3)",borderRadius:9,padding:"7px 12px",fontSize:12,fontFamily:"sans-serif",color:"#5DCAA5" }}>
                Jouw uploads: {uploadCount}/{MAX_TRACKS} {uploadCount>=FREE_TRACKS&&!isAdmin?`· Volgende kost €${PRICE_PER_TRACK}`:""}
              </div>}
              {isAdmin&&<div style={{ background:"rgba(155,107,58,0.1)",border:"1px solid rgba(155,107,58,0.3)",borderRadius:9,padding:"7px 12px",fontSize:12,fontFamily:"sans-serif",color:"#9B6B3A" }}>🔐 Admin — onbeperkt uploaden</div>}
              {!user&&<div style={{ marginTop:8,background:"rgba(216,90,48,0.1)",border:"1px solid rgba(216,90,48,0.3)",borderRadius:9,padding:"10px 12px" }}>
                <div style={{ fontSize:13,color:"#D85A30",fontFamily:"sans-serif",marginBottom:6 }}>Log in om te uploaden</div>
                <button onClick={()=>setShowAuth(true)} style={{ background:"#9B6B3A",border:"none",borderRadius:8,padding:"8px 16px",color:"#fff",fontFamily:"sans-serif",fontSize:13,fontWeight:700,cursor:"pointer" }}>Inloggen / Aanmelden</button>
              </div>}
            </div>

            {user&&!isAdmin&&uploadCount>=MAX_TRACKS&&<div style={{ background:"rgba(216,90,48,0.1)",border:"1px solid rgba(216,90,48,0.3)",borderRadius:12,padding:"20px",textAlign:"center",fontFamily:"sans-serif" }}><div style={{ fontSize:28,marginBottom:8 }}>🎵</div><div style={{ fontSize:14,color:"#D85A30",fontWeight:600 }}>Maximum van 3 nummers bereikt</div></div>}

            {user&&(isAdmin||uploadCount<MAX_TRACKS)&&(
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:16 }}>
                  {[1,2,3].map(s=><div key={s} style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:24,height:24,borderRadius:"50%",background:uploadStep>=s?"#9B6B3A":"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontFamily:"sans-serif",fontWeight:700,color:uploadStep>=s?"#fff":"#444" }}>{s}</div>{s<3&&<div style={{ width:18,height:2,background:uploadStep>s?"#9B6B3A":"rgba(255,255,255,0.06)" }}/>}</div>)}
                  <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginLeft:5 }}>{uploadStep===1?"Basisinfo":uploadStep===2?"Bio & stijl":"Audio"}</div>
                </div>

                {uploadStep===1&&(
                  <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                    {[["Naam van het nummer","title","bijv. Nachtrit door de Stad"],["Artiestennaam","artist","Jouw naam of bandnaam"]].map(([label,key,ph])=>(
                      <div key={key}><div style={{ fontSize:11,color:"#777",fontFamily:"sans-serif",marginBottom:4 }}>{label} *</div><input value={uploadData[key]} onChange={e=>setUploadData(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inp}/></div>
                    ))}
                    <div><div style={{ fontSize:11,color:"#777",fontFamily:"sans-serif",marginBottom:4 }}>Genre *</div>
                    <select value={uploadData.genre} onChange={e=>setUploadData(p=>({...p,genre:e.target.value}))} style={{ ...inp,color:uploadData.genre?"#f0ede8":"#555" }}>
                      <option value="">Kies genre...</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}
                    </select></div>
                    <div style={{ background:"rgba(155,107,58,0.08)",border:"1px solid rgba(155,107,58,0.2)",borderRadius:9,padding:"10px 12px",fontSize:12,fontFamily:"sans-serif",color:"#9B6B3A" }}>
                      🎤 Confirm: this is independent / unsigned music — no major label releases
                    </div>
                    <button onClick={()=>{if(!uploadData.title||!uploadData.artist||!uploadData.genre){setUploadError("Vul alle velden in.");return;}setUploadError("");setUploadStep(2);}} style={{ background:"#9B6B3A",border:"none",borderRadius:11,padding:"12px",color:"#fff",fontFamily:"sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>Volgende →</button>
                  </div>
                )}

                {uploadStep===2&&(
                  <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                    <div><div style={{ fontSize:11,color:"#777",fontFamily:"sans-serif",marginBottom:4 }}>Verhaal achter je track * <span style={{ color:"#444" }}>(min. 20 tekens)</span></div>
                    <textarea value={uploadData.bio} onChange={e=>setUploadData(p=>({...p,bio:e.target.value}))} placeholder="Vertel het verhaal achter dit nummer..." rows={5} style={{ ...inp,resize:"vertical" }}/>
                    <div style={{ fontSize:10,color:uploadData.bio.length<20?"#D85A30":"#1D9E75",fontFamily:"sans-serif",textAlign:"right",marginTop:3 }}>{uploadData.bio.length} tekens</div></div>
                    <div><div style={{ fontSize:11,color:"#777",fontFamily:"sans-serif",marginBottom:7 }}>Kleur voor je kaart</div>
                    <div style={{ display:"flex",gap:9,flexWrap:"wrap" }}>{COLORS.map(col=><button key={col} onClick={()=>setUploadData(p=>({...p,color:col}))} style={{ width:32,height:32,borderRadius:"50%",background:COLOR_MAP[col].accent,border:uploadData.color===col?"3px solid #fff":"3px solid transparent",cursor:"pointer",outline:"none" }}/>)}</div></div>
                    <div style={{ display:"flex",gap:7 }}>
                      <button onClick={()=>setUploadStep(1)} style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"none",borderRadius:11,padding:"12px",color:"#666",fontFamily:"sans-serif",fontSize:14,cursor:"pointer" }}>← Terug</button>
                      <button onClick={()=>{if(uploadData.bio.length<20){setUploadError("Bio te kort.");return;}setUploadError("");setUploadStep(3);}} style={{ flex:2,background:"#9B6B3A",border:"none",borderRadius:11,padding:"12px",color:"#fff",fontFamily:"sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>Volgende →</button>
                    </div>
                  </div>
                )}

                {uploadStep===3&&(
                  <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                    <div onClick={()=>fileRef.current?.click()} style={{ border:`2px dashed ${uploadFile?"#1D9E75":"rgba(255,255,255,0.1)"}`,borderRadius:13,padding:"28px 18px",textAlign:"center",cursor:"pointer",background:uploadFile?"rgba(29,158,117,0.05)":"transparent" }}>
                      <div style={{ fontSize:30,marginBottom:7 }}>{uploadFile?"✅":"🎵"}</div>
                      <div style={{ fontSize:13,color:uploadFile?"#1D9E75":"#666",fontFamily:"sans-serif",fontWeight:600 }}>{uploadFile?uploadFile.name:"Tik om MP3 te kiezen"}</div>
                      {uploadFile&&<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginTop:3 }}>{(uploadFile.size/1024/1024).toFixed(2)} MB</div>}
                      <div style={{ fontSize:10,color:"#444",fontFamily:"sans-serif",marginTop:5 }}>Alleen MP3 · Max. 3 MB</div>
                      <input ref={fileRef} type="file" accept=".mp3,audio/mpeg" onChange={handleFileSelect} style={{ display:"none" }}/>
                    </div>

                    {!isAdmin&&uploadCount>=FREE_TRACKS&&(
                      <div style={{ background:"rgba(155,107,58,0.1)",border:"1px solid rgba(155,107,58,0.3)",borderRadius:10,padding:"10px 12px",fontSize:12,fontFamily:"sans-serif",color:"#9B6B3A" }}>
                        💳 Dit is je {uploadCount+1}e nummer — na bevestiging betaal je €2,50 via iDEAL
                      </div>
                    )}

                    <div style={{ display:"flex",gap:7 }}>
                      <button onClick={()=>setUploadStep(2)} style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"none",borderRadius:11,padding:"12px",color:"#666",fontFamily:"sans-serif",fontSize:14,cursor:"pointer" }}>← Terug</button>
                      <button onClick={checkAndUpload} disabled={!uploadFile||uploading} style={{ flex:2,background:uploadFile&&!uploading?"#9B6B3A":"#1a1a1a",border:"none",borderRadius:11,padding:"12px",color:uploadFile&&!uploading?"#fff":"#444",fontFamily:"sans-serif",fontSize:14,fontWeight:700,cursor:uploadFile&&!uploading?"pointer":"default" }}>
                        {uploading?"Uploaden...":!isAdmin&&uploadCount>=FREE_TRACKS?"💳 Uploaden (€2,50)":"📡 Zet op BIGTUNES"}
                      </button>
                    </div>
                  </div>
                )}
                {uploadError&&<div style={{ background:"rgba(216,90,48,0.1)",border:"1px solid rgba(216,90,48,0.3)",borderRadius:9,padding:"8px 13px",fontSize:12,color:"#D85A30",fontFamily:"sans-serif",marginTop:8 }}>⚠️ {uploadError}</div>}
              </div>
            )}
          </div>
        )}

        {/* ABOUT */}
        {view==="about"&&(
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:10,letterSpacing:3,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:8 }}>
                ● Stompin Entertainment presenteert
              </div>
              <div style={{ fontSize:26,fontWeight:700,color:"#f0ede8",lineHeight:1.2,marginBottom:12 }}>
                BIG<span style={{ color:"#9B6B3A" }}>TUNES</span> RADIO
              </div>
              <div style={{ fontSize:15,color:"#ccc",lineHeight:1.8,fontStyle:"italic",borderLeft:"3px solid #9B6B3A",paddingLeft:14,marginBottom:20 }}>
                "Voor de stemmen die niemand hoort — de artiesten die te rauw, te echt en te vrij zijn voor de grote commerciële stations."
              </div>
            </div>

            <div style={{ background:"rgba(12,5,2,0.75)",border:"1px solid rgba(155,107,58,0.2)",borderRadius:16,padding:"20px",marginBottom:14,backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:10 }}>🎯 Onze Missie</div>
              <div style={{ fontSize:14,color:"#ccc",lineHeight:1.8 }}>
                BIGTUNES RADIO is opgericht voor artiesten die geen airplay krijgen op de grote commerciële radiostations. Hier vind je geen opgelegde hitlijsten of label-gedreven muziek — alleen puur, ongepolijst talent.
              </div>
              <div style={{ fontSize:14,color:"#ccc",lineHeight:1.8,marginTop:12 }}>
                Of je nu underground hip-hop maakt, harde electronic, ruwe R&B of experimentele dancehall — bij BIGTUNES krijg jij de spotlight die je verdient.
              </div>
            </div>

            <div style={{ background:"rgba(12,5,2,0.75)",border:"1px solid rgba(155,107,58,0.2)",borderRadius:16,padding:"20px",marginBottom:14,backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:14 }}>🎵 Wat je hier vindt</div>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {[
                  ["🔥","Underground & Ongesigned","Puur artistieke tracks — geen labels, geen filters, geen compromissen"],
                  ["🎤","Echte Artiesten","Independent musicians die hun hart in hun muziek stoppen"],
                  ["🏆","Community Stemmen","Jij bepaalt wie bovenaan staat — niet een algoritme of een label"],
                  ["📡","On-Demand Radio","Luister wanneer je wil, stem op wat je raakt, deel wat je beweegt"],
                ].map(([icon,title,desc])=>(
                  <div key={title} style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
                    <div style={{ fontSize:22,flexShrink:0,marginTop:2 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:"#f0ede8",marginBottom:3 }}>{title}</div>
                      <div style={{ fontSize:12,color:"#777",fontFamily:"sans-serif",lineHeight:1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(155,107,58,0.08)",border:"1px solid rgba(155,107,58,0.3)",borderRadius:16,padding:"20px",marginBottom:14,backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:10 }}>🎸 Voor Artiesten</div>
              <div style={{ fontSize:14,color:"#ccc",lineHeight:1.8,marginBottom:14 }}>
                Ben jij een ongesigned artiest die zijn muziek wil delen met de wereld? Upload je track en laat de community beslissen. Upload je eerste nummer <strong style={{ color:"#1D9E75" }}>gratis</strong> en laat de wereld jouw muziek horen.
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
                {[
                  ["✅","Uploaden — Gratis"],
                  ["🎵","Maximaal 3 nummers per artiest"],
                  ["🎤","Alleen independent & unsigned artiesten"],
                  ["📱","MP3 formaat · Max. 3 MB"],
                ].map(([icon,text])=>(
                  <div key={text} style={{ display:"flex",gap:8,alignItems:"center",fontSize:13,fontFamily:"sans-serif",color:"#aaa" }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>setView("upload")} style={{ width:"100%",background:"#9B6B3A",border:"none",borderRadius:11,padding:"13px",color:"#fff",fontFamily:"sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>
                🎵 Upload je nummer nu
              </button>
            </div>

            <div style={{ background:"rgba(12,5,2,0.75)",border:"1px solid rgba(155,107,58,0.2)",borderRadius:16,padding:"20px",marginBottom:14,backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:10 }}>🏢 Stompin Entertainment</div>
              <div style={{ fontSize:14,color:"#ccc",lineHeight:1.8 }}>
                BIGTUNES RADIO is een initiatief van <strong style={{ color:"#f0ede8" }}>Stompin Entertainment</strong> — dedicated to giving independent artists the platform they deserve.
              </div>
              <div style={{ marginTop:14,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginBottom:8 }}>CONTACT</div>
                <a href="mailto:info@stompinent.com" style={{ fontSize:13,color:"#9B6B3A",fontFamily:"sans-serif",textDecoration:"none" }}>
                  📧 stompinent@gmail.com
                </a>
              </div>
            </div>

            <div style={{ background:"rgba(12,5,2,0.75)",border:"1px solid rgba(155,107,58,0.2)",borderRadius:16,padding:"20px",backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"#9B6B3A",fontFamily:"sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:14 }}>📊 Hoe werkt de ranglijst?</div>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {[
                  ["🔥","Geef een vlam","Vlammen tellen zwaarder mee in de ranglijst — dit is jouw krachtigste stem"],
                  ["❤️","Geef een like","Likes tellen ook mee — samen bepalen ze wie bovenaan staat"],
                  ["🏆","Nummer van de maand","Het nummer met de meeste stemmen wint de maandtitel"],
                  ["📅","Wekelijkse chart","Elke week een verse top 10 — jouw stem telt direct mee"],
                ].map(([icon,title,desc])=>(
                  <div key={title} style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
                    <div style={{ fontSize:20,flexShrink:0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize:13,fontWeight:700,color:"#f0ede8",marginBottom:2 }}>{title}</div>
                      <div style={{ fontSize:12,color:"#777",fontFamily:"sans-serif",lineHeight:1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {view==="detail"&&selectedTrack&&(()=>{
          const track=tracks.find(t=>t.id===selectedTrack.id)||selectedTrack;
          const tc=COLOR_MAP[track.color]||COLOR_MAP.coral;
          const rankPos=sortedTracks.findIndex(t=>t.id===track.id)+1;
          const nowPlaying=currentTrack?.id===track.id;
          const hasFlame=userVotes.flames.has(track.id);
          const hasLike=userVotes.likes.has(track.id);
          return (
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                <button onClick={()=>setView("radio")} style={{ background:"rgba(255,255,255,0.05)",border:"none",borderRadius:9,padding:"6px 13px",color:"#666",fontFamily:"sans-serif",fontSize:12,cursor:"pointer" }}>← Terug</button>
                {isAdmin&&<button onClick={()=>{if(window.confirm(`"${track.title}" verwijderen?`))adminDeleteTrack(track).then(()=>setView("radio"));}} style={{ background:"rgba(216,90,48,0.1)",border:"1px solid rgba(216,90,48,0.3)",borderRadius:9,padding:"6px 13px",color:"#D85A30",fontFamily:"sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>🗑 Verwijderen</button>}
              </div>

              <div style={{ background:`${tc.bg}10`,border:`1px solid ${tc.accent}30`,borderRadius:15,padding:"16px",marginBottom:12,backdropFilter:"blur(8px)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9 }}>
                  <div>
                    <div style={{ fontSize:21,fontWeight:700,color:"#f0ede8",lineHeight:1.2 }}>{track.title}</div>
                    <div style={{ fontSize:13,color:"#999",fontFamily:"sans-serif",marginTop:2 }}>{track.artist}</div>
                  </div>
                  <div style={{ background:tc.accent,color:"#fff",padding:"4px 11px",borderRadius:18,fontSize:12,fontFamily:"sans-serif",fontWeight:700 }}>#{rankPos}</div>
                </div>
                <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                  <span style={{ background:`${tc.badge}45`,color:tc.text,padding:"2px 8px",borderRadius:9,fontSize:11,fontFamily:"sans-serif" }}>{track.genre}</span>
                  <span style={{ background:"rgba(255,255,255,0.04)",color:"#555",padding:"2px 8px",borderRadius:9,fontSize:11,fontFamily:"sans-serif" }}>{track.month}</span>
                  <span style={{ background:"rgba(155,107,58,0.12)",color:"#9B6B3A",padding:"2px 8px",borderRadius:9,fontSize:11,fontFamily:"sans-serif" }}>🎤 Independent</span>
                  {nowPlaying&&<span style={{ background:`${tc.accent}20`,color:tc.accent,padding:"2px 8px",borderRadius:9,fontSize:11,fontFamily:"sans-serif" }}>▶ Speelt nu</span>}
                  {user&&track.user_id===user.id&&<span style={{ background:"rgba(29,158,117,0.12)",color:"#1D9E75",padding:"2px 8px",borderRadius:9,fontSize:11,fontFamily:"sans-serif" }}>Jouw nummer</span>}
                </div>
              </div>

              <div style={{ background:"rgba(12,5,2,0.65)",border:"1px solid rgba(155,107,58,0.08)",borderRadius:13,padding:"13px",marginBottom:11,backdropFilter:"blur(8px)" }}>
                <button onClick={()=>jumpToTrack(track)} style={{ width:"100%",background:nowPlaying&&isPlaying?`${tc.accent}18`:tc.accent,border:nowPlaying&&isPlaying?`1px solid ${tc.accent}`:"none",borderRadius:11,padding:"12px",color:"#fff",fontFamily:"sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>
                  {nowPlaying&&isPlaying?"⏸ Pauze":"▶ Afspelen via BIGTUNES playlist"}
                </button>
              </div>

              <div style={{ background:"rgba(12,5,2,0.65)",border:"1px solid rgba(155,107,58,0.08)",borderRadius:13,padding:"13px",marginBottom:11,backdropFilter:"blur(8px)" }}>
                <div style={{ fontSize:9,color:"#555",fontFamily:"sans-serif",marginBottom:7,letterSpacing:1,textTransform:"uppercase" }}>Over dit nummer</div>
                <div style={{ fontSize:14,color:"#ccc",lineHeight:1.75 }}>{track.bio}</div>
              </div>

              <div style={{ background:"rgba(12,5,2,0.65)",border:"1px solid rgba(155,107,58,0.08)",borderRadius:13,padding:"13px",marginBottom:11,backdropFilter:"blur(8px)" }}>
                <div style={{ fontSize:9,color:"#555",fontFamily:"sans-serif",marginBottom:11,letterSpacing:1,textTransform:"uppercase" }}>Stem — onbeperkt, elke 5 seconden</div>
                {!user&&<div style={{ textAlign:"center",marginBottom:10 }}><button onClick={()=>setShowAuth(true)} style={{ color:"#9B6B3A",background:"transparent",border:"none",cursor:"pointer",fontFamily:"sans-serif",fontSize:12 }}>Log in om te stemmen →</button></div>}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:9 }}>
                  <button onClick={()=>vote(track.id,"flame")} style={{ padding:"13px",background:hasFlame?"rgba(216,90,48,0.13)":"rgba(255,255,255,0.02)",border:`2px solid ${hasFlame?"#D85A30":"rgba(255,255,255,0.06)"}`,borderRadius:11,cursor:"pointer" }}>
                    <div style={{ fontSize:24 }}>🔥</div>
                    <div style={{ fontSize:19,fontWeight:700,color:"#D85A30",fontFamily:"sans-serif" }}>{track.flames}</div>
                    <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif" }}>Vlammen</div>
                  </button>
                  <button onClick={()=>vote(track.id,"like")} style={{ padding:"13px",background:hasLike?"rgba(127,119,221,0.13)":"rgba(255,255,255,0.02)",border:`2px solid ${hasLike?"#7F77DD":"rgba(255,255,255,0.06)"}`,borderRadius:11,cursor:"pointer" }}>
                    <div style={{ fontSize:24 }}>❤️</div>
                    <div style={{ fontSize:19,fontWeight:700,color:"#AFA9EC",fontFamily:"sans-serif" }}>{track.likes}</div>
                    <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif" }}>Likes</div>
                  </button>
                </div>
                <div style={{ marginTop:9,fontSize:10,color:"#444",fontFamily:"sans-serif",textAlign:"center" }}>Hoe meer stemmen, hoe hoger in de charts!</div>
              </div>

              <div style={{ background:"rgba(12,5,2,0.65)",border:"1px solid rgba(155,107,58,0.08)",borderRadius:13,padding:"13px",marginBottom:11,backdropFilter:"blur(8px)" }}>
                <div style={{ fontSize:9,color:"#555",fontFamily:"sans-serif",marginBottom:11,letterSpacing:1,textTransform:"uppercase" }}>Deel dit nummer</div>
                <ShareButtons track={track}/>
              </div>

              <Comments trackId={track.id} user={user} isAdmin={isAdmin} onAuthRequired={()=>setShowAuth(true)}/>
            </div>
          );
        })()}
      </div>
      </div></div></div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
