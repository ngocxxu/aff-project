/**
 * Cloudflare Worker (Static Assets model).
 *
 * - Static files (index.html, sw.js, icons, ...) live in ./public và được Cloudflare
 *   phục vụ tự động. Request khớp file tĩnh KHÔNG chạy vào Worker.
 * - Request KHÔNG khớp file tĩnh (vd /api/build) mới chạy vào fetch() dưới đây.
 *
 * /api/build?url=<link Shopee>:
 *   Link user copy từ app thường là link RÚT GỌN (vn.shp.ee/xxx). an_redir cần link
 *   shopee.vn ĐẦY ĐỦ, nên Worker follow redirect để bung link ngắn -> link đầy đủ,
 *   cắt param rác, rồi bọc affiliate. Client không tự làm được (CORS chặn đọc redirect).
 *
 * Cấu hình qua vars (wrangler.jsonc) hoặc Dashboard > Settings > Variables:
 *   AFF_ID (bắt buộc), SUB_ID (tùy chọn, nối bằng '-', tối đa 5 phần).
 */

const DEFAULT_AFF_ID = '17360510496';
const DEFAULT_SUB_ID = 'affProject';

const SHOPEE_HOSTS = ['shopee.vn','shopee.com','shope.ee','shp.ee','shopee.sg','s.shopee.vn','s.shopee.sg'];

function hostOf(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } }
function isShopeeHost(h){ return SHOPEE_HOSTS.some(x => h === x || h.endsWith('.' + x)); }
function isShortLink(h){ return h === 'shp.ee' || h.endsWith('.shp.ee') || h === 'shope.ee' || h.endsWith('.shope.ee'); }

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

/** Follow redirects để bung link ngắn thành link shopee.vn đầy đủ. Có timeout 8s. */
async function resolveUrl(url){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try{
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }
    });
    return res.url || res.headers.get('location') || url;
  }finally{
    clearTimeout(timer);
  }
}

function cleanLanding(fullUrl){
  try{ const u = new URL(fullUrl); u.search = ''; u.hash = ''; return u.toString(); }
  catch(e){ return fullUrl; }
}

function buildAffiliate(landing, affId, subId){
  let out = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(landing)}&affiliate_id=${encodeURIComponent(affId)}`;
  const sub = (subId || '').replace(/-+$/,'');
  if(sub.replace(/-/g,'')) out += `&sub_id=${encodeURIComponent(sub)}`;
  return out;
}

async function handleBuild(request, env){
  const affId = (env && env.AFF_ID) || DEFAULT_AFF_ID;
  const subId = (env && env.SUB_ID) || DEFAULT_SUB_ID;

  let raw = new URL(request.url).searchParams.get('url') || '';
  if(!raw && request.method === 'POST'){
    try{ const b = await request.json(); raw = b.url || ''; }catch(e){}
  }
  raw = String(raw).trim();

  const m = raw.match(/(https?:\/\/[^\s"'<>]+)/i);
  const link = m ? m[0].replace(/[)\].,!?;:'"»”]+$/,'') : '';
  if(!link) return json({ error: 'Không tìm thấy link trong nội dung.' }, 400);

  const h = hostOf(link);
  if(!isShopeeHost(h)) return json({ error: 'Link không phải domain Shopee.' }, 400);

  try{
    let landing = link;
    if(isShortLink(h)) landing = await resolveUrl(link);

    const lh = hostOf(landing);
    if(isShortLink(lh) || !isShopeeHost(lh)){
      return json({ error: 'Không bung được link rút gọn.', resolved: landing }, 502);
    }

    const clean = cleanLanding(landing);
    return json({ link: buildAffiliate(clean, affId, subId), landing: clean });
  }catch(err){
    return json({ error: 'Lỗi khi bung link: ' + (err && err.message || err) }, 500);
  }
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    if(url.pathname === '/api/build') return handleBuild(request, env);
    // Mọi thứ khác: trả về static assets (ảnh, index.html fallback...).
    if(env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  }
};
