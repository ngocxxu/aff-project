/**
 * Cloudflare Pages Function — POST/GET /api/build?url=<link Shopee>
 *
 * Vì sao cần server: link user copy từ app là link RÚT GỌN (vn.shp.ee/xxx).
 * an_redir cần link shopee.vn ĐẦY ĐỦ, nên phải follow redirect để bung link
 * ngắn -> link đầy đủ. Client không làm được (CORS chặn đọc redirect).
 *
 * Cấu hình qua Environment Variables (Cloudflare Pages > Settings > Env vars):
 *   AFF_ID   (bắt buộc)  ví dụ 17360510496
 *   SUB_ID   (tùy chọn)  ví dụ affProject-fb   (nối bằng '-', tối đa 5 phần)
 * Nếu không set env, dùng giá trị mặc định bên dưới.
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

/** Follow redirects to expand a short link into the full shopee.vn URL. */
async function resolveUrl(url){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000); // fail gọn sau 8s thay vì treo
  try{
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }
    });
    // res.url = URL cuối sau khi theo hết redirect. Một số CDN trả về Location tuyệt đối,
    // nếu res.url không đổi thì thử đọc header 'location' làm dự phòng.
    return res.url || res.headers.get('location') || url;
  }finally{
    clearTimeout(timer);
  }
}

/** Giữ lại link sản phẩm/shop sạch, bỏ tham số tracking rác. */
function cleanLanding(fullUrl){
  try{
    const u = new URL(fullUrl);
    // giữ nguyên path, chỉ bỏ query rác của Shopee (uls_trackid, d_id, utm_*, ...)
    u.search = '';
    u.hash = '';
    return u.toString();
  }catch(e){ return fullUrl; }
}

function buildAffiliate(landing, affId, subId){
  const encoded = encodeURIComponent(landing);
  let out = `https://s.shopee.vn/an_redir?origin_link=${encoded}&affiliate_id=${encodeURIComponent(affId)}`;
  const sub = (subId || '').replace(/-+$/,'');
  if(sub.replace(/-/g,'')) out += `&sub_id=${encodeURIComponent(sub)}`;
  return out;
}

export async function onRequest(context){
  const { request, env } = context;
  const affId = (env && env.AFF_ID) || DEFAULT_AFF_ID;
  const subId = (env && env.SUB_ID) || DEFAULT_SUB_ID;

  // lấy url từ query (?url=) hoặc JSON body
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
    // Bung link ngắn -> link đầy đủ. Link đầy đủ sẵn thì resolve trả lại chính nó.
    let landing = link;
    if(isShortLink(h)) landing = await resolveUrl(link);

    // an_redir chỉ nhận host shopee.vn/.sg... — nếu resolve xong vẫn là short thì báo lỗi.
    const lh = hostOf(landing);
    if(isShortLink(lh) || !isShopeeHost(lh)){
      return json({ error: 'Không bung được link rút gọn.', resolved: landing }, 502);
    }

    const clean = cleanLanding(landing);
    const affiliate = buildAffiliate(clean, affId, subId);
    return json({ link: affiliate, landing: clean });
  }catch(err){
    return json({ error: 'Lỗi khi bung link: ' + (err && err.message || err) }, 500);
  }
}
