import { useState, useRef, useEffect } from "react";

// ── Storage (localStorage) ────────────────────────
const STORAGE_KEY = "book-journal-v1";
const API_KEY_STORAGE = "book-journal-apikey";

const loadBooks = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
};
const saveBooks = (books) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
};
const loadApiKey = () => localStorage.getItem(API_KEY_STORAGE) || "";
const saveApiKey = (key) => localStorage.setItem(API_KEY_STORAGE, key);

// ── Icons ─────────────────────────────────────────
const BookIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const ImageIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3" />
  </svg>
);

const formatDate = (iso) => new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ── AI 표지 인식 ──────────────────────────────────
async function recognizeBookCover(base64Image, apiKey) {
  const base64Data = base64Image.split(",")[1];
  const mediaType = base64Image.match(/data:(image\/\w+);/)?.[1] || "image/jpeg";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: `이 책 표지 이미지에서 책 제목과 저자 이름을 추출해주세요. 반드시 아래 JSON 형식으로만 답하세요. 다른 말은 하지 마세요.\n{"title": "책 제목", "author": "저자 이름"}\n제목이나 저자를 알 수 없으면 빈 문자열("")로 두세요.` }
        ]
      }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.map(c => c.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return { title: parsed.title || "", author: parsed.author || "" };
}

