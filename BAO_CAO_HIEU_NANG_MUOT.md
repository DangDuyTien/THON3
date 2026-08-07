# Báo cáo hiệu năng và kiến trúc motion

Ngày rà soát: 2026-08-05  
Phạm vi: trang chủ React/Vite của Xã Mê Linh, Hà Nội

## Trạng thái triển khai

| Hạng mục | Trạng thái | Cách đang bảo vệ hiệu năng |
| --- | --- | --- |
| P0 - Đo và ngân sách | Hoàn tất | `src/perf.js` ghi Web Vitals, Long Task, FPS cuộn và layer động; `npm run build:check` kiểm tra media contract cùng ngân sách bundle. |
| P1 - Motion runtime | Hoàn tất | `src/motion-runtime.js` chỉ kích hoạt scene gần viewport; `src/motion-frame-scheduler.js` gom cập nhật main thread vào một `requestAnimationFrame`. |
| P1 - Media | Hoàn tất | `AdaptiveImage` dùng AVIF/WebP `srcset`, ảnh dưới màn hình lazy-load; hero và gallery chỉ giữ cửa sổ media cần thiết, rồi prewarm cảnh kế tiếp. |
| P1 - Canvas liên tục | Hoàn tất | `OffscreenCanvas` Worker là fast path ở dev lẫn production. Worker vẽ theo display frame khi tab hiển thị; fallback main thread dùng scheduler chung. |
| P1 - Máy yếu | Hoàn tất | Thiết bị báo RAM <= 4 GB, CPU <= 4 nhân hoặc `saveData` dùng lưới contour thưa hơn và pixel ratio 1; vẫn chuyển động liên tục, không khóa ở timer FPS thấp. |
| P2 - GPU | Hoàn tất | `will-change` theo lifecycle, hero mobile chỉ giữ các layer cần thiết, grade màu là file WebP biến thể thay vì `filter`/`mix-blend-mode` runtime. |
| Tách React component | Hoàn tất | `App.jsx` chỉ ghép trang; dữ liệu, hook, canvas, header/footer và từng section có module riêng. Các section được `memo` để mở/đóng menu không render lại toàn trang. |
| Dev server | Hoàn tất | `npm run dev` dùng launcher tránh lỗi của Vite với ký tự `#` trong đường dẫn project. |

Kết quả build sau lần tách component: JavaScript `85.5 KB gzip`, CSS `6.9 KB gzip`, tổng code `92.4 KB gzip`; tất cả dưới ngân sách. Lighthouse production ba lượt mỗi cấu hình đạt desktop `99-100`, LCP `0.81-0.85 s`; mobile `98-99`, LCP `1.96-2.19 s`; cả sáu lượt có CLS/TBT bằng 0.

## Ranh giới module

| Nhu cầu thay đổi | File cần chạm |
| --- | --- |
| Ghép thứ tự hoặc trạng thái toàn trang | `src/App.jsx` |
| Nội dung CMS giả lập, ảnh, nhãn và focal point | `src/content/site-content.js` |
| Ảnh AVIF/WebP responsive | `src/components/AdaptiveImage.jsx`, `src/media.js` |
| Scroll mượt, reduced motion, scene progress | `src/hooks/useMotion.js`, `src/motion-runtime.js` |
| Frame chung trên main thread | `src/motion-frame-scheduler.js` |
| Sóng contour nền | `src/components/PageContour.jsx`, `src/contour-runtime.js`, `src/contour-draw.js`, `public/contour-worker.js` |
| Giao diện từng vùng | `src/components/sections/*.jsx` |

Tách file không tự tạo thêm FPS. Lợi ích thực tế là cô lập render: thay đổi menu không chạy lại logic của các section đã `memo`; motion, media và canvas không còn nằm lẫn trong component ghép trang. Các scene vẫn cập nhật trực tiếp `transform`, `opacity` và CSS variable, không `setState` ở mỗi frame cuộn.

## Chính sách FPS và máy yếu

`requestAnimationFrame` chạy theo tần số thực của màn hình: màn 60 Hz tối đa 60 lần/s, màn 120 Hz tối đa 120 lần/s khi thiết bị còn ngân sách. Không thể và không nên ép 120 FPS trên màn 60 Hz.

Canvas nền không dùng `setInterval` 140 ms hay lượng tử hóa vị trí blob. Nó luôn dịch chuyển liên tục, nhưng chọn profile ngay khi khởi tạo:

