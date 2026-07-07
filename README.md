# Shopee Aff Link

Trang web tĩnh (PWA) tạo **link tiếp thị liên kết Shopee rút gọn**. User dán link Shopee → app ghép link affiliate theo công thức chính thức → copy / mở app Shopee.

## Cách hoạt động

Toàn bộ xử lý chạy **client-side**, không có backend. Link được tạo theo công thức chính thức của Shopee:

```
https://s.shopee.vn/an_redir?origin_link=<ENCODED_LINK>&affiliate_id=<ID>&sub_id=<v1>-<v2>-<v3>-<v4>-<v5>
```

- `origin_link`: link gốc Shopee, đã `encodeURIComponent`.
- `affiliate_id`: ID của bạn (nhập 1 lần, lưu ở `localStorage`).
- `sub_id`: tối đa 5 trường tracking, tùy chọn.

Nguồn: Hướng dẫn tạo link Tiếp thị liên kết rút gọn — Shopee Help Center (article 172955).

## Luồng người dùng

1. Copy link trong app Shopee.
2. Mở web app, bấm **Dán** (hoặc dán tay).
3. Bấm **Tạo link Affiliate**.
4. **Sao chép** hoặc **Mở Shopee** — hệ điều hành tự mở app Shopee qua deeplink.

> iOS không hỗ trợ Web Share Target, nên luồng dùng copy/paste để chạy được trên cả iOS lẫn Android.

## Cấu trúc

```
index.html      # toàn bộ UI + logic (1 file)
manifest.json   # PWA manifest
sw.js           # service worker (cài PWA + offline)
icons/          # icon PWA 192 / 512 / maskable
```

## Deploy lên Cloudflare Pages

Không cần build. Đây là site tĩnh.

```bash
# Cách 1: Wrangler CLI
npm i -g wrangler
wrangler pages deploy . --project-name aff-link

# Cách 2: Cloudflare Dashboard
# Pages > Create > Connect Git repo > Build command: (để trống) > Output dir: /
```

HTTPS được Cloudflare cấp sẵn — bắt buộc cho PWA + clipboard.

## Chạy thử local

```bash
python3 -m http.server 8080
# mở http://localhost:8080
```
