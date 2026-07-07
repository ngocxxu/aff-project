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
index.html            # toàn bộ UI + logic (1 file)
functions/api/build.js# Cloudflare Pages Function: bung link rút gọn + bọc an_redir
manifest.json         # PWA manifest
sw.js                 # service worker (cài PWA + offline)
icons/                # icon PWA 192 / 512 / maskable
```

## Link rút gọn (vn.shp.ee) — vì sao cần Pages Function

Link user copy từ app Shopee thường là **link rút gọn** (`vn.shp.ee/xxx`).
`an_redir` chỉ nhận link `shopee.vn` **đầy đủ** — bọc thẳng link rút gọn sẽ
văng ra `shope.ee/error_page`. Nên `functions/api/build.js` chạy server-side
để **follow redirect bung link ngắn -> link đầy đủ**, cắt param rác, rồi mới bọc
affiliate. (Client không tự làm được vì CORS chặn đọc redirect.)

- Link `shopee.vn` đầy đủ: frontend ghép ngay ở client, không gọi server.
- Link rút gọn: frontend gọi `/api/build?url=...` để server bung + bọc.

### Cấu hình Affiliate ID cho Function

Đặt Environment Variables trong **Cloudflare Pages > Settings > Environment variables**:

| Biến     | Bắt buộc | Ví dụ            |
|----------|----------|------------------|
| `AFF_ID` | có       | `17360510496`    |
| `SUB_ID` | không    | `affProject-fb`  |

Không set thì Function dùng giá trị mặc định trong `build.js`. Frontend (`index.html`)
cũng có `CONFIG` riêng cho nhánh link đầy đủ — nhớ để 2 chỗ trùng aff id.

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