| Profile | Điều kiện | Pixel ratio canvas | Lưới contour | Mục tiêu |
| --- | --- | --- | --- | --- |
| `standard` | Không có tín hiệu thiết bị hạn chế | Worker tối đa 1.5; fallback 1.25 | Ô 20-26 px | Hình mịn nhất có thể |
| `low` | RAM <= 4 GB, CPU <= 4 nhân hoặc bật `saveData` | 1.0 | Ô 28-34 px | Giảm vùng pixel, bộ nhớ canvas và số phép tính mỗi frame |

`navigator.deviceMemory` và `hardwareConcurrency` chỉ là hint, nên không được dùng để tắt hiệu ứng. Khi không có hint, trang dùng `standard`; người dùng bật `prefers-reduced-motion` mới nhận giao diện không chuyển động.

## Tham chiếu landonorris.com

Quan sát thực tế tại `https://landonorris.com/` ngày 2026-08-05:

| Điều site làm tốt | Cách áp dụng cho Xã Mê Linh |
| --- | --- |
| Ảnh CDN tên hash, WebP và lazy-load phần lớn ảnh | Giữ pipeline AVIF/WebP responsive; khi đưa lên CDN thật, dùng content hash/cache immutable. |
| Asset động được chia gói, có Rive Canvas Lite và model Draco nén | Giữ một canvas Worker nhẹ; chỉ cân nhắc Rive/3D khi có ngân sách và scene cần thiết. |
| Tải asset theo thời điểm hiển thị thay vì dồn media ảnh vào một chỗ | Giữ media window/prewarm cho hero và gallery. |

Site tham chiếu cũng có khoảng 21 canvas cùng GLB/HDR/texture 3D trên trang. Điều đó phù hợp với một portfolio xe đua có phần cứng mục tiêu mạnh hơn, nhưng không phải nền tảng nên sao chép cho mục tiêu RAM thấp hoặc máy cũ. Với Xã Mê Linh, một canvas 2D Worker, ảnh responsive và scene sleep/prewarm cho tỷ lệ đẹp/mượt tốt hơn đáng kể.

## Ngân sách không thương lượng

| Chỉ số | Desktop | Mobile tầm trung |
| --- | --- | --- |
| Frame cuộn | 60 FPS, main thread < 8 ms/frame | 50-60 FPS, main thread < 12 ms/frame |
| Long task | Không task > 50 ms trong lượt cuộn | Không task > 80 ms |
| LCP p75 | < 2.0 s | < 2.5 s trên 4G |
| JavaScript khởi đầu | < 90 KB gzip | < 90 KB gzip |
| Layer động cùng lúc | < 12 layer lớn | < 8 layer lớn |

Không merge scene mới nếu vượt ngân sách mà không có trace giải thích rõ nguyên nhân và cách bù lại.

## Quy tắc khi thêm hiệu ứng

1. Không tự tạo `scroll`, `resize`, `setInterval` hoặc vòng `requestAnimationFrame` riêng trên main thread.
2. Scene phải đăng ký qua `MotionRuntime`, có lifecycle `prewarm`, `activate`, `sleep` và chỉ tính khi gần viewport.
3. Trong frame chỉ ghi `transform`, `opacity` hoặc CSS custom property; không ghi `width`, `height`, `top`, `left`, `margin`, `filter`, `blur` hay shadow động.
4. Media đi qua `AdaptiveImage`/CMS contract, có kích thước, `srcset`, focal point và placeholder đúng tỷ lệ.
5. Chỉ dùng thêm canvas/WebGL khi review riêng về GPU, memory và fallback. Không thêm canvas nền thứ hai mặc định.
6. Khi scene rời prewarm range, bỏ `will-change`, pause video và tháo media node khi vẫn giữ được layout.

## Checklist phát hành

- [ ] `npm run build:check` đạt media contract và bundle budget.
- [ ] Lighthouse desktop/mobile không xấu đi; không có CLS/TBT mới.
- [ ] Trace cuộn desktop, mobile tầm trung và CPU slowdown không có long task mới.
- [ ] Kiểm tra `prefers-reduced-motion`, tab nền và resize.
- [ ] Kiểm tra visual desktop/mobile: không che chữ, không nhảy layout, ảnh đúng focal point.
- [ ] Kiểm tra profile contour `standard` và `low` trên thiết bị thực hoặc Chrome DevTools.

## Kết luận

Mục tiêu không phải ép mọi máy lên một con số FPS, mà là dùng hết refresh rate sẵn có khi máy đủ sức và giảm công việc đồ họa trước khi nó làm kẹt main thread trên máy yếu. Với kiến trúc hiện tại, hiệu ứng vẫn liên tục và có chiều sâu, còn scene, media và canvas chỉ giữ lượng tài nguyên cần thiết tại từng thời điểm.