// ── API Key Setup Screen ──────────────────────────
function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#0e0b07", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ color: "#c8a96e", marginBottom: "16px", display: "flex", justifyContent: "center", opacity: 0.8 }}><KeyIcon /></div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "#f0e6cc", margin: "0 0 10px" }}>나의 독서 일지</h1>
          <p style={{ color: "#6a5a40", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
            표지 자동 인식 기능을 사용하려면<br />Anthropic API 키가 필요해요
          </p>
        </div>

        <div style={{ background: "#1a1610", border: "1px solid #2a2010", borderRadius: "16px", padding: "28px" }}>
          <p style={{ color: "#8a7a60", fontSize: "13px", margin: "0 0 20px", lineHeight: 1.7 }}>
            🔑 <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#c8a96e" }}>console.anthropic.com</a> 에서 무료로 발급받으세요.<br />
            키는 이 기기에만 저장되며 외부로 전송되지 않아요.
          </p>

          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              value={key}
              onChange={e => setKey(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="sk-ant-api03-..."
              style={{ width: "100%", background: "#120f09", border: "1px solid #3a2e1e", borderRadius: "8px", padding: "12px 44px 12px 16px", color: "#f0e6cc", fontSize: "14px", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#c8a96e"}
              onBlur={e => e.target.style.borderColor = "#3a2e1e"}
              onKeyDown={e => e.key === "Enter" && key.trim() && onSave(key.trim())}
            />
            <button onClick={() => setShow(s => !s)}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6a5a40", cursor: "pointer", fontSize: "12px" }}>
              {show ? "숨기기" : "보기"}
            </button>
          </div>

          <button onClick={() => key.trim() && onSave(key.trim())} disabled={!key.trim()}
            style={{ width: "100%", padding: "13px", background: key.trim() ? "#c8a96e" : "#2a2010", color: key.trim() ? "#120f09" : "#5a4a30", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: key.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s" }}>
            시작하기
          </button>

          <button onClick={() => onSave("")}
            style={{ width: "100%", padding: "10px", marginTop: "10px", background: "none", border: "none", color: "#4a3a20", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            API 키 없이 시작 (표지 인식 기능 비활성)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LightBox ──────────────────────────────────────
function LightBox({ photo, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", backdropFilter: "blur(8px)" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.1)", border: "none", color: "#f0e6cc", borderRadius: "8px", padding: "8px", cursor: "pointer" }}>
        <CloseIcon />
      </button>
      <img src={photo.image} alt={photo.caption} onClick={e => e.stopPropagation()}
        style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }} />
      {photo.caption && <p style={{ color: "#c8b88a", marginTop: "16px", fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: "16px", textAlign: "center", maxWidth: "500px" }}>{photo.caption}</p>}
      <p style={{ color: "#4a3a20", fontSize: "12px", marginTop: "8px" }}>{formatDate(photo.createdAt)}</p>
    </div>
  );
}

// ── AddBookModal ──────────────────────────────────
function AddBookModal({ onClose, onAdd, apiKey }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [summary, setSummary] = useState("");
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverData, setCoverData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const fileRef = useRef();

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setCoverPreview(dataUrl);
      setCoverData(dataUrl);
      setScanResult(null);

      if (!apiKey) { setScanResult("nokey"); return; }

      setScanning(true);
      try {
        const result = await recognizeBookCover(dataUrl, apiKey);
        if (result.title) setTitle(result.title);
        if (result.author) setAuthor(result.author);
        setScanResult(result.title ? "success" : "fail");
      } catch {
        setScanResult("fail");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ id: generateId(), title, author, summary, cover: coverData, notes: [], photos: [], createdAt: new Date().toISOString() });
    onClose();
  };

  const inp = { background: "#120f09", border: "1px solid #3a2e1e", borderRadius: "8px", padding: "12px 16px", color: "#f0e6cc", fontSize: "15px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,6,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#1a1610", border: "1px solid #3a2e1e", borderRadius: "16px", width: "100%", maxWidth: "480px", padding: "32px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "#8a7a60", cursor: "pointer", padding: "4px" }}><CloseIcon /></button>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#f0e6cc", marginBottom: "28px", marginTop: 0 }}>새 책 추가</h2>

        <div onClick={() => !scanning && fileRef.current.click()}
          style={{ width: "100%", height: "200px", border: `2px dashed ${scanning ? "#c8a96e" : "#3a2e1e"}`, borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: scanning ? "wait" : "pointer", marginBottom: "8px", overflow: "hidden", background: coverPreview ? "transparent" : "#120f09", transition: "border-color 0.3s", position: "relative" }}
          onMouseEnter={e => { if (!scanning) e.currentTarget.style.borderColor = "#c8a96e"; }}
          onMouseLeave={e => { if (!scanning) e.currentTarget.style.borderColor = "#3a2e1e"; }}>
          {coverPreview
            ? <>
                <img src={coverPreview} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover", filter: scanning ? "brightness(0.4)" : "none", transition: "filter 0.3s" }} />
                {scanning && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", border: "3px solid rgba(200,169,110,0.3)", borderTop: "3px solid #c8a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ color: "#c8a96e", fontSize: "13px", fontWeight: "600" }}>표지 분석 중...</span>
                  </div>
                )}
              </>
            : <>
                <span style={{ fontSize: "36px", marginBottom: "10px" }}>📷</span>
                <span style={{ color: "#8a7a60", fontSize: "14px", fontWeight: "600" }}>책 표지 사진 업로드</span>
                <span style={{ color: "#4a3a20", fontSize: "12px", marginTop: "4px" }}>
                  {apiKey ? "제목·저자를 자동으로 인식해요" : "표지 이미지를 선택하세요"}
                </span>
              </>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleImage} />

        {scanResult === "success" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", padding: "8px 12px", background: "rgba(100,200,100,0.08)", border: "1px solid rgba(100,200,100,0.2)", borderRadius: "8px" }}>
            <span>✅</span><span style={{ color: "#80c880", fontSize: "12px" }}>인식 완료! 틀린 부분은 직접 수정해주세요.</span>
          </div>
        )}
        {scanResult === "fail" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", padding: "8px 12px", background: "rgba(200,100,100,0.08)", border: "1px solid rgba(200,100,100,0.2)", borderRadius: "8px" }}>
            <span>⚠️</span><span style={{ color: "#c88080", fontSize: "12px" }}>인식하지 못했어요. 직접 입력해주세요.</span>
          </div>
        )}
        {scanResult === "nokey" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", padding: "8px 12px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px" }}>
            <span>🔑</span><span style={{ color: "#c8a96e", fontSize: "12px" }}>API 키가 없어서 자동 인식을 건너뜁니다. 직접 입력해주세요.</span>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="책 제목 *" style={inp}
            onFocus={e => e.target.style.borderColor = "#c8a96e"} onBlur={e => e.target.style.borderColor = "#3a2e1e"} />
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="저자" style={inp}
            onFocus={e => e.target.style.borderColor = "#c8a96e"} onBlur={e => e.target.style.borderColor = "#3a2e1e"} />
          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="책을 짧게 요약해보세요..." rows={4}
            style={{ ...inp, resize: "vertical", lineHeight: "1.6" }}
            onFocus={e => e.target.style.borderColor = "#c8a96e"} onBlur={e => e.target.style.borderColor = "#3a2e1e"} />
        </div>

        <button onClick={handleSubmit} disabled={!title.trim() || scanning}
          style={{ marginTop: "24px", width: "100%", padding: "14px", background: (title.trim() && !scanning) ? "#c8a96e" : "#3a2e1e", color: (title.trim() && !scanning) ? "#120f09" : "#6a5a40", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: (title.trim() && !scanning) ? "pointer" : "not-allowed", transition: "all 0.2s", fontFamily: "inherit" }}>
          {scanning ? "분석 중..." : "추가하기"}
        </button>
      </div>
    </div>
  );
}

// ── BookDetail ────────────────────────────────────
function BookDetail({ book, onBack, onUpdate, onDelete }) {
  const [note, setNote] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(book.summary);
  const [editingNote, setEditingNote] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingCaption, setEditingCaption] = useState(null);
  const photoFileRef = useRef();
  const [activeTab, setActiveTab] = useState("notes");

  const photos = book.photos || [];

  const addNote = () => {
    if (!note.trim()) return;
    onUpdate({ ...book, notes: [...book.notes, { id: generateId(), text: note, createdAt: new Date().toISOString() }] });
    setNote("");
  };
  const deleteNote = (id) => onUpdate({ ...book, notes: book.notes.filter(n => n.id !== id) });
  const saveSummary = () => { onUpdate({ ...book, summary: summaryDraft }); setEditingSummary(false); };
  const saveEditNote = () => {
    if (!editingNote) return;
    onUpdate({ ...book, notes: book.notes.map(n => n.id === editingNote.id ? { ...n, text: editingNote.text } : n) });
    setEditingNote(null);
  };
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    let current = { ...book, photos: [...(book.photos || [])] };
    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        current = { ...current, photos: [...current.photos, { id: generateId(), image: ev.target.result, caption: "", createdAt: new Date().toISOString() }] };
        loaded++;
        if (loaded === files.length) onUpdate(current);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };
  const deletePhoto = (id) => onUpdate({ ...book, photos: photos.filter(p => p.id !== id) });
  const saveCaption = (id) => {
    onUpdate({ ...book, photos: photos.map(p => p.id === id ? { ...p, caption: captionDraft } : p) });
    setEditingCaption(null);
  };

  const tabStyle = (active) => ({
    flex: 1, padding: "10px", background: "none", border: "none",
    borderBottom: active ? "2px solid #c8a96e" : "2px solid transparent",
    color: active ? "#c8a96e" : "#6a5a40", cursor: "pointer", fontSize: "13px",
    fontWeight: active ? "700" : "400", letterSpacing: "0.06em", textTransform: "uppercase",
    fontFamily: "inherit", transition: "all 0.2s"
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0e0b07", color: "#f0e6cc" }}>
      {lightboxPhoto && <LightBox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}
      <div style={{ position: "relative", height: "320px", overflow: "hidden" }}>
        {book.cover
          ? <><img src={book.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.35)" }} /><div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, #0e0b07 100%)" }} /></>
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a1008, #2a1e0e)" }} />
        }
        <button onClick={onBack} style={{ position: "absolute", top: "20px", left: "20px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: "8px", color: "#c8a96e", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", backdropFilter: "blur(8px)" }}>
          <ArrowLeft /> 목록
        </button>
        <button onClick={() => onDelete(book.id)} style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(180,60,60,0.25)", border: "1px solid rgba(180,60,60,0.4)", borderRadius: "8px", color: "#e07070", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", backdropFilter: "blur(8px)" }}>
          <TrashIcon /> 삭제
        </button>
        {book.cover && (
          <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)" }}>
            <img src={book.cover} alt="cover" style={{ height: "120px", width: "80px", objectFit: "cover", borderRadius: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", border: "1px solid rgba(200,169,110,0.2)" }} />
          </div>
        )}
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px", marginTop: book.cover ? "70px" : "24px" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", color: "#f0e6cc", margin: "0 0 8px", lineHeight: 1.3 }}>{book.title}</h1>
          {book.author && <p style={{ color: "#8a7a60", fontSize: "14px", margin: 0, fontStyle: "italic" }}>{book.author}</p>}
          <p style={{ color: "#5a4a30", fontSize: "12px", marginTop: "8px" }}>{formatDate(book.createdAt)}</p>
        </div>

        <section style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "#c8a96e", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>요약</h2>
            {!editingSummary && (
              <button onClick={() => { setEditingSummary(true); setSummaryDraft(book.summary); }}
                style={{ background: "none", border: "none", color: "#6a5a40", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "4px 8px", borderRadius: "4px" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c8a96e"} onMouseLeave={e => e.currentTarget.style.color = "#6a5a40"}>
                <EditIcon /> 수정
              </button>
            )}
          </div>
          {editingSummary
            ? <>
                <textarea value={summaryDraft} onChange={e => setSummaryDraft(e.target.value)} rows={5}
                  style={{ width: "100%", background: "#120f09", border: "1px solid #c8a96e", borderRadius: "8px", padding: "14px", color: "#f0e6cc", fontSize: "14px", lineHeight: "1.7", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button onClick={saveSummary} style={{ flex: 1, padding: "10px", background: "#c8a96e", color: "#120f09", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>저장</button>
                  <button onClick={() => setEditingSummary(false)} style={{ flex: 1, padding: "10px", background: "#1a1610", color: "#8a7a60", border: "1px solid #3a2e1e", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }}>취소</button>
                </div>
              </>
            : <p style={{ color: book.summary ? "#c8b88a" : "#4a3a20", lineHeight: "1.8", fontSize: "14px", fontStyle: book.summary ? "normal" : "italic", margin: 0, background: "#120f09", padding: "16px", borderRadius: "8px", border: "1px solid #1e1a10" }}>
                {book.summary || "아직 요약이 없어요."}
              </p>
          }
        </section>

        <div style={{ display: "flex", borderBottom: "1px solid #1e1a10", marginBottom: "24px" }}>
          <button style={tabStyle(activeTab === "notes")} onClick={() => setActiveTab("notes")}>생각 &amp; 메모 {book.notes.length > 0 && `(${book.notes.length})`}</button>
          <button style={tabStyle(activeTab === "photos")} onClick={() => setActiveTab("photos")}>📸 페이지 사진 {photos.length > 0 && `(${photos.length})`}</button>
        </div>

        {activeTab === "notes" && (
          <section>
            <div style={{ marginBottom: "24px" }}>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="이 책에 대한 생각이나 기억을 남겨보세요..." rows={3}
                style={{ width: "100%", background: "#120f09", border: "1px solid #3a2e1e", borderRadius: "8px", padding: "14px", color: "#f0e6cc", fontSize: "14px", lineHeight: "1.7", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "#c8a96e"} onBlur={e => e.target.style.borderColor = "#3a2e1e"} />
              <button onClick={addNote} disabled={!note.trim()}
                style={{ marginTop: "8px", padding: "10px 20px", background: note.trim() ? "#c8a96e" : "#1a1610", color: note.trim() ? "#120f09" : "#4a3a20", border: "none", borderRadius: "6px", fontWeight: "700", cursor: note.trim() ? "pointer" : "not-allowed", fontSize: "13px", transition: "all 0.2s", fontFamily: "inherit" }}>
                메모 추가
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {book.notes.length === 0 && <p style={{ color: "#4a3a20", fontStyle: "italic", fontSize: "14px", textAlign: "center", padding: "24px 0" }}>아직 메모가 없어요.</p>}
              {[...book.notes].reverse().map(n => (
                <div key={n.id} style={{ background: "#120f09", border: "1px solid #1e1a10", borderRadius: "10px", padding: "16px" }}>
                  {editingNote?.id === n.id
                    ? <>
                        <textarea value={editingNote.text} onChange={e => setEditingNote({ ...editingNote, text: e.target.value })} rows={3}
                          style={{ width: "100%", background: "#0e0b07", border: "1px solid #c8a96e", borderRadius: "6px", padding: "10px", color: "#f0e6cc", fontSize: "14px", lineHeight: "1.7", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                          <button onClick={saveEditNote} style={{ flex: 1, padding: "8px", background: "#c8a96e", color: "#120f09", border: "none", borderRadius: "5px", fontWeight: "700", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>저장</button>
                          <button onClick={() => setEditingNote(null)} style={{ flex: 1, padding: "8px", background: "#1a1610", color: "#8a7a60", border: "1px solid #3a2e1e", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>취소</button>
                        </div>
                      </>
                    : <>
                        <p style={{ margin: "0 0 10px", color: "#c8b88a", fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{n.text}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ color: "#4a3a20", fontSize: "11px" }}>{formatDate(n.createdAt)}</span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => setEditingNote({ id: n.id, text: n.text })} style={{ background: "none", border: "none", color: "#5a4a30", cursor: "pointer", padding: "2px", display: "flex" }}
                              onMouseEnter={e => e.currentTarget.style.color = "#c8a96e"} onMouseLeave={e => e.currentTarget.style.color = "#5a4a30"}><EditIcon /></button>
                            <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", color: "#5a4a30", cursor: "pointer", padding: "2px", display: "flex" }}
                              onMouseEnter={e => e.currentTarget.style.color = "#e07070"} onMouseLeave={e => e.currentTarget.style.color = "#5a4a30"}><TrashIcon /></button>
                          </div>
                        </div>
                      </>
                  }
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "photos" && (
          <section>
            <div style={{ marginBottom: "24px" }}>
              <button onClick={() => photoFileRef.current.click()}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 20px", background: "#1a1610", border: "2px dashed #3a2e1e", borderRadius: "10px", color: "#8a7a60", cursor: "pointer", fontSize: "14px", width: "100%", justifyContent: "center", transition: "all 0.2s", fontFamily: "inherit" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8a96e"; e.currentTarget.style.color = "#c8a96e"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#3a2e1e"; e.currentTarget.style.color = "#8a7a60"; }}>
                <CameraIcon /> 중요한 페이지 사진 추가
              </button>
              <input ref={photoFileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handlePhotoUpload} />
              <p style={{ color: "#4a3a20", fontSize: "11px", textAlign: "center", marginTop: "8px" }}>여러 장 한 번에 선택 가능 · 탭하면 크게 보기</p>
            </div>
            {photos.length === 0
              ? <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ color: "#2a2010", marginBottom: "12px", display: "flex", justifyContent: "center" }}><ImageIcon /></div>
                  <p style={{ color: "#4a3a20", fontStyle: "italic", fontSize: "14px", lineHeight: 1.8 }}>아직 사진이 없어요.<br />인상 깊은 페이지를 찍어서 저장해보세요.</p>
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {[...photos].reverse().map(photo => (
                    <div key={photo.id} style={{ background: "#120f09", border: "1px solid #1e1a10", borderRadius: "12px", overflow: "hidden" }}>
                      <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setLightboxPhoto(photo)}>
                        <img src={photo.image} alt={photo.caption || "페이지 사진"} style={{ width: "100%", maxHeight: "420px", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.55)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", color: "#c8b88a", backdropFilter: "blur(4px)" }}>크게 보기 🔍</div>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        {editingCaption === photo.id
                          ? <>
                              <input value={captionDraft} onChange={e => setCaptionDraft(e.target.value)} placeholder="이 페이지에 대한 메모..."
                                style={{ width: "100%", background: "#0e0b07", border: "1px solid #c8a96e", borderRadius: "6px", padding: "8px 12px", color: "#f0e6cc", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                autoFocus onKeyDown={e => { if (e.key === "Enter") saveCaption(photo.id); if (e.key === "Escape") setEditingCaption(null); }} />
                              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                                <button onClick={() => saveCaption(photo.id)} style={{ flex: 1, padding: "7px", background: "#c8a96e", color: "#120f09", border: "none", borderRadius: "5px", fontWeight: "700", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>저장</button>
                                <button onClick={() => setEditingCaption(null)} style={{ flex: 1, padding: "7px", background: "#1a1610", color: "#8a7a60", border: "1px solid #3a2e1e", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>취소</button>
                              </div>
                            </>
                          : <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                              <div style={{ flex: 1 }}>
                                {photo.caption
                                  ? <p style={{ color: "#c8b88a", fontSize: "13px", margin: "0 0 4px", fontStyle: "italic", lineHeight: 1.5 }}>{photo.caption}</p>
                                  : <p style={{ color: "#3a2a10", fontSize: "12px", margin: "0 0 4px", fontStyle: "italic" }}>메모를 추가해보세요</p>
                                }
                                <span style={{ color: "#4a3a20", fontSize: "11px" }}>{formatDate(photo.createdAt)}</span>
                              </div>
                              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                <button onClick={() => { setEditingCaption(photo.id); setCaptionDraft(photo.caption || ""); }}
                                  style={{ background: "none", border: "none", color: "#5a4a30", cursor: "pointer", padding: "2px", display: "flex" }}
                                  onMouseEnter={e => e.currentTarget.style.color = "#c8a96e"} onMouseLeave={e => e.currentTarget.style.color = "#5a4a30"}><EditIcon /></button>
                                <button onClick={() => deletePhoto(photo.id)}
                                  style={{ background: "none", border: "none", color: "#5a4a30", cursor: "pointer", padding: "2px", display: "flex" }}
                                  onMouseEnter={e => e.currentTarget.style.color = "#e07070"} onMouseLeave={e => e.currentTarget.style.color = "#5a4a30"}><TrashIcon /></button>
                              </div>
                            </div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
            }
          </section>
        )}
      </div>
    </div>
  );
}

// ── BookCard ──────────────────────────────────────
function BookCard({ book, onClick }) {
  const photos = book.photos || [];
  return (
    <div onClick={onClick}
      style={{ background: "#1a1610", border: "1px solid #2a2010", borderRadius: "12px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8a96e"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2010"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ height: "200px", background: "#120f09", overflow: "hidden", position: "relative" }}>
        {book.cover
          ? <img src={book.cover} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a2e1e" }}><BookIcon /></div>
        }
        <div style={{ position: "absolute", bottom: "8px", right: "8px", display: "flex", gap: "4px" }}>
          {book.notes.length > 0 && <span style={{ background: "rgba(10,8,6,0.7)", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", color: "#8a7a60", backdropFilter: "blur(4px)" }}>{book.notes.length}메모</span>}
          {photos.length > 0 && <span style={{ background: "rgba(10,8,6,0.7)", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", color: "#8a7a60", backdropFilter: "blur(4px)" }}>📸 {photos.length}</span>}
        </div>
      </div>
      <div style={{ padding: "16px", flex: 1 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", color: "#f0e6cc", margin: "0 0 4px", lineHeight: 1.3 }}>{book.title}</h3>
        {book.author && <p style={{ color: "#8a7a60", fontSize: "12px", margin: "0 0 10px", fontStyle: "italic" }}>{book.author}</p>}
        {book.summary && <p style={{ color: "#6a5a40", fontSize: "12px", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{book.summary}</p>}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────
export default function App() {
  const [books, setBooks] = useState([]);
  const [apiKey, setApiKey] = useState(null); // null = 아직 확인 안 함
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setBooks(loadBooks());
    setApiKey(loadApiKey()); // "" 이면 키 없이 사용, 문자열이면 키 있음
  }, []);

  const handleSaveApiKey = (key) => {
    saveApiKey(key);
    setApiKey(key);
  };

  const persist = (updated) => { setBooks(updated); saveBooks(updated); };
  const addBook = (book) => persist([...books, book]);
  const updateBook = (updated) => { persist(books.map(b => b.id === updated.id ? updated : b)); setSelected(updated); };
  const deleteBook = (id) => { persist(books.filter(b => b.id !== id)); setSelected(null); };

  // 최초 실행 시 API 키 설정 화면
  if (apiKey === null) return null; // 로딩 중
  if (apiKey === null || (loadApiKey() === "" && apiKey === null)) return <ApiKeySetup onSave={handleSaveApiKey} />;

  // API 키를 한 번도 설정 안 한 경우 (앱 첫 실행)
  if (!localStorage.getItem(API_KEY_STORAGE)) return <ApiKeySetup onSave={handleSaveApiKey} />;

  if (selected) {
    const fresh = books.find(b => b.id === selected.id);
    return <BookDetail book={fresh || selected} onBack={() => setSelected(null)} onUpdate={updateBook} onDelete={deleteBook} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0b07", color: "#f0e6cc" }}>
      <div style={{ padding: "40px 24px 32px", textAlign: "center", borderBottom: "1px solid #1e1a10" }}>
        <div style={{ color: "#c8a96e", marginBottom: "12px", opacity: 0.6 }}><BookIcon /></div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", color: "#f0e6cc", margin: "0 0 6px", letterSpacing: "-0.02em" }}>나의 독서 일지</h1>
        <p style={{ color: "#6a5a40", fontSize: "13px", margin: 0, fontFamily: "'Crimson Pro', serif", fontStyle: "italic" }}>읽은 책들을 기록하고 생각을 남겨보세요</p>
        {apiKey && <p style={{ color: "#3a3020", fontSize: "11px", marginTop: "6px" }}>🔑 AI 표지 인식 활성화됨 · <button onClick={() => { saveApiKey(""); setApiKey(""); }} style={{ background: "none", border: "none", color: "#3a3020", cursor: "pointer", fontSize: "11px", textDecoration: "underline", padding: 0 }}>키 변경</button></p>}
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 24px" }}>
        {books.length === 0
          ? <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>📚</div>
              <p style={{ color: "#4a3a20", fontFamily: "'Crimson Pro', serif", fontSize: "18px", fontStyle: "italic", marginBottom: "28px" }}>아직 기록된 책이 없어요</p>
              <button onClick={() => setShowAdd(true)} style={{ padding: "14px 28px", background: "#c8a96e", color: "#120f09", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "15px", cursor: "pointer", fontFamily: "inherit" }}>
                첫 번째 책 추가하기
              </button>
            </div>
          : <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <span style={{ color: "#6a5a40", fontSize: "13px" }}>총 {books.length}권</span>
                <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "#c8a96e", color: "#120f09", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  <PlusIcon /> 책 추가
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                {books.map(book => <BookCard key={book.id} book={book} onClick={() => setSelected(book)} />)}
              </div>
            </>
        }
      </div>
      {showAdd && <AddBookModal onClose={() => setShowAdd(false)} onAdd={addBook} apiKey={apiKey} />}
    </div>
  );
}
