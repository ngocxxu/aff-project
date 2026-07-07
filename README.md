# Shopee Aff Link

Web app (PWA) tạo **link tiếp thị liên kết Shopee**. User dán link Shopee → app trả link affiliate theo công thức chính thức → copy / mở app Shopee.

Deploy dạng **Cloudflare Worker + Static Assets**: file tĩnh phục vụ từ `public/`, một Worker (`worker.js`) xử lý `/api/build` để bung link rút gọn.

## Cách hoạt động

Link affiliate theo công thức chính thức của Shopee:

```
https://s.shopee.vn/an_redir?origin_link=<ENCODED_LINK>&affiliate_id=<ID>&sub_id=<v1>-...-<v5>
```

- `origin_link`: link **shopee.vn đầy đủ**, đã `encodeURIComponent`.
- `affiliate_id`: ID của bạn (set trong `wrangler.jsonc` > `vars`, hoặc Dashboard Variables).
- `sub_id`: tối đa 5 trường tracking, tùy chọn.

Nguồn: Hướng dẫn tạo link Tiếp thị liên kết rút gọn — Shopee Help Center (article 172955).

## Link rút gọn (vn.shp.ee) — vì sao cần Worker

Link user copy từ app thường là **link rút gọn**:

- **Android:** `s.shopee.vn/xxx` — cùng domain với `an_redir`, bọc thẳng chạy được (client tự làm).
- **iOS:** `vn.shp.ee/xxx` — domain lạ, `an_redir` không giải được → `shope.ee/error_page`.

Nên link `shp.ee`/`shope.ee` phải **bung thành link shopee.vn đầy đủ trước** khi bọc.
Bung = follow redirect, client không làm được (CORS chặn). Đó là việc của Worker:

- Link `shopee.vn` / `s.shopee.vn` đầy đủ → frontend ghép ngay ở client.
- Link `vn.shp.ee` rút gọn → frontend gọi `/api/build?url=...` → Worker bung + bọc.

## Cấu trúc

```
worker.js             # Cloudflare Worker: route /api/build + fallback static assets
wrangler.jsonc        # config Worker (main, assets=./public, vars AFF_ID/SUB_ID)
public/
  index.html          # toàn bộ UI + logic frontend
  manifest.json       # PWA manifest
  sw.js               # service worker (cài PWA + offline)
  icons/              # icon PWA 192 / 512 / maskable
```

> `functions/` (quy ước Cloudflare **Pages**) KHÔNG dùng ở đây — project này là
> **Workers**, nên phải dùng `worker.js`. Đừng thêm lại `functions/`.

## Cấu hình Affiliate ID

Đặt trong `wrangler.jsonc` > `vars` (đã version sẵn), hoặc override ở
**Dashboard > Worker > Settings > Variables**:

| Biến     | Bắt buộc | Ví dụ            |
|----------|----------|------------------|
| `AFF_ID` | có       | `17360510496`    |
| `SUB_ID` | không    | `affProject`     |

`AFF_ID` không phải secret (nó lộ trong mọi link chia sẻ), để trong `vars` là được.
Frontend (`public/index.html`) có `CONFIG` riêng cho nhánh link đầy đủ — nhớ để trùng aff id.

## Deploy

Project nối Git với **Cloudflare Workers Builds**: chỉ cần

```bash
git push        # Cloudflare tự build + deploy từ wrangler.jsonc
```

Hoặc deploy tay:

```bash
npx wrangler deploy
```

## Chạy thử local (có Worker + assets)

```bash
npx wrangler dev
# mở http://localhost:8787
```

> Đừng dùng `python -m http.server` — server tĩnh thường không chạy `worker.js`,
> `/api/build` sẽ 404.
