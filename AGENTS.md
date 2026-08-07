# Quy tắc làm việc với AI

Luôn giao tiếp với người dùng bằng tiếng Việt, trừ khi người dùng yêu cầu ngôn ngữ khác.

- Giải thích kế hoạch, tiến độ, lỗi và kết quả bằng tiếng Việt dễ hiểu.
- Khi chạy lệnh terminal, nếu output là tiếng Anh thì tóm tắt ý chính bằng tiếng Việt.
- Giữ nguyên tên file, lệnh, biến môi trường, thông báo lỗi kỹ thuật và đoạn code khi cần chính xác.

## Nguyên tắc Karpathy

Các nguyên tắc này áp dụng cho mọi yêu cầu viết, sửa, review hoặc refactor code trong dự án.

### 1. Suy nghĩ trước khi code

- Nêu rõ các giả định trước khi triển khai.
- Nếu yêu cầu có nhiều cách hiểu, trình bày các cách hiểu thay vì tự chọn im lặng.
- Nếu có cách đơn giản hơn, nêu ra và phản biện khi cần.
- Khi chưa rõ, dừng lại, nói rõ điểm chưa rõ và hỏi người dùng.

### 2. Ưu tiên sự đơn giản

- Chỉ xây dựng những gì người dùng yêu cầu.
- Không tạo abstraction cho code chỉ dùng một lần.
- Không thêm tính linh hoạt, cấu hình hoặc tính năng chưa được yêu cầu.
- Không xử lý các tình huống không thể xảy ra nếu không có lý do cụ thể.
- Nếu giải pháp dài hơn nhiều so với mức cần thiết, phải xem xét viết lại cho đơn giản hơn.

### 3. Thay đổi có phẫu thuật

- Chỉ chạm vào những file và dòng code cần thiết cho yêu cầu.
- Không tiện tay cải thiện code, comment, format hoặc refactor phần liên quan ngoài phạm vi.
- Tuân theo style hiện có của dự án.
- Nếu phát hiện dead code không liên quan, chỉ báo cáo, không tự xóa.
- Chỉ xóa import, biến hoặc hàm không còn dùng nếu chính thay đổi hiện tại tạo ra chúng.
- Mọi dòng thay đổi phải truy nguyên trực tiếp về yêu cầu của người dùng.

### 4. Thực thi theo mục tiêu

- Chuyển yêu cầu thành tiêu chí thành công có thể kiểm chứng.
- Với bug: tạo hoặc xác định cách tái hiện, sửa, rồi kiểm tra lại.
- Với validation: kiểm tra các input không hợp lệ và đảm bảo chúng bị từ chối đúng cách.
- Với refactor: xác nhận hành vi và test trước và sau thay đổi.
- Với công việc nhiều bước, nêu kế hoạch ngắn gọn kèm cách xác minh từng bước.
- Không kết thúc chỉ vì đã viết code; phải chạy kiểm tra phù hợp và báo cáo kết quả.

### Ngoại lệ

Với thay đổi hiển nhiên, nhỏ như sửa typo hoặc một dòng đơn giản, dùng phán đoán phù hợp và không cần áp dụng đầy đủ quy trình trên.
