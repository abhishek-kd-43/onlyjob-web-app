// ─────────────────────────────────────────────
// OnlyJob — Live Jobs via RSS Feeds
// Free, no API key needed!
// ─────────────────────────────────────────────

const CORS_PROXY = "https://api.allorigins.win/raw?url=";
const CACHE_KEY  = "onlyjob_jobs";
const CACHE_TTL  = 30 * 60 * 1000; // 30 minutes

const RSS_FEEDS = [
  { name: "Sarkari Result", url: "https://www.sarkariresult.com/feed/" },
  { name: "Free Job Alert", url: "https://www.freejobalert.com/feed/" },
  { name: "Rojgar Result",  url: "https://rojgarresult.com/feed/" },
];

// ── 1. PARSE one RSS feed into job objects ──────────────────

function parseRSS(xmlText, sourceName) {
  const xml  = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) return [];

  return [...xml.querySelectorAll("item")].map((item) => {
    const title   = item.querySelector("title")?.textContent?.trim() || "";
    const link    = item.querySelector("link")?.textContent?.trim()  || "#";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const rawDesc = item.querySelector("description")?.textContent?.trim() || "";

    // Strip HTML tags from description
    const desc = new DOMParser()
      .parseFromString(rawDesc, "text/html")
      .body.textContent || "";

    // Try to pull a "last date" from the description text
    const dateMatch = desc.match(
      /(?:last\s*date|closing|apply\s*by)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i
    ) || desc.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/);

    let lastDate = dateMatch ? dateMatch[1] : "";
    if (!lastDate && pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d)) lastDate = d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
    }

    return {
      title,
      link,
      desc:       desc.slice(0, 180),
      dept:       getDept(title),
      qual:       getQual(title),
      vacancies:  getVacancy(desc),
      salary:     getSalary(desc),
      last_date:  lastDate || "See Site",
      source:     sourceName,
    };
  }).filter(j => j.title.length > 4);
}

// ── 2. HELPER EXTRACTORS ────────────────────────────────────

function getDept(t) {
  const map = ["SSC","UPSC","RRB","Railway","IBPS","SBI","Army","Navy",
               "Air Force","Police","NHM","DRDO","ISRO","High Court",
               "Bank","Post Office","CRPF","BSF","CISF","NTA"];
  return map.find(d => t.toUpperCase().includes(d.toUpperCase())) || "Government";
}

function getQual(t) {
  t = t.toUpperCase();
  if (t.includes("10TH") || t.includes("MATRIC"))   return "10th Pass";
  if (t.includes("12TH") || t.includes("INTER"))    return "12th Pass";
  if (t.includes("ITI"))                             return "ITI";
  if (t.includes("DIPLOMA"))                         return "Diploma";
  if (t.includes("B.TECH") || t.includes("ENGINEER")) return "B.Tech";
  return "Any Degree";
}

function getVacancy(text) {
  const m = text.match(/(\d[\d,]+)\s*(?:posts?|vacancies|seats?)/i);
  return m ? m[1].replace(/,/g, "") : "";
}

function getSalary(text) {
  const m = text.match(/(?:salary|pay)[^\d₹]*[₹Rs.\s]*([\d,]+-?[\d,]*)/i);
  return m ? "₹" + m[1] : "";
}

// ── 3. CACHE ────────────────────────────────────────────────

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && Date.now() - c.ts < CACHE_TTL) return c.jobs;
  } catch (_) {}
  return null;
}

function saveCache(jobs) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ jobs, ts: Date.now() })); }
  catch (_) {}
}

// ── 4. FETCH ────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(feed.url));
    if (!res.ok) throw new Error(res.status);
    return parseRSS(await res.text(), feed.name);
  } catch (e) {
    console.warn("RSS failed:", feed.name, e.message);
    return [];
  }
}

// ── 5. RENDER — top horizontal strip ───────────────────────

function renderStrip(jobs) {
  const el = document.getElementById("latest-jobs-container");
  if (!el) return;
  el.innerHTML = jobs.slice(0, 8).map(job => `
    <div onclick='openJob(${JSON.stringify(JSON.stringify(job))})'
      class="min-w-[200px] bg-surface-container-lowest p-4 rounded-xl shadow-sm
             border border-outline-variant/10 flex flex-col justify-between
             cursor-pointer hover:shadow-md transition-shadow">
      <div>
        <div class="flex justify-between items-start mb-2">
          <span class="bg-secondary-container text-on-secondary-container
                       text-[10px] font-black px-2 py-0.5 rounded-full uppercase">New</span>
          <span class="material-symbols-outlined text-outline text-lg">bookmark</span>
        </div>
        <h3 class="font-bold text-sm leading-tight text-on-surface mb-1 line-clamp-2">${job.title}</h3>
        <p class="text-[11px] text-on-surface-variant">${job.dept}</p>
      </div>
      <p class="text-[11px] text-on-surface-variant font-medium mt-2">
        Last Date: <span class="font-bold text-error">${job.last_date}</span>
      </p>
    </div>
  `).join("");
}

