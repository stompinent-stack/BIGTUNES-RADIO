import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cpltcslwtyjrnfkqmwph.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbHRjc2x3dHlqcm5ma3Ftd3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzY2MDksImV4cCI6MjA5NDQ1MjYwOX0.swoUuU6vRImhxd-diSqDvE0pa6zmXh8l3_FLDS6ktmA";
const MAX_UPLOADS = 2;
const MAX_FILE_MB = 3;
const ADMIN_EMAILS = ["stompinent@gmail.com", "wilbertmarman@gmail.com"];

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

const GENRES = ["Electronic", "Hip-Hop", "Indie Pop", "Funk", "R&B", "Pop", "Rock", "Jazz", "Reggae", "Klassiek", "Anders"];
const COLORS = Object.keys(COLOR_MAP);
const fmtTime = (s) => { if (!s || isNaN(s)) return "0:00"; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; };

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

  const inp = { width:"100%", background:"rgba(12,5,2,0.8)", border:"1px solid rgba(255,160,80,0.15)", borderRadius:9, padding:"11px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:14, boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#0d0604", border:"1px solid rgba(216,90,48,0.3)", borderRadius:18, padding:24, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:18, fontWeight:700, color:"#f0ede8", marginBottom:4 }}>{mode==="login"?"Inloggen":"Account aanmaken"}</div>
        <div style={{ fontSize:12, color:"#666", fontFamily:"sans-serif", marginBottom:20 }}>Nodig om nummers te uploaden en te stemmen</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mailadres" type="email" style={inp}/>
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Wachtwoord" type="password" style={inp}/>
        </div>
        {error&&<div style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#D85A30", fontFamily:"sans-serif", marginBottom:12 }}>⚠️ {error}</div>}
        {success&&<div style={{ background:"rgba(29,158,117,0.1)", border:"1px solid rgba(29,158,117,0.3)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#1D9E75", fontFamily:"sans-serif", marginBottom:12 }}>✅ {success}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", background:"#D85A30", border:"none", borderRadius:11, padding:"13px", color:"#fff", fontFamily:"sans-serif", fontSize:15, fontWeight:700, cursor:loading?"default":"pointer", opacity:loading?0.7:1, marginBottom:10 }}>
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

// ── ADMIN PANEEL ────────────────────────────────────────────
function AdminPanel({ tracks, onDelete, onClose }) {
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const filtered = tracks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.artist.toLowerCase().includes(search.toLowerCase()) ||
    t.genre.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (track) => {
    if (confirmId !== track.id) { setConfirmId(track.id); return; }
    setDeleting(track.id);
    await onDelete(track);
    setDeleting(null);
    setConfirmId(null);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:9990, overflowY:"auto" }}>
      <div style={{ maxWidth:420, margin:"0 auto", padding:"20px 20px 60px" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:2, color:"#D85A30", fontFamily:"sans-serif", fontWeight:700, marginBottom:2 }}>🔐 BEHEER</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>Admin Paneel</div>
            <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>BIGTUNES RADIO — {tracks.length} nummers</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 14px", color:"#aaa", fontFamily:"sans-serif", fontSize:13, cursor:"pointer" }}>✕ Sluiten</button>
        </div>

        {/* Statistieken */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
          {[
            ["Nummers", tracks.length, "#D85A30"],
            ["Vlammen", tracks.reduce((s,t)=>s+t.flames,0), "#EF9F27"],
            ["Likes", tracks.reduce((s,t)=>s+t.likes,0), "#7F77DD"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background:"rgba(12,5,2,0.8)", border:"1px solid rgba(255,160,80,0.08)", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:700, color }}>{val}</div>
              <div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Zoeken */}
        <div style={{ marginBottom:14 }}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Zoek op titel, artiest of genre..."
            style={{ width:"100%", background:"rgba(12,5,2,0.8)", border:"1px solid rgba(255,160,80,0.12)", borderRadius:9, padding:"10px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:13, boxSizing:"border-box", outline:"none" }}
          />
        </div>

        {/* Track lijst */}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"30px 0", color:"#555", fontFamily:"sans-serif", fontSize:13 }}>Geen nummers gevonden</div>
        )}

        {filtered.map(track => {
          const tc = COLOR_MAP[track.color] || COLOR_MAP.coral;
          const isConfirming = confirmId === track.id;
          const isDeleting = deleting === track.id;
          return (
            <div key={track.id} style={{ background:"rgba(12,5,2,0.75)", border:`1px solid ${isConfirming?"#D85A30":"rgba(255,160,80,0.08)"}`, borderRadius:13, padding:"13px", marginBottom:9, transition:"border-color 0.2s" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:9, background:`${tc.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🎵</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#f0ede8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{track.title}</div>
                  <div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif" }}>{track.artist} · {track.genre}</div>
                  <div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginTop:3 }}>
                    🔥 {track.flames} · ❤️ {track.likes} · {track.month}
                  </div>
                </div>
              </div>

              {/* Bio preview */}
              <div style={{ fontSize:12, color:"#666", fontFamily:"sans-serif", marginTop:8, lineHeight:1.5, borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:8 }}>
                {track.bio.length > 100 ? track.bio.slice(0,100)+"..." : track.bio}
              </div>

              {/* Audio link */}
              {track.audio_url && (
                <div style={{ marginTop:6, fontSize:11, color:"#D85A30", fontFamily:"sans-serif" }}>
                  🎵 <a href={track.audio_url} target="_blank" rel="noreferrer" style={{ color:"#D85A30" }}>Audio bekijken</a>
                </div>
              )}

              {/* Actieknoppen */}
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                {isConfirming ? (
                  <>
                    <div style={{ flex:1, fontSize:12, color:"#D85A30", fontFamily:"sans-serif", alignSelf:"center" }}>
                      ⚠️ Zeker weten? Dit verwijdert ook de audio.
                    </div>
                    <button onClick={()=>setConfirmId(null)} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:8, padding:"7px 12px", color:"#888", fontFamily:"sans-serif", fontSize:12, cursor:"pointer" }}>
                      Annuleer
                    </button>
                    <button onClick={()=>handleDelete(track)} disabled={isDeleting} style={{ background:"#D85A30", border:"none", borderRadius:8, padding:"7px 14px", color:"#fff", fontFamily:"sans-serif", fontSize:12, fontWeight:700, cursor:isDeleting?"default":"pointer", opacity:isDeleting?0.6:1 }}>
                      {isDeleting?"Verwijderen...":"Ja, verwijder"}
                    </button>
                  </>
                ) : (
                  <button onClick={()=>handleDelete(track)} style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:8, padding:"7px 14px", color:"#D85A30", fontFamily:"sans-serif", fontSize:12, fontWeight:600, cursor:"pointer", marginLeft:"auto" }}>
                    🗑 Verwijderen
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer info */}
        <div style={{ marginTop:20, padding:"12px 14px", background:"rgba(12,5,2,0.5)", border:"1px solid rgba(255,160,80,0.06)", borderRadius:10 }}>
          <div style={{ fontSize:10, color:"#444", fontFamily:"sans-serif", letterSpacing:1, marginBottom:6 }}>ADMINS</div>
          {ADMIN_EMAILS.map(email => (
            <div key={email} style={{ fontSize:12, color:"#666", fontFamily:"sans-serif", padding:"3px 0" }}>
              🔐 {email}
            </div>
          ))}
        </div>
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
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [view, setView] = useState("radio");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadData, setUploadData] = useState({ title:"", artist:"", genre:"", bio:"", color:"blue" });
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

  const audioRef = useRef(null);
  const fileRef = useRef(null);

  const currentTrack = playlist[playlistIndex] || null;
  const c = currentTrack ? (COLOR_MAP[currentTrack.color] || COLOR_MAP.coral) : COLOR_MAP.coral;
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      setIsAdmin(u ? ADMIN_EMAILS.includes(u.email) : false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      setIsAdmin(u ? ADMIN_EMAILS.includes(u.email) : false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Tracks laden
  useEffect(() => {
    loadTracks();
    const channel = supabase.channel("tracks")
      .on("postgres_changes", { event:"*", schema:"public", table:"tracks" }, () => loadTracks())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => { if (user) loadUserVotes(); else setUserVotes({ flames: new Set(), likes: new Set() }); }, [user]);
  useEffect(() => { if (user) loadUploadCount(); }, [user, tracks]);

  const loadTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("tracks").select("*").order("flames", { ascending:false });
    if (!error && data) { setTracks(data); setPlaylist(shuffle(data)); setPlaylistIndex(0); }
    setLoading(false);
  };

  const loadUserVotes = async () => {
    const { data } = await supabase.from("votes").select("track_id, vote_type").eq("user_id", user.id);
    if (data) setUserVotes({ flames: new Set(data.filter(v=>v.vote_type==="flame").map(v=>v.track_id)), likes: new Set(data.filter(v=>v.vote_type==="like").map(v=>v.track_id)) });
  };

  const loadUploadCount = async () => {
    const { count } = await supabase.from("tracks").select("*", { count:"exact", head:true }).eq("user_id", user.id);
    setUploadCount(count || 0);
  };

  // Audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setAudioDuration(audio.duration || 0);
    const onEnded = () => skipForward();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnded);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("loadedmetadata", onDur); audio.removeEventListener("ended", onEnded); };
  }, [playlistIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = playlist[playlistIndex];
    if (track?.audio_url) { audio.src = track.audio_url; if (isPlaying) audio.play().catch(()=>{}); }
    else { audio.src = ""; setCurrentTime(0); setAudioDuration(0); }
  }, [playlistIndex, playlist]);

  const togglePlay = () => {
    if (!currentTrack?.audio_url) { showToast("Geen audio beschikbaar","warn"); return; }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(()=>{}); setIsPlaying(true); }
  };

  const skipForward = () => { const next=(playlistIndex+1)%playlist.length; setPlaylistIndex(next); setCurrentTime(0); if (isPlaying) setTimeout(()=>audioRef.current?.play().catch(()=>{}),80); };
  const skipBack = () => {
    if (currentTime>3&&audioRef.current) { audioRef.current.currentTime=0; setCurrentTime(0); }
    else { const prev=(playlistIndex-1+playlist.length)%playlist.length; setPlaylistIndex(prev); setCurrentTime(0); if (isPlaying) setTimeout(()=>audioRef.current?.play().catch(()=>{}),80); }
  };
  const jumpToTrack = (track) => { const idx=playlist.findIndex(t=>t.id===track.id); if (idx>=0) { setPlaylistIndex(idx); setCurrentTime(0); setIsPlaying(true); setTimeout(()=>audioRef.current?.play().catch(()=>{}),80); } };
  const reshufflePlaylist = () => { setPlaylist(shuffle(tracks)); setPlaylistIndex(0); setIsPlaying(false); audioRef.current?.pause(); showToast("🔀 Playlist herschud!"); };

  // Stemmen
  const vote = async (trackId, type) => {
    if (!user) { setShowAuth(true); return; }
    const set = type==="flame" ? userVotes.flames : userVotes.likes;
    const hasVoted = set.has(trackId);
    const newFlames = new Set(userVotes.flames);
    const newLikes = new Set(userVotes.likes);
    if (hasVoted) {
      await supabase.from("votes").delete().match({ track_id:trackId, user_id:user.id, vote_type:type });
      type==="flame" ? newFlames.delete(trackId) : newLikes.delete(trackId);
    } else {
      await supabase.from("votes").insert({ track_id:trackId, user_id:user.id, vote_type:type });
      type==="flame" ? newFlames.add(trackId) : newLikes.add(trackId);
    }
    setUserVotes({ flames:newFlames, likes:newLikes });
    loadTracks();
  };

  // Admin: nummer verwijderen
  const adminDeleteTrack = async (track) => {
    // Verwijder audio uit Storage
    if (track.audio_url) {
      const path = track.audio_url.split("/audio/")[1];
      if (path) await supabase.storage.from("audio").remove([path]);
    }
    // Verwijder stemmen
    await supabase.from("votes").delete().eq("track_id", track.id);
    // Verwijder track
    await supabase.from("tracks").delete().eq("id", track.id);
    showToast(`🗑 "${track.title}" verwijderd`);
    loadTracks();
  };

  // Upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.mp3$/i) && file.type !== "audio/mpeg") { setUploadError("Alleen MP3 bestanden toegestaan."); return; }
    if (file.size > MAX_FILE_MB*1024*1024) { setUploadError(`Max ${MAX_FILE_MB} MB.`); return; }
    setUploadError(""); setUploadFile(file);
  };

  const submitUpload = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!uploadData.title||!uploadData.artist||!uploadData.genre||!uploadData.bio) { setUploadError("Vul alle velden in."); return; }
    if (uploadData.bio.length<20) { setUploadError("Bio minimaal 20 tekens."); return; }
    if (!uploadFile) { setUploadError("Kies een audiobestand."); return; }
    if (uploadCount>=MAX_UPLOADS) { setUploadError("Max 2 nummers bereikt."); return; }
    setUploading(true); setUploadError("");
    try {
      const ext = uploadFile.name.split(".").pop() || "mp3";
      const filename = `${user.id}/${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage.from("audio").upload(filename, uploadFile, { contentType:uploadFile.type, cacheControl:"31536000" });
      if (storageError) throw storageError;
      const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(filename);
      const { error: dbError } = await supabase.from("tracks").insert({ title:uploadData.title, artist:uploadData.artist, genre:uploadData.genre, bio:uploadData.bio, color:uploadData.color, audio_url:publicUrl, user_id:user.id, month:new Intl.DateTimeFormat("nl-NL",{month:"long",year:"numeric"}).format(new Date()) });
      if (dbError) throw dbError;
      setUploadData({ title:"", artist:"", genre:"", bio:"", color:"blue" });
      setUploadFile(null); setUploadStep(1); setView("radio");
      showToast("🎵 Nummer live op BIGTUNES Radio!");
      loadTracks();
    } catch (err) { setUploadError("Upload mislukt: "+err.message); }
    finally { setUploading(false); }
  };

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); showToast("Uitgelogd"); };

  const sortedTracks = [...tracks]
    .filter(t=>filterGenre==="Alles"||t.genre===filterGenre)
    .sort((a,b)=>{ if(sort==="flames") return (b.flames+b.likes*0.5)-(a.flames+a.likes*0.5); if(sort==="likes") return b.likes-a.likes; if(sort==="new") return new Date(b.created_at)-new Date(a.created_at); return 0; })
    .map((t,i)=>({...t,rank:i+1}));
  const topTrack = sortedTracks[0];

  const BtnStyle = (active, accent) => ({ display:"flex", alignItems:"center", gap:4, background:active?`${accent}18`:"transparent", border:`1px solid ${active?accent:"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"3px 10px", color:active?accent:"#555", fontFamily:"sans-serif", fontSize:12, cursor:"pointer" });
  const inp = { width:"100%", background:"rgba(12,5,2,0.8)", border:"1px solid rgba(255,160,80,0.12)", borderRadius:9, padding:"10px 13px", color:"#f0ede8", fontFamily:"sans-serif", fontSize:14, boxSizing:"border-box", outline:"none" };

  return (
    <div style={{ fontFamily:"'Georgia', serif", background:"#080304", minHeight:"100vh", color:"#f0ede8", maxWidth:420, margin:"0 auto", position:"relative" }}>
      <audio ref={audioRef} style={{ display:"none" }}/>

      {/* Achtergrond — Stompin Entertainment */}
      <div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, height:"100vh", zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"url('https://i.ibb.co/zTjbKgPg/IMG-0355.png')", backgroundSize:"cover", backgroundPosition:"center top" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.98) 100%)" }}/>
      </div>

      {/* Modals */}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onAuth={setUser}/>}
      {showAdmin && <AdminPanel tracks={tracks} onDelete={adminDeleteTrack} onClose={()=>setShowAdmin(false)}/>}

      {/* Toast */}
      {toast&&<div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:toast.type==="warn"?"#BA7517":"#1D9E75", color:"#fff", padding:"10px 20px", borderRadius:24, fontSize:14, fontFamily:"sans-serif", zIndex:9998, whiteSpace:"nowrap" }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ padding:"20px 20px 0", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"#D85A30", textTransform:"uppercase", fontFamily:"sans-serif", fontWeight:700, marginBottom:3 }}>
              <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:"#D85A30", marginRight:5, verticalAlign:"middle", animation:"pulse 1.2s infinite" }}/>
              On Air · Live
            </div>
            <div style={{ fontSize:24, fontWeight:700, color:"#f0ede8", lineHeight:1, letterSpacing:-1 }}>BIG<span style={{ color:"#D85A30" }}>TUNES</span> RADIO</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"sans-serif", marginTop:2 }}>Voor de stemmen die niemand hoort</div>
          </div>
          <div style={{ textAlign:"right" }}>
            {user ? (
              <div>
                <div style={{ fontSize:11, color:isAdmin?"#EF9F27":"#1D9E75", fontFamily:"sans-serif", marginBottom:4 }}>
                  {isAdmin?"🔐 Admin":"✓"} {user.email.split("@")[0]}
                </div>
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  {isAdmin&&<button onClick={()=>setShowAdmin(true)} style={{ background:"rgba(216,90,48,0.15)", border:"1px solid rgba(216,90,48,0.4)", borderRadius:8, padding:"5px 10px", color:"#D85A30", fontFamily:"sans-serif", fontSize:11, fontWeight:700, cursor:"pointer" }}>🔐 Beheer</button>}
                  <button onClick={logout} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"5px 10px", color:"#555", fontFamily:"sans-serif", fontSize:11, cursor:"pointer" }}>Uitloggen</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setShowAuth(true)} style={{ background:"#D85A30", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontFamily:"sans-serif", fontSize:12, fontWeight:700, cursor:"pointer" }}>Inloggen</button>
            )}
          </div>
        </div>
      </div>

      {/* Player */}
      <div style={{ margin:"14px 20px 0", position:"relative", zIndex:1 }}>
        <div style={{ background:"rgba(8,3,1,0.82)", border:`1px solid ${c.accent}45`, borderRadius:20, padding:"16px", backdropFilter:"blur(14px)" }}>
          <div style={{ fontSize:9, letterSpacing:2, color:c.accent, fontFamily:"sans-serif", fontWeight:700, textTransform:"uppercase", marginBottom:10 }}>
            {isPlaying?`▶ Nu speelt — #${playlistIndex+1} van ${playlist.length}`:`⏸ Gepauzeerd — #${playlistIndex+1} van ${playlist.length}`}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:50, height:50, borderRadius:12, background:`${c.accent}25`, border:`1px solid ${c.accent}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
              {isPlaying?"🎵":"⏸"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#f0ede8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentTrack?.title||(loading?"Laden...":"Geen nummers")}</div>
              <div style={{ fontSize:12, color:"#999", fontFamily:"sans-serif" }}>{currentTrack?.artist} · {currentTrack?.genre}</div>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden", marginBottom:4 }}>
              <div style={{ width:`${progress}%`, height:"100%", background:c.accent, borderRadius:4, transition:"width 0.6s linear" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#444", fontFamily:"sans-serif" }}>
              <span>{fmtTime(currentTime)}</span><span>{fmtTime(audioDuration)}</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
            <button onClick={reshufflePlaylist} style={{ background:"transparent", border:"none", color:"#555", fontSize:17, cursor:"pointer", padding:4 }}>🔀</button>
            <button onClick={skipBack} style={{ width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.09)", color:"#aaa", fontSize:15, cursor:"pointer" }}>⏮</button>
            <button onClick={togglePlay} style={{ width:58, height:58, borderRadius:"50%", background:c.accent, border:"none", color:"#fff", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {isPlaying?"⏸":"▶"}
            </button>
            <button onClick={skipForward} style={{ width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.09)", color:"#aaa", fontSize:15, cursor:"pointer" }}>⏭</button>
            <button onClick={()=>currentTrack&&vote(currentTrack.id,"flame")} style={{ background:currentTrack&&userVotes.flames.has(currentTrack.id)?"rgba(216,90,48,0.15)":"transparent", border:`1px solid ${currentTrack&&userVotes.flames.has(currentTrack.id)?"#D85A30":"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"5px 10px", color:"#D85A30", fontSize:14, cursor:"pointer" }}>
              🔥 {currentTrack?.flames||0}
            </button>
          </div>
          {playlist.length>1&&(
            <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize:9, color:"#444", fontFamily:"sans-serif", marginBottom:5, letterSpacing:1 }}>HIERNA IN DE PLAYLIST</div>
              <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
                {playlist.slice(playlistIndex+1,playlistIndex+5).map(t=>{
                  const tc=COLOR_MAP[t.color]||COLOR_MAP.coral;
                  return <div key={t.id} onClick={()=>jumpToTrack(t)} style={{ flexShrink:0, background:"rgba(255,255,255,0.04)", border:`1px solid ${tc.accent}25`, borderRadius:8, padding:"4px 9px", fontSize:11, fontFamily:"sans-serif", cursor:"pointer" }}><span style={{ color:tc.accent }}>▸</span> <span style={{ color:"#999" }}>{t.title}</span></div>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", gap:4, padding:"12px 20px 0", position:"relative", zIndex:1 }}>
        {[["radio","📡","Station"],["chart","🏆","Ranglijst"],["upload","⬆","Upload"]].map(([v,icon,label])=>(
          <button key={v} onClick={()=>{setView(v);setUploadStep(1);}} style={{ flex:1, padding:"8px 4px", background:view===v&&view!=="detail"?"#D85A30":"rgba(255,255,255,0.06)", border:"none", borderRadius:10, color:view===v&&view!=="detail"?"#fff":"#777", fontFamily:"sans-serif", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:"14px 20px 60px", position:"relative", zIndex:1 }}>
        {loading&&<div style={{ textAlign:"center", padding:"40px 0", color:"#555", fontFamily:"sans-serif", fontSize:13 }}>Nummers laden...</div>}

        {/* STATION */}
        {!loading&&view==="radio"&&(
          <div>
            {topTrack&&(
              <div onClick={()=>{setSelectedTrack(topTrack);setView("detail");}} style={{ background:"rgba(8,3,1,0.75)", border:"1px solid rgba(216,90,48,0.45)", borderRadius:16, padding:"14px", marginBottom:14, cursor:"pointer", position:"relative", overflow:"hidden", backdropFilter:"blur(10px)" }}>
                <div style={{ position:"absolute", top:-15, right:-15, fontSize:65, opacity:0.06 }}>🔥</div>
                <div style={{ fontSize:9, letterSpacing:2, color:"#D85A30", fontFamily:"sans-serif", fontWeight:700, marginBottom:4 }}>🏆 NUMMER VAN DE MAAND</div>
                <div style={{ fontSize:17, fontWeight:700, color:"#f0ede8" }}>{topTrack.title}</div>
                <div style={{ fontSize:12, color:"#999", fontFamily:"sans-serif", marginBottom:8 }}>{topTrack.artist} · {topTrack.genre}</div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:12, fontFamily:"sans-serif", color:"#D85A30" }}>🔥 {topTrack.flames}</span>
                  <span style={{ fontSize:12, fontFamily:"sans-serif", color:"#AFA9EC" }}>❤️ {topTrack.likes}</span>
                  <button onClick={e=>{e.stopPropagation();jumpToTrack(topTrack);}} style={{ marginLeft:"auto", background:"#D85A30", border:"none", borderRadius:"50%", width:30, height:30, color:"#fff", fontSize:12, cursor:"pointer" }}>▶</button>
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:2 }}>
              {["Alles",...GENRES.slice(0,5)].map(g=><button key={g} onClick={()=>setFilterGenre(g)} style={{ whiteSpace:"nowrap", padding:"4px 11px", background:filterGenre===g?"#1D9E75":"rgba(255,255,255,0.05)", border:"none", borderRadius:18, color:filterGenre===g?"#fff":"#777", fontFamily:"sans-serif", fontSize:11, cursor:"pointer", flexShrink:0 }}>{g}</button>)}
            </div>
            <div style={{ display:"flex", gap:4, marginBottom:12 }}>
              {[["flames","🔥 Vlammen"],["likes","❤️ Likes"],["new","✨ Nieuw"]].map(([s,label])=>(
                <button key={s} onClick={()=>setSort(s)} style={{ padding:"3px 9px", background:sort===s?"rgba(216,90,48,0.12)":"transparent", border:sort===s?"1px solid #D85A30":"1px solid rgba(255,255,255,0.07)", borderRadius:7, color:sort===s?"#D85A30":"#555", fontFamily:"sans-serif", fontSize:11, cursor:"pointer" }}>{label}</button>
              ))}
            </div>
            {tracks.length===0&&<div style={{ textAlign:"center", padding:"40px 20px", color:"#555", fontFamily:"sans-serif" }}><div style={{ fontSize:32, marginBottom:10 }}>🎵</div><div>Nog geen nummers. Wees de eerste!</div></div>}
            {sortedTracks.map((track,i)=>{
              const tc=COLOR_MAP[track.color]||COLOR_MAP.coral;
              const nowPlaying=currentTrack?.id===track.id;
              const hasFlame=userVotes.flames.has(track.id);
              const hasLike=userVotes.likes.has(track.id);
              return (
                <div key={track.id} style={{ background:nowPlaying?"rgba(8,3,1,0.88)":"rgba(12,5,2,0.65)", border:`1px solid ${nowPlaying?tc.accent:"rgba(255,160,80,0.07)"}`, borderRadius:13, padding:"12px", marginBottom:8, cursor:"pointer", backdropFilter:"blur(8px)" }} onClick={()=>{setSelectedTrack(track);setView("detail");}}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${tc.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontFamily:"sans-serif", fontWeight:700, color:tc.accent, flexShrink:0 }}>
                      {nowPlaying?(isPlaying?"♫":"⏸"):(i<3?["🥇","🥈","🥉"][i]:`#${i+1}`)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:nowPlaying?tc.accent:"#f0ede8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{track.title}</div>
                      <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif" }}>{track.artist} · {track.genre}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();jumpToTrack(track);}} style={{ width:30, height:30, borderRadius:"50%", background:nowPlaying&&isPlaying?tc.accent:"rgba(255,255,255,0.07)", border:"none", color:nowPlaying&&isPlaying?"#fff":"#888", fontSize:12, cursor:"pointer", flexShrink:0 }}>
                      {nowPlaying&&isPlaying?"⏸":"▶"}
                    </button>
                    {isAdmin&&(
                      <button onClick={e=>{e.stopPropagation();if(window.confirm(`"${track.title}" verwijderen?`))adminDeleteTrack(track);}} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.2)", color:"#D85A30", fontSize:13, cursor:"pointer", flexShrink:0 }} title="Verwijderen">🗑</button>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:7, marginTop:9, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                    <button onClick={e=>{e.stopPropagation();vote(track.id,"flame");}} style={BtnStyle(hasFlame,"#D85A30")}>🔥 {track.flames}</button>
                    <button onClick={e=>{e.stopPropagation();vote(track.id,"like");}} style={BtnStyle(hasLike,"#7F77DD")}>❤️ {track.likes}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RANGLIJST */}
        {!loading&&view==="chart"&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:19, fontWeight:700, color:"#f0ede8", marginBottom:2 }}>🏆 Ranglijst</div>
              <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>Op basis van vlammen + likes</div>
            </div>
            {sortedTracks.slice(0,10).map((track,i)=>{
              const total=track.flames+track.likes;
              const max=(sortedTracks[0]?.flames||0)+(sortedTracks[0]?.likes||0)||1;
              const pct=Math.round((total/max)*100);
              const tc=COLOR_MAP[track.color]||COLOR_MAP.coral;
              return (
                <div key={track.id} onClick={()=>{setSelectedTrack(track);setView("detail");}} style={{ marginBottom:10, cursor:"pointer", background:"rgba(12,5,2,0.55)", borderRadius:11, padding:"11px", border:"1px solid rgba(255,160,80,0.07)", backdropFilter:"blur(6px)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
                    <div style={{ width:26, textAlign:"center", fontSize:14 }}>{i<3?["🥇","🥈","🥉"][i]:`${i+1}.`}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#f0ede8" }}>{track.title}</div>
                      <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif" }}>{track.artist}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:11, fontFamily:"sans-serif", color:"#888" }}>🔥{track.flames} ❤️{track.likes}</span>
                      {isAdmin&&<button onClick={e=>{e.stopPropagation();if(window.confirm(`"${track.title}" verwijderen?`))adminDeleteTrack(track);}} style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.2)", borderRadius:6, padding:"3px 7px", color:"#D85A30", fontSize:11, cursor:"pointer" }}>🗑</button>}
                    </div>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:tc.accent, borderRadius:4 }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginTop:18 }}>
              {[["Nummers",tracks.length],["Vlammen",tracks.reduce((s,t)=>s+t.flames,0)],["Likes",tracks.reduce((s,t)=>s+t.likes,0)],["Artiesten",new Set(tracks.map(t=>t.artist)).size]].map(([l,v])=>(
                <div key={l} style={{ background:"rgba(12,5,2,0.6)", border:"1px solid rgba(255,160,80,0.07)", borderRadius:11, padding:"11px 13px" }}>
                  <div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UPLOAD */}
        {view==="upload"&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:19, fontWeight:700, color:"#f0ede8", marginBottom:2 }}>⬆ Upload je nummer</div>
              <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>Max. 2 nummers · Max. 3 MB · Direct in de playlist</div>
              {user&&<div style={{ marginTop:8, background:"rgba(29,158,117,0.1)", border:"1px solid rgba(29,158,117,0.3)", borderRadius:9, padding:"7px 12px", fontSize:12, fontFamily:"sans-serif", color:"#5DCAA5" }}>Jouw uploads: {uploadCount}/{MAX_UPLOADS}</div>}
              {!user&&<div style={{ marginTop:8, background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:9, padding:"10px 12px" }}>
                <div style={{ fontSize:13, color:"#D85A30", fontFamily:"sans-serif", marginBottom:6 }}>Je moet ingelogd zijn om te uploaden</div>
                <button onClick={()=>setShowAuth(true)} style={{ background:"#D85A30", border:"none", borderRadius:8, padding:"8px 16px", color:"#fff", fontFamily:"sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>Inloggen / Aanmelden</button>
              </div>}
            </div>
            {user&&uploadCount>=MAX_UPLOADS&&<div style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:12, padding:"20px", textAlign:"center", fontFamily:"sans-serif" }}><div style={{ fontSize:28, marginBottom:8 }}>🎵</div><div style={{ fontSize:14, color:"#D85A30", fontWeight:600 }}>Maximum bereikt</div></div>}
            {user&&uploadCount<MAX_UPLOADS&&(
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:16 }}>
                  {[1,2,3].map(s=><div key={s} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:24, height:24, borderRadius:"50%", background:uploadStep>=s?"#D85A30":"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontFamily:"sans-serif", fontWeight:700, color:uploadStep>=s?"#fff":"#444" }}>{s}</div>{s<3&&<div style={{ width:18, height:2, background:uploadStep>s?"#D85A30":"rgba(255,255,255,0.06)" }}/>}</div>)}
                  <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginLeft:5 }}>{uploadStep===1?"Basisinfo":uploadStep===2?"Bio & stijl":"Audio"}</div>
                </div>
                {uploadStep===1&&(
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    {[["Naam van het nummer","title","bijv. Nachtrit door de Stad"],["Artiestennaam","artist","Jouw naam of bandnaam"]].map(([label,key,ph])=>(
                      <div key={key}><div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif", marginBottom:4 }}>{label} *</div><input value={uploadData[key]} onChange={e=>setUploadData(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inp}/></div>
                    ))}
                    <div><div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif", marginBottom:4 }}>Genre *</div>
                    <select value={uploadData.genre} onChange={e=>setUploadData(p=>({...p,genre:e.target.value}))} style={{ ...inp, color:uploadData.genre?"#f0ede8":"#555" }}><option value="">Kies genre...</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                    <button onClick={()=>{if(!uploadData.title||!uploadData.artist||!uploadData.genre){setUploadError("Vul alle velden in.");return;}setUploadError("");setUploadStep(2);}} style={{ background:"#D85A30", border:"none", borderRadius:11, padding:"12px", color:"#fff", fontFamily:"sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>Volgende →</button>
                  </div>
                )}
                {uploadStep===2&&(
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    <div><div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif", marginBottom:4 }}>Verhaal achter je track * <span style={{ color:"#444" }}>(min. 20 tekens)</span></div>
                    <textarea value={uploadData.bio} onChange={e=>setUploadData(p=>({...p,bio:e.target.value}))} placeholder="Vertel het verhaal achter dit nummer..." rows={5} style={{ ...inp, resize:"vertical" }}/>
                    <div style={{ fontSize:10, color:uploadData.bio.length<20?"#D85A30":"#1D9E75", fontFamily:"sans-serif", textAlign:"right", marginTop:3 }}>{uploadData.bio.length} tekens</div></div>
                    <div><div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif", marginBottom:7 }}>Kleur voor je kaart</div>
                    <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>{COLORS.map(col=><button key={col} onClick={()=>setUploadData(p=>({...p,color:col}))} style={{ width:32, height:32, borderRadius:"50%", background:COLOR_MAP[col].accent, border:uploadData.color===col?"3px solid #fff":"3px solid transparent", cursor:"pointer", outline:"none" }}/>)}</div></div>
                    <div style={{ display:"flex", gap:7 }}>
                      <button onClick={()=>setUploadStep(1)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"none", borderRadius:11, padding:"12px", color:"#666", fontFamily:"sans-serif", fontSize:14, cursor:"pointer" }}>← Terug</button>
                      <button onClick={()=>{if(uploadData.bio.length<20){setUploadError("Bio te kort.");return;}setUploadError("");setUploadStep(3);}} style={{ flex:2, background:"#D85A30", border:"none", borderRadius:11, padding:"12px", color:"#fff", fontFamily:"sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>Volgende →</button>
                    </div>
                  </div>
                )}
                {uploadStep===3&&(
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    <div onClick={()=>fileRef.current?.click()} style={{ border:`2px dashed ${uploadFile?"#1D9E75":"rgba(255,255,255,0.1)"}`, borderRadius:13, padding:"28px 18px", textAlign:"center", cursor:"pointer", background:uploadFile?"rgba(29,158,117,0.05)":"transparent" }}>
                      <div style={{ fontSize:30, marginBottom:7 }}>{uploadFile?"✅":"🎵"}</div>
                      <div style={{ fontSize:13, color:uploadFile?"#1D9E75":"#666", fontFamily:"sans-serif", fontWeight:600 }}>{uploadFile?uploadFile.name:"Tik om audiobestand te kiezen"}</div>
                      {uploadFile&&<div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginTop:3 }}>{(uploadFile.size/1024/1024).toFixed(2)} MB</div>}
                      <div style={{ fontSize:10, color:"#444", fontFamily:"sans-serif", marginTop:5 }}>Alleen MP3 · Max. 3 MB</div>
                      <input ref={fileRef} type="file" accept=".mp3,audio/mpeg" onChange={handleFileSelect} style={{ display:"none" }}/>
                    </div>
                    <div style={{ display:"flex", gap:7 }}>
                      <button onClick={()=>setUploadStep(2)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"none", borderRadius:11, padding:"12px", color:"#666", fontFamily:"sans-serif", fontSize:14, cursor:"pointer" }}>← Terug</button>
                      <button onClick={submitUpload} disabled={!uploadFile||uploading} style={{ flex:2, background:uploadFile&&!uploading?"#1D9E75":"#1a1a1a", border:"none", borderRadius:11, padding:"12px", color:uploadFile&&!uploading?"#fff":"#444", fontFamily:"sans-serif", fontSize:14, fontWeight:700, cursor:uploadFile&&!uploading?"pointer":"default" }}>
                        {uploading?"Uploaden...":"📡 Zet op BIGTUNES"}
                      </button>
                    </div>
                  </div>
                )}
                {uploadError&&<div style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:9, padding:"8px 13px", fontSize:12, color:"#D85A30", fontFamily:"sans-serif", marginTop:8 }}>⚠️ {uploadError}</div>}
              </div>
            )}
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
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <button onClick={()=>setView("radio")} style={{ background:"rgba(255,255,255,0.05)", border:"none", borderRadius:9, padding:"6px 13px", color:"#666", fontFamily:"sans-serif", fontSize:12, cursor:"pointer" }}>← Terug</button>
                {isAdmin&&<button onClick={()=>{if(window.confirm(`"${track.title}" verwijderen?`))adminDeleteTrack(track).then(()=>setView("radio"));}} style={{ background:"rgba(216,90,48,0.1)", border:"1px solid rgba(216,90,48,0.3)", borderRadius:9, padding:"6px 13px", color:"#D85A30", fontFamily:"sans-serif", fontSize:12, fontWeight:600, cursor:"pointer" }}>🗑 Verwijderen</button>}
              </div>
              <div style={{ background:`${tc.bg}10`, border:`1px solid ${tc.accent}30`, borderRadius:15, padding:"16px", marginBottom:12, backdropFilter:"blur(8px)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
                  <div><div style={{ fontSize:21, fontWeight:700, color:"#f0ede8", lineHeight:1.2 }}>{track.title}</div><div style={{ fontSize:13, color:"#999", fontFamily:"sans-serif", marginTop:2 }}>{track.artist}</div></div>
                  <div style={{ background:tc.accent, color:"#fff", padding:"4px 11px", borderRadius:18, fontSize:12, fontFamily:"sans-serif", fontWeight:700 }}>#{rankPos}</div>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <span style={{ background:`${tc.badge}45`, color:tc.text, padding:"2px 8px", borderRadius:9, fontSize:11, fontFamily:"sans-serif" }}>{track.genre}</span>
                  <span style={{ background:"rgba(255,255,255,0.04)", color:"#555", padding:"2px 8px", borderRadius:9, fontSize:11, fontFamily:"sans-serif" }}>{track.month}</span>
                  {nowPlaying&&<span style={{ background:`${tc.accent}20`, color:tc.accent, padding:"2px 8px", borderRadius:9, fontSize:11, fontFamily:"sans-serif" }}>▶ Speelt nu</span>}
                  {user&&track.user_id===user.id&&<span style={{ background:"rgba(29,158,117,0.12)", color:"#1D9E75", padding:"2px 8px", borderRadius:9, fontSize:11, fontFamily:"sans-serif" }}>Jouw nummer</span>}
                </div>
              </div>
              <div style={{ background:"rgba(12,5,2,0.65)", border:"1px solid rgba(255,160,80,0.07)", borderRadius:13, padding:"13px", marginBottom:11, backdropFilter:"blur(8px)" }}>
                <button onClick={()=>jumpToTrack(track)} style={{ width:"100%", background:nowPlaying&&isPlaying?`${tc.accent}18`:tc.accent, border:nowPlaying&&isPlaying?`1px solid ${tc.accent}`:"none", borderRadius:11, padding:"12px", color:"#fff", fontFamily:"sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  {nowPlaying&&isPlaying?"⏸ Pauze":"▶ Afspelen via BIGTUNES playlist"}
                </button>
              </div>
              <div style={{ background:"rgba(12,5,2,0.65)", border:"1px solid rgba(255,160,80,0.07)", borderRadius:13, padding:"13px", marginBottom:11, backdropFilter:"blur(8px)" }}>
                <div style={{ fontSize:9, color:"#444", fontFamily:"sans-serif", marginBottom:7, letterSpacing:1, textTransform:"uppercase" }}>Over dit nummer</div>
                <div style={{ fontSize:14, color:"#ccc", lineHeight:1.75 }}>{track.bio}</div>
              </div>
              <div style={{ background:"rgba(12,5,2,0.65)", border:"1px solid rgba(255,160,80,0.07)", borderRadius:13, padding:"13px", backdropFilter:"blur(8px)" }}>
                <div style={{ fontSize:9, color:"#444", fontFamily:"sans-serif", marginBottom:11, letterSpacing:1, textTransform:"uppercase" }}>Geef je stem</div>
                {!user&&<div style={{ textAlign:"center", marginBottom:10 }}><button onClick={()=>setShowAuth(true)} style={{ color:"#D85A30", background:"transparent", border:"none", cursor:"pointer", fontFamily:"sans-serif", fontSize:12 }}>Log in om te stemmen →</button></div>}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
                  <button onClick={()=>vote(track.id,"flame")} style={{ padding:"13px", background:hasFlame?"rgba(216,90,48,0.13)":"rgba(255,255,255,0.02)", border:`2px solid ${hasFlame?"#D85A30":"rgba(255,255,255,0.06)"}`, borderRadius:11, cursor:"pointer" }}>
                    <div style={{ fontSize:24 }}>🔥</div><div style={{ fontSize:19, fontWeight:700, color:"#D85A30", fontFamily:"sans-serif" }}>{track.flames}</div><div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>Vlammen</div>
                  </button>
                  <button onClick={()=>vote(track.id,"like")} style={{ padding:"13px", background:hasLike?"rgba(127,119,221,0.13)":"rgba(255,255,255,0.02)", border:`2px solid ${hasLike?"#7F77DD":"rgba(255,255,255,0.06)"}`, borderRadius:11, cursor:"pointer" }}>
                    <div style={{ fontSize:24 }}>❤️</div><div style={{ fontSize:19, fontWeight:700, color:"#AFA9EC", fontFamily:"sans-serif" }}>{track.likes}</div><div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>Likes</div>
                  </button>
                </div>
                <div style={{ marginTop:9, fontSize:10, color:"#333", fontFamily:"sans-serif", textAlign:"center" }}>Hoe meer vlammen, hoe hoger in de ranglijst!</div>
              </div>
            </div>
          );
        })()}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
    </div>
  );
}
