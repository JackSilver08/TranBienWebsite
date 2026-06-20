# Trấn Biên Web SEO Admin API

Google Sheet đã được tạo:

https://docs.google.com/spreadsheets/d/17e6sqDXmcNN4UUeUZrSLwnZbaCuI1DIMhMkHiGr47ig/edit

Các bước deploy Apps Script:

1. Tạo project mới tại Google Apps Script.
2. Copy toàn bộ nội dung `Code.gs` vào project.
3. Chạy hàm `setupSeoAdmin()` một lần để cấp quyền và kiểm tra Sheet/Drive.
4. Deploy > New deployment > Web app.
5. Chọn:
   - Execute as: Me
   - Who has access: Anyone
6. Copy Web App URL và dán vào `js/admin-config.js`:

```js
apiUrl: 'https://script.google.com/macros/s/.../exec',
```

Ghi chú: hiện connector có thể tạo Google Sheet giúp bạn, nhưng chưa có công cụ trực tiếp để tạo và deploy Google Apps Script Web App thay bạn. Vì vậy phần deploy Apps Script vẫn cần thao tác trong trình duyệt Google.
