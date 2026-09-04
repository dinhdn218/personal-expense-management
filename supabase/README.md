# Dựng Supabase cho Ví Riêng

Làm một lần, mất khoảng 10 phút. Sau bước này dữ liệu nằm trên server, đổi máy
chỉ cần đăng nhập lại.

## 1. Tạo project

1. Vào [supabase.com](https://supabase.com) → **New project**.
2. Đặt tên tuỳ ý (ví dụ `vi-rieng`), chọn region **Southeast Asia (Singapore)** —
   gần Việt Nam nhất.
3. Đặt **Database Password** và lưu lại vào trình quản lý mật khẩu. Mật khẩu này
   không dùng để đăng nhập app, nhưng cần khi thao tác trực tiếp với DB.
4. Đợi project khởi tạo xong (~2 phút).

## 2. Chạy schema

1. Mở **SQL Editor** ở thanh bên trái → **New query**.
2. Dán **toàn bộ** nội dung [`schema.sql`](schema.sql) vào và bấm **Run**.
3. Phải thấy "Success. No rows returned".

File này chỉ `CREATE`, không có lệnh `DROP` hay `DELETE` nào — chạy lại lần hai
sẽ báo `already exists`, đó là chủ ý để không bao giờ xoá nhầm dữ liệu thật.

Kiểm tra nhanh: vào **Table Editor**, phải thấy 3 bảng `categories`,
`transactions`, `budgets`, mỗi bảng có nhãn **RLS enabled**.

## 3. Bật đăng nhập bằng magic link

1. **Authentication** → **Sign In / Providers** → **Email**.
2. Bật **Enable Email provider**.
3. **Tắt "Confirm email"** — magic link tự nó đã là xác thực email rồi, để bật
   thì lần đăng nhập đầu phải mở hai email.
4. Có thể tắt luôn phần mật khẩu nếu chỉ dùng magic link.

Bản miễn phí giới hạn khoảng **3 email/giờ**. Đủ dùng cá nhân, nhưng nếu thử
đăng nhập nhiều lần liên tiếp sẽ bị chặn tạm; muốn thoải mái thì cấu hình SMTP
riêng ở **Project Settings → Authentication → SMTP Settings**.

## 4. Khai báo URL chuyển hướng

**Authentication** → **URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: thêm `http://localhost:3000/auth/callback`

Thiếu bước này thì bấm vào link trong email sẽ bị đá về trang chủ Supabase thay
vì quay lại app. Khi nào deploy thật thì thêm domain thật vào đây.

## 5. Lấy key và đặt vào `.env.local`

**Project Settings** → **API Keys**.

Tạo file `.env.local` ở gốc repo:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>

# Chỉ dùng cho test E2E. Đây là key BỎ QUA MỌI RLS.
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>
```

`.gitignore` đã chặn sẵn `.env*` nên file này không lên git.

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bỏ qua toàn bộ phân quyền RLS — nó đọc ghi được
> dữ liệu của mọi tài khoản. Không bao giờ đặt tên biến bắt đầu bằng
> `NEXT_PUBLIC_` cho nó (như vậy là gửi thẳng xuống trình duyệt), và không
> import nó vào bất cứ file nào trong `app/` hay `components/`. Nó chỉ được
> dùng trong test chạy ở Node.

Hai key đầu là công khai theo thiết kế — chúng an toàn khi lộ vì RLS mới là thứ
chặn truy cập.

## 6. Xác nhận

Sau khi Phase 2 (đăng nhập) xong, kiểm tra RLS thật sự có tác dụng:

1. Đăng nhập bằng hai email khác nhau, mỗi bên thêm một giao dịch.
2. Vào **SQL Editor**, chạy `select user_id, note from public.transactions;` —
   thấy cả hai (SQL Editor chạy quyền admin, đây là điều bình thường).
3. Quan trọng hơn: trong app, đăng nhập tài khoản A **không được** thấy bất kỳ
   dòng nào của B.
