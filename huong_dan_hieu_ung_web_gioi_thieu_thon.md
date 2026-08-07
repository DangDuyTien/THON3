# Brief hieu ung cho website gioi thieu thon

## Quyết định thiết kế

Lấy cảm hứng từ cách trang Landon Norris dẫn người xem đi qua một không gian bằng chuyển động, nhưng **không dùng hiệu ứng rê chuột để lộ gương mặt người**.

Thay vào đó, nhân vật chính của hero là cảnh quan và câu chuyện của thôn: bản đồ, đường làng, cổng làng, đình/chùa, sông, ruộng, cây cổ thụ hoặc ảnh flycam.

## Giữ, bỏ và thay thế

| Thành phần tham chiếu | Quyết định | Dùng cho website thôn |
| --- | --- | --- |
| Rê chuột để lộ gương mặt | Bỏ | Không dùng chân dung người làm trung tâm, không bắt người xem phải hover để hiểu nội dung. |
| Cuộn mượt | Giữ | Dùng `Lenis` để các section và ảnh chuyển tiếp êm, nhưng không tạo độ trễ khó chịu. |
| Hero được ghim khi cuộn | Giữ, tiết chế | Ghim hero khoảng `1–1.5` màn hình để bản đồ/cảnh quan chuyển từ tổng quan sang điểm nổi bật. |
| Parallax theo chuột | Giữ nhẹ | Chỉ dịch chuyển một chút ở lớp bản đồ, đường contour, mây hoặc ruộng. Nội dung chữ không chạy theo chuột. |
| Cảnh 3D thể thao | Thay | Dùng silhouette cổng làng, tuyến đường, mái đình, sông hoặc sản vật. Phiên bản đầu không cần mô hình 3D. |
| Đường contour sống | Giữ, đổi ngữ cảnh | Biến thành đường địa hình, đường nước hoặc ranh ruộng; màu mảnh và tương phản thấp. |

## Hero đề xuất

### Nhịp 1: Chào

- Nền: trắng ngà hoặc xanh rừng đậm, có các đường contour chuyển động rất chậm.
- Trung tâm: ảnh flycam/bản đồ minh hoạ của `[TÊN THÔN]`.
- Nội dung: tên thôn, một câu giới thiệu ngắn, nút `Khám phá thôn`.

### Nhịp 2: Đi vào không gian

- Khi cuộn, bản đồ phóng nhẹ vào các điểm có ý nghĩa: đình/chùa, chợ, trường, cây đa, bến nước, cánh đồng.
- Marker xuất hiện lần lượt, mỗi marker mở phần giới thiệu ngắn hoặc dẫn đến section tương ứng.
- Không có hiệu ứng lộ mặt người; ảnh người dân chỉ xuất hiện ở section câu chuyện/lễ hội.

### Nhịp 3: Kết nối

- Hero nhường chỗ cho lịch sử, hình ảnh đời sống, mùa vụ, lễ hội và chỉ đường.
- Nền đổi sắc chậm để báo hiệu section mới; có thể từ trắng ngà sang xanh rừng.

## Các lớp hiển thị

```text
Lớp 04  Nội dung: tên thôn, lời chào, CTA, marker
Lớp 03  Cảnh chính: ảnh flycam hoặc bản đồ địa hình
Lớp 02  Không gian: mây, sông, ruộng, đường làng (parallax nhẹ)
Lớp 01  Nền: contour/noise chuyển động rất chậm
```

Mỗi lớp nên di chuyển với tốc độ khác nhau. Lớp nền chậm nhất; ảnh/bản đồ ở giữa; chữ và nút gần như cố định để dễ đọc.

## Cách chuyển động cần giữ

### 1. Smooth scroll

Dùng `Lenis` để nhận thao tác cuộn và làm chuyển động mượt hơn. Không nên đặt `lerp` quá cao; khoảng `0.07–0.10` là đủ.

### 2. Scroll timeline

Dùng `GSAP ScrollTrigger` để gắn tiến trình cuộn vào một timeline duy nhất. Timeline đó điều khiển `scale`, `opacity`, `translate` và màu nền.

