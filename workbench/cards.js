/* Black Aquatics · card designs for records without a checked picture.
   One renderer per category and style. Rule from v3: no guessed pictures. Patterns here are
   drawn from the record's own data (title, dates, tags) and never stand in for a photograph. */
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clip = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).trim() + "…" : t; };
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const firstSentence = t => { t = String(t || "").trim(); const m = t.match(/^(.{40,220}?[.!?])\s/); return m ? m[1] : clip(t, 200); };
  const yearsOf = r => [r.y0, r.y1].map(y => (typeof y === "number" && isFinite(y)) ? y : null);
  const span = r => { const [a, b] = yearsOf(r); if (a && b && a !== b) return `${a}–${b}`; return a || b ? String(a || b) : ""; };
  // muted, archival palette; a record always gets the same one
  const TONES = [["#ece4d3", "#5b4a2f"], ["#dfe7e2", "#2f5a4d"], ["#e9dcd8", "#6b3a31"], ["#dfe3ea", "#33476a"], ["#e6e0ea", "#4f3d68"], ["#e8e6da", "#4d5130"], ["#22302c", "#e9dfc6"], ["#2b2326", "#ead2c4"]];
  const tone = r => TONES[hash(r.id || r.title) % TONES.length];
  const initials = t => String(t || "").replace(/\(.*?\)/g, "").split(/[\s-]+/).filter(w => /^[A-Za-zÀ-ÿ]/.test(w) && !/^(of|the|and|de|da|du|la|le|von|van)$/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const INTERNAL = /^(black[- ]aquatics|definition|claim[- ]audit|thumbnail[- ]acquired|place|person|work|event|concept|practice|nature|excerpt|image)$/i;
  const STOP = /^(about|their|there|which|where|while|these|those|other|through|rather|being|within|across|between|associated|account|accounts|describes|named|names|changing|uniform|public|periodic|changes)$/i;
  const tagsOf = r => { const head = String(r.title).split(",")[0].toLowerCase().trim();
    return (r.tags || []).filter(t => !INTERNAL.test(String(t).trim()) && String(t).toLowerCase().replace(/-/g, " ") !== head); };
  const wordsOf = r => { const head = String(r.title).split(",")[0].toLowerCase();
    return [...new Set((String(r.definition || r.summary).match(/[A-Za-zÀ-ÿ'-]{5,}/g) || []).map(w => w.toLowerCase()).filter(w => !STOP.test(w) && !head.includes(w)))]; };
  const nameOnly = t => String(t || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
  const roleOf = t => (String(t || "").match(/\(([^)]+)\)/) || [])[1] || "";

  // ---------- generative drawings, all seeded by the record ----------
  function contours(r, w, h, color) {               // water-like contour lines for places
    const R = rng(hash(r.id)), n = 9, paths = [];
    for (let i = 0; i < n; i++) {
      const y = h * (0.12 + i * 0.09), amp = 6 + R() * 14, f = 0.008 + R() * 0.012, ph = R() * 6;
      let d = `M0,${y.toFixed(1)}`;
      for (let x = 0; x <= w; x += 12) d += ` L${x},${(y + Math.sin(x * f + ph + i * .6) * amp + Math.sin(x * f * 2.3 + ph) * amp * .35).toFixed(1)}`;
      paths.push(`<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${(0.18 + i * 0.05).toFixed(2)}" stroke-width="1.1"/>`);
    }
    return `<svg class="bc-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${paths.join("")}</svg>`;
  }
  function waveform(r, w, h, color) {               // tide-like stripe for nature
    const R = rng(hash(r.id) ^ 77); let d = `M0,${h / 2}`;
    for (let x = 0; x <= w; x += 4) d += ` L${x},${(h / 2 + (Math.sin(x / 9 + R() * .4) * .5 + (R() - .5)) * h * .42).toFixed(1)}`;
    return `<svg class="bc-wave" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.4"/></svg>`;
  }
  function rhythm(r, color) {                       // repeating marks for practices, one per letter
    const t = nameOnly(r.title).replace(/[^A-Za-z]/g, "").slice(0, 28);
    return `<div class="bc-rhythm" aria-hidden="true">${[...t].map(ch => { const k = ch.toLowerCase().charCodeAt(0) - 97; return `<i style="height:${8 + (k % 7) * 4}px;background:${color};opacity:${(0.35 + (k % 5) * 0.13).toFixed(2)}"></i>`; }).join("")}</div>`;
  }
  function constellation(r, w, h, ink) {            // tags orbit the concept
    const R = rng(hash(r.id)), base = tagsOf(r), tags = [...base, ...wordsOf(r).filter(w => !base.includes(w))].slice(0, 7), cx = w / 2, cy = h * 0.46;
    const off = R() * Math.PI * 2; const pts = tags.map((t, i) => { const a = (i / tags.length) * Math.PI * 2 + off; const rad = i % 2 ? 84 : 64; return [cx + Math.cos(a) * rad * 1.25, cy + Math.sin(a) * rad * .8, t]; });
    return `<svg class="bc-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">${pts.map(([x, y]) => `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${ink}" stroke-opacity=".25"/>`).join("")}
      ${pts.map(([x, y, t]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${ink}"/><text x="${x.toFixed(1)}" y="${(y - 7).toFixed(1)}" font-size="10" text-anchor="middle" fill="${ink}" fill-opacity=".8">${esc(clip(t.replace(/-/g, " "), 18))}</text>`).join("")}
      <circle cx="${cx}" cy="${cy}" r="5" fill="${ink}"/></svg>`;
  }
  function lifeBar(r, ink) {                         // life or event span on a 1500–2030 axis; fuzzy ends when approximate
    const [a, b] = yearsOf(r), lo = 1500, hi = 2030, pct = y => Math.max(0, Math.min(100, (y - lo) / (hi - lo) * 100));
    if (!a && !b) return `<div class="bc-axis"><span class="bc-unk">dates unknown</span></div>`;
    const s = pct(a || b), e = pct(b || a), fuzzy = /approx|around|circa|c\.|unknown/i.test(r.precision + " " + r.date);
    return `<div class="bc-axis"><div class="bc-rule"></div><div class="bc-span ${fuzzy ? "fuzzy" : ""}" style="left:${s}%;width:${Math.max(1.2, e - s)}%;background:${ink}"></div>
      <span class="bc-tick" style="left:0">1500</span><span class="bc-tick" style="left:50%">1765</span><span class="bc-tick" style="right:0">2030</span></div>`;
  }

  // ---------- styles per category ----------
  const STYLES = {
    work: [
      { id: "cover", name: "Cover", note: "Reads like the object's own cover: medium, title, maker.", render: (r) => { const [bg, fg] = tone(r);
        return `<div class="bc bc-cover" style="background:${bg};color:${fg}"><div class="bc-eyebrow">${esc(r.medium || "Work")}</div><div class="bc-big">${esc(clip(nameOnly(r.title.replace(/\s*\(.*$/, "")), 90))}</div>
          <div class="bc-foot"><span>${esc(clip(String(roleOf(r.title) || r.creator).replace(/,?\s*\d{4}\s*$/, ""), 60))}</span><span>${esc(span(r))}</span></div></div>`; } },
      { id: "catalogue", name: "Catalogue card", note: "Library index card. Fields stay explicit, gaps stay visible.", render: (r) =>
        `<div class="bc bc-cat"><div class="bc-hole"></div><div class="bc-mono"><b>${esc(clip(r.title, 110))}</b>
          <div>Medium · ${esc(r.medium || "unknown")}</div><div>Date · ${esc(span(r) || "unknown")}</div><div>Locator · ${esc(clip(r.locator, 60) || "none recorded")}</div></div>
          <div class="bc-tags">${tagsOf(r).slice(0, 4).map(t => `<span>${esc(t)}</span>`).join("")}</div></div>` },
      { id: "spine", name: "Shelf spine", note: "Narrow and tall in spirit; best when works sit side by side.", render: (r) => { const [bg, fg] = tone(r);
        return `<div class="bc bc-spine" style="background:${bg};color:${fg}"><div class="bc-vert">${esc(clip(r.title.replace(/\s*\(.*$/, ""), 70))}</div><div class="bc-spinefoot">${esc(r.medium || "")}<br>${esc(span(r))}</div></div>`; } },
    ],
    person: [
      { id: "nameplate", name: "Name plate", note: "No likeness. Name, role, and a life span placed on the long timeline.", render: (r) => { const [, ink] = TONES[3];
        return `<div class="bc bc-plate"><div class="bc-eyebrow">${esc(roleOf(r.title) || "Person")}</div><div class="bc-name">${esc(nameOnly(r.title))}</div>
          <div class="bc-dates">${esc(r.date ? clip(r.date, 40) : span(r) || "dates unknown")}</div>${yearsOf(r).some(Boolean) ? lifeBar(r, ink) : ""}<div class="bc-line">${esc(clip(firstSentence(r.summary), 150))}</div></div>`; } },
      { id: "monogram", name: "Monogram", note: "Initials stand in for a portrait until a checked one exists.", render: (r) => { const [bg, fg] = tone(r);
        return `<div class="bc bc-mono-card"><div class="bc-disc" style="background:${bg};color:${fg}">${esc(initials(r.title) || "·")}</div>
          <div class="bc-name sm">${esc(nameOnly(r.title))}</div><div class="bc-dates">${esc(span(r) || "dates unknown")}${roleOf(r.title) ? " · " + esc(roleOf(r.title)) : ""}</div>
          <div class="bc-tags c">${tagsOf(r).slice(0, 3).map(t => `<span>${esc(t)}</span>`).join("")}</div></div>`; } },
      { id: "column", name: "Column", note: "Newspaper column: a life told in one opening line.", render: (r) =>
        `<div class="bc bc-column"><div class="bc-rulehead"></div><div class="bc-caps">${esc(nameOnly(r.title))}</div><div class="bc-dates">${esc(span(r) || "dates unknown")}</div>
          <div class="bc-body">${esc(clip(r.summary, 330))}</div></div>` },
    ],
    place: [
      { id: "contour", name: "Contour", note: "Water-like lines drawn from the record, not a map. Name and period over them.", render: (r) => { const [bg, fg] = tone(r);
        return `<div class="bc bc-contour" style="background:${bg};color:${fg}">${contours(r, 260, 300, fg)}<div class="bc-over"><div class="bc-eyebrow">Place</div>
          <div class="bc-big">${esc(r.title.split(",")[0])}</div><div class="bc-sub">${esc(r.title.split(",").slice(1).join(",").trim())}</div></div><div class="bc-foot"><span>${esc(span(r))}</span></div></div>`; } },
      { id: "postmark", name: "Postmark", note: "A stamp: place name around the edge, period in the middle.", render: (r) => { const fg = ["#5b4a2f", "#2f5a4d", "#6b3a31", "#33476a", "#4f3d68"][hash(r.id) % 5]; const name = clip(r.title.split(",")[0].toUpperCase(), 28);
        return `<div class="bc bc-postmark"><svg viewBox="0 0 200 200" class="bc-stamp" aria-hidden="true"><defs><path id="pm-${r.id}" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>
          <circle cx="100" cy="100" r="88" fill="none" stroke="${fg}" stroke-width="2"/><circle cx="100" cy="100" r="58" fill="none" stroke="${fg}" stroke-width="1"/>
          <text font-size="15" letter-spacing="3" fill="${fg}" font-family="Georgia,serif"><textPath href="#pm-${r.id}">${esc(name)} · ${esc(name)}</textPath></text>
          <text x="100" y="106" text-anchor="middle" font-size="17" fill="${fg}" font-family="Georgia,serif">${esc(span(r) || "—")}</text></svg>
          <div class="bc-sub c">${esc(r.title.split(",").slice(1).join(",").trim())}</div></div>`; } },
      { id: "legend", name: "Map legend", note: "Reads like a key on a chart: name, region, what is here.", render: (r) =>
        `<div class="bc bc-legend"><div class="bc-key"><i></i><b>${esc(r.title.split(",")[0])}</b></div><div class="bc-sub">${esc(r.title.split(",").slice(1).join(",").trim())}</div>
          <div class="bc-line">${esc(clip(firstSentence(r.summary), 170))}</div><div class="bc-tags">${tagsOf(r).slice(0, 5).map(t => `<span>${esc(t)}</span>`).join("")}</div></div>` },
    ],
    excerpt: [
      { id: "quote", name: "Quote", note: "The words first, with page and source underneath.", render: (r) =>
        `<div class="bc bc-quote"><div class="bc-qmark">“</div><div class="bc-q">${esc(clip(r.quote || r.summary, 300))}</div><div class="bc-src">${esc(clip(r.title.replace(/:.*$/, ""), 60))}${r.locator ? `<span>${esc(clip(r.locator, 46))}</span>` : ""}</div></div>` },
      { id: "page", name: "Torn page", note: "A fragment of the printed page, page number kept.", render: (r) =>
        `<div class="bc bc-page"><div class="bc-pq">${esc(clip(r.quote || r.summary, 360))}</div><div class="bc-tear"></div><div class="bc-pfoot">${esc(clip(r.title, 60))}${r.locator ? " · " + esc(clip(r.locator, 30)) : ""}</div></div>` },
    ],
    event: [
      { id: "ticket", name: "Ticket", note: "Date-forward; the perforation splits when from what.", render: (r) => { const [bg, fg] = tone(r);
        return `<div class="bc bc-ticket"><div class="bc-stub" style="background:${bg};color:${fg}"><div class="bc-year">${esc(String(yearsOf(r)[0] || "?"))}</div><div class="bc-sub">${esc(clip(r.date, 34))}</div></div>
          <div class="bc-perf"></div><div class="bc-tbody"><div class="bc-t">${esc(clip(r.title.replace(/\s*\([^)]*\)\s*$/, ""), 110))}</div><div class="bc-tags">${tagsOf(r).slice(0, 3).map(t => `<span>${esc(t)}</span>`).join("")}</div></div></div>`; } },
      { id: "timeline", name: "Timeline strip", note: "Placed on the long axis; fuzzy when the date is uncertain.", render: (r) => { const [, ink] = TONES[2];
        return `<div class="bc bc-tl"><div class="bc-eyebrow">Event · ${esc(span(r) || "date unknown")}</div><div class="bc-t big">${esc(clip(r.title.replace(/\s*\([^)]*\)\s*$/, ""), 100))}</div>${lifeBar(r, ink)}<div class="bc-line">${esc(clip(firstSentence(r.summary), 140))}</div></div>`; } },
      { id: "headline", name: "Headline", note: "Newspaper headline with a dateline.", render: (r) =>
        `<div class="bc bc-head"><div class="bc-mast">THE RECORD</div><div class="bc-hl">${esc(clip(r.title.replace(/\s*\([^)]*\)\s*$/, ""), 90))}</div><div class="bc-dl">${esc(clip(r.date, 40) || "Undated")} —</div><div class="bc-body">${esc(clip(r.summary, 220))}</div></div>` },
    ],
    concept: [
      { id: "glossary", name: "Glossary", note: "Term and definition, like a lexicon entry.", render: (r) =>
        `<div class="bc bc-gloss"><div class="bc-term">${esc(clip(r.title.split(",")[0], 70))}</div><div class="bc-pos">${esc(clip(r.title.split(",").slice(1).join(",").trim(), 70) || "concept")}</div>
          <div class="bc-def">${esc(clip(r.definition || firstSentence(r.summary), 260))}</div></div>` },
      { id: "constellation", name: "Constellation", note: "The concept at the center, its tags around it.", render: (r) =>
        `<div class="bc bc-const">${constellation(r, 260, 300, "#2f5a4d")}<div class="bc-cterm">${esc(clip(r.title.split(",")[0], 50))}</div></div>` },
    ],
    practice: [
      { id: "gesture", name: "Gesture", note: "A rhythm drawn from the name; medium and place under it.", render: (r) => { const [bg, fg] = tone(r);
        return `<div class="bc bc-gesture" style="background:${bg};color:${fg}"><div class="bc-eyebrow">${esc(r.medium || "Practice")}</div>${rhythm(r, fg)}
          <div class="bc-big sm">${esc(clip(r.title, 90))}</div><div class="bc-foot"><span>${esc(span(r))}</span></div></div>`; } },
      { id: "fieldcard", name: "Field card", note: "Who, where, when, as written down in the field.", render: (r) =>
        `<div class="bc bc-field"><div class="bc-t">${esc(clip(r.title, 90))}</div>
          <dl><dt>What</dt><dd>${esc(r.medium || "unknown")}</dd><dt>When</dt><dd>${esc(span(r) || "unknown")}</dd><dt>Tags</dt><dd>${esc(tagsOf(r).slice(0, 4).join(", ") || "none")}</dd></dl>
          <div class="bc-line">${esc(clip(firstSentence(r.summary), 130))}</div></div>` },
    ],
    nature: [
      { id: "specimen", name: "Specimen plate", note: "Natural-history plate: ruled border, small caps, a measured line.", render: (r) =>
        `<div class="bc bc-spec"><div class="bc-frame"><div class="bc-plateno">PL. ${hash(r.id) % 90 + 1}</div><div class="bc-sc">${esc(clip(r.title, 100))}</div>
          ${waveform(r, 220, 46, "#2f5a4d")}<div class="bc-sub">${esc(r.medium || "Water and climate")}</div></div></div>` },
      { id: "fieldnote", name: "Field note", note: "Graph paper, a heading, the evidence it rests on.", render: (r) =>
        `<div class="bc bc-graph"><div class="bc-t">${esc(clip(r.title, 90))}</div><div class="bc-line">${esc(clip(firstSentence(r.summary), 160))}</div><div class="bc-loc">${esc(clip(r.locator, 110))}</div></div>` },
    ],
  };

  const CSS = `
  .bc{position:relative;width:100%;height:100%;box-sizing:border-box;overflow:hidden;font:14px/1.4 system-ui,-apple-system,sans-serif;color:#251f21;background:#fff;display:flex;flex-direction:column}
  .bc-eyebrow{font:650 10.5px/1.2 system-ui;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
  .bc-big{font:600 26px/1.12 Georgia,serif;margin-top:auto}.bc-big.sm{font-size:21px;margin-top:auto}
  .bc-foot{display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:.8;margin-top:12px}
  .bc-sub{font-size:13px;opacity:.75;margin-top:3px}.c{text-align:center}
  .bc-line{font-size:13px;line-height:1.45;color:#4a4446;margin-top:10px}
  .bc-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:auto;padding-top:8px}.bc-tags span{font-size:10.5px;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:1px 7px;color:#5d5759}.bc-tags.c{justify-content:center}
  .bc-svg{position:absolute;inset:0;width:100%;height:100%}
  /* work */
  .bc-cover{padding:20px 18px 16px}
  .bc-cat{background:#fbf8f1;padding:18px 16px 14px 34px;background-image:repeating-linear-gradient(#fbf8f1 0 23px,#e6dfcf 23px 24px)}
  .bc-cat .bc-hole{position:absolute;left:12px;top:50%;width:10px;height:10px;border-radius:50%;background:#e9e4da;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}
  .bc-mono{font:12.5px/24px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}.bc-mono b{display:block;font:600 14px/1.35 ui-monospace,Menlo,monospace;margin-bottom:4px}
  .bc-spine{align-items:center;justify-content:space-between;padding:18px 0 14px}
  .bc-vert{writing-mode:vertical-rl;transform:rotate(180deg);font:600 22px/1.1 Georgia,serif;max-height:200px;overflow:hidden;text-align:center}
  .bc-spinefoot{font-size:11px;text-align:center;opacity:.8;letter-spacing:.06em;text-transform:uppercase}
  /* person */
  .bc-plate{padding:18px 18px 14px;background:#f8f6f2}
  .bc-name{font:600 25px/1.12 Georgia,serif;margin-top:6px}.bc-name.sm{font-size:20px;text-align:center;margin-top:10px}
  .bc-dates{font-size:12.5px;color:#625e60;margin-top:4px}
  .bc-axis{position:relative;height:30px;margin-top:12px}.bc-rule{position:absolute;left:0;right:0;top:8px;border-top:1px solid #cfc8c3}
  .bc-span{position:absolute;top:5px;height:7px;border-radius:4px}.bc-span.fuzzy{-webkit-mask:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent);mask:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent)}
  .bc-tick{position:absolute;top:15px;font-size:9.5px;color:#9a9396}.bc-tick[style*="50%"]{transform:translateX(-50%)}.bc-unk{font-size:11px;color:#9a9396}
  .bc-mono-card{align-items:center;justify-content:center;padding:18px;background:#fbfaf8}
  .bc-disc{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 36px Georgia,serif;letter-spacing:.04em}
  .bc-column{padding:16px 18px;background:#f6f3ec}.bc-rulehead{border-top:3px double #251f21;margin-bottom:10px}
  .bc-caps{font:700 17px/1.2 Georgia,serif;letter-spacing:.06em;text-transform:uppercase}.bc-body{font:13.5px/1.5 Georgia,serif;margin-top:8px;text-align:justify;hyphens:auto}
  /* place */
  .bc-contour{padding:18px}.bc-over{position:relative;margin-top:auto}.bc-contour .bc-foot{position:relative}
  .bc-postmark{align-items:center;justify-content:center;background:#f7f4ee;padding:14px}.bc-stamp{width:78%;height:auto;transform:rotate(-8deg)}
  .bc-legend{padding:18px;background:#f4f6f3}.bc-key{display:flex;align-items:center;gap:8px;font:600 20px/1.2 Georgia,serif}.bc-key i{width:12px;height:12px;border-radius:50%;border:3px solid #34685a;flex:none}
  /* excerpt */
  .bc-quote{padding:14px 18px 14px;background:#fbfaf7}.bc-qmark{font:700 64px/0.8 Georgia,serif;color:#34685a;height:34px}
  .bc-q{font:16px/1.45 Georgia,serif;overflow:hidden;flex:1;-webkit-mask:linear-gradient(#000 80%,transparent);mask:linear-gradient(#000 80%,transparent)}
  .bc-src{font-size:12px;color:#625e60;border-top:1px solid #e6e3e1;padding-top:8px;margin-top:6px}.bc-src span{display:block;font-size:11px;color:#9a9396;margin-top:2px}
  .bc-page{padding:20px 18px 0;background:#f4efe3}.bc-pq{font:13.5px/1.6 Georgia,serif;flex:1;overflow:hidden;text-indent:1.2em;-webkit-mask:linear-gradient(#000 78%,transparent);mask:linear-gradient(#000 78%,transparent)}
  .bc-tear{height:14px;background:linear-gradient(135deg,#f4efe3 33%,transparent 33%) 0 0/14px 14px,linear-gradient(225deg,#f4efe3 33%,transparent 33%) 0 0/14px 14px;margin:0 -18px}
  .bc-pfoot{font-size:11.5px;color:#625e60;padding:8px 0 10px;text-align:center}
  /* event */
  .bc-ticket{flex-direction:row;background:#fbfaf6}.bc-stub{width:92px;flex:none;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:10px;text-align:center}
  .bc-year{font:700 28px/1 Georgia,serif;writing-mode:vertical-rl;transform:rotate(180deg)}.bc-stub .bc-sub{font-size:10.5px;margin-top:8px}
  .bc-perf{width:0;border-left:2px dashed #d7d0c8;margin:10px 0}.bc-tbody{padding:16px 14px;display:flex;flex-direction:column;flex:1}
  .bc-t{font:600 17px/1.25 Georgia,serif}.bc-t.big{font-size:20px;margin-top:6px}
  .bc-tl{padding:18px;background:#faf8f5}
  .bc-head{padding:12px 16px;background:#f3f0e8}.bc-mast{font:700 12px Georgia,serif;letter-spacing:.3em;text-align:center;border-bottom:1px solid #251f21;padding-bottom:5px}
  .bc-hl{font:700 21px/1.12 Georgia,serif;margin-top:10px}.bc-dl{font:italic 12px Georgia,serif;color:#625e60;margin-top:6px}
  /* concept */
  .bc-gloss{padding:20px 18px;background:#fbfbf9}.bc-term{font:600 24px/1.15 Georgia,serif}.bc-pos{font:italic 13px Georgia,serif;color:#625e60;margin-top:3px}
  .bc-def{font:15px/1.5 Georgia,serif;margin-top:12px;border-top:1px solid #e6e3e1;padding-top:10px}
  .bc-const{background:#f3f6f4}.bc-cterm{position:absolute;left:0;right:0;bottom:16px;text-align:center;font:600 18px/1.2 Georgia,serif;padding:0 14px}
  /* practice */
  .bc-gesture{padding:18px}.bc-rhythm{display:flex;align-items:flex-end;gap:3px;height:44px;margin-top:22px}.bc-rhythm i{width:5px;border-radius:2px}
  .bc-field{padding:16px 18px;background:#fbf9f3}.bc-field dl{display:grid;grid-template-columns:52px 1fr;gap:4px 8px;margin:12px 0 0;font-size:12.5px}.bc-field dt{color:#9a9396;text-transform:uppercase;font-size:10.5px;letter-spacing:.1em;padding-top:2px}.bc-field dd{margin:0}
  /* nature */
  .bc-spec{padding:12px;background:#f5f1e6}.bc-frame{border:1px solid #6b6359;outline:1px solid #6b6359;outline-offset:4px;height:100%;box-sizing:border-box;padding:14px 12px;display:flex;flex-direction:column;align-items:center;text-align:center}
  .bc-plateno{font:11px Georgia,serif;letter-spacing:.2em;color:#6b6359}.bc-sc{font:600 16px/1.3 Georgia,serif;font-variant:small-caps;letter-spacing:.03em;margin:12px 0 auto}
  .bc-wave{width:100%;height:46px;margin:10px 0 6px}
  .bc-graph{padding:16px 18px;background:#fff;background-image:linear-gradient(#e3ecf3 1px,transparent 1px),linear-gradient(90deg,#e3ecf3 1px,transparent 1px);background-size:14px 14px}
  .bc-loc{font:11.5px/1.45 ui-monospace,Menlo,monospace;color:#33476a;margin-top:auto;padding-top:10px}
  `;
  if (!document.getElementById("bc-css")) { const st = document.createElement("style"); st.id = "bc-css"; st.textContent = CSS; document.head.appendChild(st); }

  window.BACards = {
    STYLES,
    render(rec, styleId) {
      const list = STYLES[rec.type]; if (!list) return "";
      const st = list.find(s => s.id === styleId) || list[0];
      try { return st.render(rec); } catch (e) { return `<div class="bc" style="padding:16px">${esc(rec.title)}</div>`; }
    },
    // turn a library record (v4 format) into the fields the designs use
    fromRecord(r, extra = {}) {
      const years = String((r.date && (r.date.edtf + " " + r.date.as_stated)) || "").match(/-?\d{3,4}/g) || [];
      return { id: r.id, type: r.type, title: r.title || "", summary: r.summary || "", quote: r.quote || "", definition: extra.definition || "",
        medium: extra.medium || "", creator: r.creator_as_stated !== "unknown" ? r.creator_as_stated : "", date: r.date && r.date.as_stated !== "unknown" ? r.date.as_stated : "",
        y0: years[0] ? +years[0] : null, y1: years[1] ? +years[1] : (years[0] ? +years[0] : null), precision: (r.date || {}).precision || "",
        places: r.places || [], tags: r.tags || [], locator: r.locator !== "unknown" ? r.locator : "", care: (r.care || {}).note || "" };
    },
  };
})();