// ── 6. RENDER — main feed cards ─────────────────────────────

function renderFeed(jobs) {
  const el = document.getElementById("recommended-feed");
  if (!el) return;
  el.innerHTML = jobs.slice(0, 10).map(job => `
    <div class="bg-surface-container-lowest rounded-[24px] overflow-hidden
                shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all">
      <div class="p-8">
        <div class="flex items-start justify-between mb-4">
          <span class="bg-secondary-container text-on-secondary-container
                       text-[12px] font-black px-3 py-1 rounded-full uppercase">${job.source}</span>
          <span class="material-symbols-outlined text-outline cursor-pointer
                       hover:text-primary transition-colors">bookmark</span>
        </div>
        <h3 class="text-2xl font-black mb-1 leading-tight text-on-surface">${job.title}</h3>
        <p class="text-on-surface-variant font-semibold mb-5">${job.dept}</p>
        <div class="flex flex-wrap gap-4 mb-6">
          ${job.qual      ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-lg">school</span><span class="font-bold">${job.qual}</span></div>` : ""}
          ${job.vacancies ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-lg">group</span><span class="font-bold">${job.vacancies} Posts</span></div>` : ""}
          ${job.salary    ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-lg">payments</span><span class="font-bold">${job.salary}</span></div>` : ""}
          ${job.last_date ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-error text-lg">event_busy</span><span class="font-bold text-error">Deadline: ${job.last_date}</span></div>` : ""}
        </div>
        <button onclick='openJob(${JSON.stringify(JSON.stringify(job))})'
          class="w-full py-5 bg-gradient-to-r from-secondary to-on-secondary-container
                 text-white rounded-[20px] font-bold text-lg shadow-xl
                 active:scale-95 transition-transform">
          Apply Now
        </button>
      </div>
    </div>
  `).join("");
}

// ── 7. SKELETON loaders ─────────────────────────────────────

function showSkeletons() {
  const strip = document.getElementById("latest-jobs-container");
  const feed  = document.getElementById("recommended-feed");

  if (strip) strip.innerHTML = Array(5).fill(`
    <div class="min-w-[200px] bg-surface-container-lowest p-4 rounded-xl animate-pulse flex flex-col gap-3">
      <div class="h-3 bg-surface-container-high rounded w-1/3"></div>
      <div class="h-4 bg-surface-container-high rounded"></div>
      <div class="h-3 bg-surface-container-high rounded w-2/3"></div>
    </div>`).join("");

  if (feed) feed.innerHTML = Array(3).fill(`
    <div class="bg-surface-container-lowest rounded-[24px] p-8 animate-pulse flex flex-col gap-4">
      <div class="h-4 bg-surface-container-high rounded w-1/4"></div>
      <div class="h-7 bg-surface-container-high rounded w-3/4"></div>
      <div class="h-4 bg-surface-container-high rounded w-1/2"></div>
      <div class="h-14 bg-surface-container-high rounded-[20px]"></div>
    </div>`).join("");
}

function showError() {
  const feed = document.getElementById("recommended-feed");
  if (feed) feed.innerHTML = `
    <div class="text-center py-12 text-on-surface-variant">
      <span class="material-symbols-outlined text-5xl mb-3 block">wifi_off</span>
      <p class="font-semibold">Could not load jobs.</p>
      <button onclick="loadJobs()" class="mt-2 text-primary font-bold underline text-sm">Try again</button>
    </div>`;
}

// ── 8. HELPER called by Apply Now / card click ──────────────

function openJob(jsonStr) {
  sessionStorage.setItem("selectedJob", jsonStr);
  window.location.href = "jobdetail.html";
}

// ── 9. MAIN ─────────────────────────────────────────────────

async function loadJobs() {
  // Serve from cache if fresh
  const cached = loadCache();
  if (cached?.length) { renderStrip(cached); renderFeed(cached); return; }

  // Show skeletons while loading
  showSkeletons();

  // Fetch all 3 feeds at the same time
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const jobs = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  if (!jobs.length) { showError(); return; }

  saveCache(jobs);
  renderStrip(jobs);
  renderFeed(jobs);
}

document.addEventListener("DOMContentLoaded", loadJobs);