### 3. Parallax nhẹ theo chuột

Chuột chỉ làm lớp bản đồ/cảnh quan lệch vài pixel. Nó tăng chiều sâu nhưng không phải điều kiện để xem nội dung.

### 4. Nền contour

Có hai mức làm:

- Mức nhẹ: dùng canvas 2D hoặc SVG có đường cong, dịch chuyển rất chậm.
- Mức nâng cao: dùng shader noise trong WebGL, lấy đường biên của noise để tạo cảm giác địa hình.

Không cần Three.js nếu chỉ muốn nền contour và parallax. Chỉ dùng Three.js khi thật sự cần bản đồ/mô hình 3D.

## Mẫu logic JavaScript

Mẫu này giữ cơ chế cuộn và parallax nhưng không có logic reveal chân dung:

```js
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  lerp: 0.08,
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

gsap.timeline({
  scrollTrigger: {
    trigger: '.village-hero',
    start: 'top top',
    end: '+=140%',
    scrub: 1,
    pin: true,
  },
})
  .to('.map-layer', { scale: 1.06, yPercent: -3 }, 0)
  .to('.contour-layer', { opacity: 0.78 }, 0)
  .to('.hero-copy', { yPercent: -16, opacity: 0.25 }, 0);

window.addEventListener('pointermove', (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 2;
  const y = (event.clientY / window.innerHeight - 0.5) * 2;

  gsap.to('.map-layer', {
    x: x * 8,
    y: y * 5,
    duration: 0.8,
    overwrite: true,
  });
});
```

## Cấu trúc trang đề xuất

1. **Hero:** tên thôn, cảnh quan/bản đồ, nút khám phá.
2. **Câu chuyện thôn:** tên gọi, lịch sử, ký ức và ảnh cũ–mới.
3. **Bản đồ sống:** đình/chùa, chợ, trường, đường làng, sản vật và chỉ đường.
4. **Con người và mùa:** chân dung người dân, lễ hội, mùa vụ, nghề truyền thống.
5. **Ghé thăm:** lịch hoạt động, QR bản đồ, thông tin liên hệ.

## Lộ trình triển khai

### Phiên bản 1

- Hero tĩnh đẹp trên mobile.
- Ảnh thật, typography, nội dung và bản đồ.
- `GSAP` cho animation section nhẹ.
- `Lenis` cho cuộn mượt.
- Fallback hoàn chỉnh khi tắt JavaScript.

### Phiên bản 2

- Canvas/shader contour.
- Parallax theo chuột trên desktop.
- Marker bản đồ có animation.
- Đổi màu nền theo section.
- Chỉ thêm Three.js nếu cảnh 3D đem lại giá trị rõ ràng.

## Hiệu năng và khả năng tiếp cận

- Dùng ảnh `WebP` hoặc `AVIF`; lazy-load ảnh nằm dưới phần đầu trang.
- Trên điện thoại: giảm hoặc tắt parallax, không ghim hero quá lâu, ưu tiên cuộn dọc.
- Tôn trọng `prefers-reduced-motion`.
- Mọi marker, nội dung và CTA phải dùng được bằng bàn phím; không phụ thuộc hover.
- Canvas/WebGL chỉ là lớp nâng cao. Khi không tải được, website vẫn phải hiển thị đầy đủ ảnh, nội dung và bản đồ.

## Tài nguyên cần chuẩn bị

- Ảnh flycam hoặc ảnh ngang đẹp của thôn.
- Bản đồ tối giản và danh sách địa điểm nổi bật.
- Ảnh đời sống, nghề truyền thống, mùa vụ và lễ hội.
- Mốc lịch sử, câu chuyện người dân, lời giới thiệu ngắn.
- Màu thương hiệu địa phương: xanh rừng/trắng ngà và một màu nhấn tiết chế.

## Kết luận

Giữ cách dẫn người xem đi qua không gian bằng scroll, các lớp chuyển động và nền contour. Bỏ hoàn toàn mô-típ lộ gương mặt. Website sẽ hợp với thôn hơn khi cảnh quan, ký ức và con người địa phương là chất liệu chính.
