// Progressive enhancement: the page works without this. It puts the visitor's OS first and
// refreshes the download links and count from GitHub so they're current between site builds.
import { apiUrl, formatCount, formatSize, summarize } from './releases.js'

const repo = document.documentElement.dataset.repo

/** The visitor's platform id from PLATFORMS, or null on phones and unknown systems. */
async function detectOs() {
  const ua = navigator.userAgent.toLowerCase()
  // Phones and tablets can't run the app; keep the default order there.
  if (/android|iphone|ipad/.test(ua)) return null
  const p = (navigator.userAgentData?.platform || navigator.platform || ua).toLowerCase()
  if (p.includes('mac')) {
    // Chromium browsers can tell Intel from Apple silicon; Safari and Firefox can't, so they
    // get the Apple silicon button first, which fits every Mac sold since 2021.
    try {
      const { architecture } = await navigator.userAgentData?.getHighEntropyValues(['architecture']) ?? {}
      if (architecture === 'x86') return 'mac-intel'
    } catch { /* not available */ }
    return 'mac'
  }
  if (p.includes('win')) return 'windows'
  if (p.includes('linux') || p.includes('x11')) return 'appimage'
  return null
}

function highlight(os) {
  if (!os) return
  for (const group of document.querySelectorAll('[data-dl-group]')) {
    const mine = group.querySelector(`[data-dl="${os}"]`)
    if (!mine) continue
    for (const a of group.querySelectorAll('[data-dl]')) a.classList.toggle('btn-primary', a === mine)
    group.prepend(mine)
  }
}

function apply(data) {
  for (const [id, a] of Object.entries(data.assets)) {
    for (const el of document.querySelectorAll(`[data-dl="${id}"]`)) el.href = a.url
    for (const el of document.querySelectorAll(`[data-size="${id}"]`)) el.textContent = formatSize(a.size)
  }
  if (data.version) for (const el of document.querySelectorAll('[data-version]')) el.textContent = data.version
  if (data.downloads > 0) {
    for (const el of document.querySelectorAll('[data-downloads]')) el.textContent = formatCount(data.downloads)
    for (const el of document.querySelectorAll('[data-downloads-wrap]')) el.hidden = false
  }
}

async function refresh() {
  const key = 'nxtconvert-releases'
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) return apply(cached.data)
  } catch { /* storage unavailable */ }
  try {
    const res = await fetch(apiUrl(repo), { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return
    const data = summarize(await res.json())
    apply(data)
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })) } catch { /* fine */ }
  } catch { /* offline or rate limited: the numbers baked into the page stay */ }
}

void detectOs().then(highlight)
void refresh()
