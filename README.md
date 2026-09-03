# Ví Riêng — quản lý chi tiêu cá nhân

App web ghi thu chi cá nhân bằng tiếng Việt, đơn vị VND. Không có backend,
không đăng nhập: **toàn bộ dữ liệu nằm trong `localStorage` của trình duyệt**.

## Chạy

```bash
npm install
npm run dev          # http://localhost:3000
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Server dev (Turbopack) |
| `npm run build` | Build production |
| `npm test` | Test logic thuần (Vitest) |
| `npm run e2e` | Test đầu-cuối (Playwright) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

Lần đầu chạy E2E cần tải browser: `npx playwright install chromium`.
Bộ E2E dùng luôn server dev ở cổng 3000 nếu đang mở, không thì tự khởi động —
Next 16 chỉ cho một `next dev` mỗi thư mục.

## Màn hình

| Route | Màn |
|---|---|
| `/` | Tổng quan — số dư, thu & chi, donut theo danh mục, giao dịch gần đây |
| `/giao-dich` | Danh sách + lọc theo loại/danh mục, sắp xếp, sửa & xoá |
| `/ngan-sach` | Hạn mức chi theo danh mục, đặt/sửa/gỡ |
| `/danh-muc` | Đổi tên và màu danh mục, xoá danh mục chưa dùng |
| `/bao-cao` | So sánh tháng này với tháng trước |

## Cấu trúc

```
app/          route (App Router), mỗi màn một page.tsx
components/
  dashboard/  4 thẻ của màn Tổng quan
  layout/     sidebar · topbar · header + tabbar mobile · bộ chọn tháng
  transaction/form thêm và sửa giao dịch
  budget/     dòng hạn mức + vòng tròn tiến độ
  ui/         primitive shadcn + lớp kính dùng chung
lib/          format tiền/ngày, danh mục, theme, tiện ích
store/        một store Zustand + các selector
e2e/          spec Playwright
```

## Vài quyết định đáng nhớ

**Một store, mọi con số còn lại là dẫn xuất.** `store/useExpenseStore.ts` chỉ
giữ `transactions`, `categories`, `budgets`, `activeMonth`. Tổng tháng, chia
theo danh mục, tình trạng hạn mức… đều là selector tính lại — không có state
nào chép sẵn số tổng, nên không bao giờ lệch nhau.

**Selector phải tính trong `useMemo`.** Zustand v5 đọc qua
`useSyncExternalStore`: truyền thẳng một hàm trả về object/mảng mới vào
`useExpenseStore(...)` sẽ tạo snapshot mới mỗi lần render → vòng lặp vô hạn.
Mỗi hook ở đây lấy lát dữ liệu thô (tham chiếu ổn định) rồi mới tính.

**Gom tháng theo giờ địa phương, không cắt chuỗi ISO.** ISO là giờ UTC, nên ở
UTC+7 mọi khoản ghi trước 07:00 sáng sẽ bị đẩy sang tháng trước — sai cả tổng
tháng lẫn ngân sách.

**Hydrate từ effect phía client** (`skipHydration: true` +
`components/store-hydration.tsx`). Nếu để persist đọc `localStorage` ngay khi
module nạp thì lần render client đầu tiên đã khác server render → React báo
hydration mismatch.

**`activeMonth` là nguồn sự thật cho cả 4 màn.** Bộ chọn tháng
(`components/layout/month-picker.tsx`) dùng chung ở ba chỗ và chỉ ghi vào đúng
ô đó; mọi selector lọc theo nó.

**Số tiền luôn dương, dấu suy ra từ `type`.** Không có số âm trong store, nên
không có chỗ nào phải đoán dấu.

**Vượt hạn mức báo bằng ba tín hiệu chồng nhau** — viền + nền, thanh đổi màu,
và nhãn chữ — để người mù màu vẫn đọc được, không chỉ dựa vào màu.

## Test

- **Vitest** (`*.test.ts`) — logic thuần: format tiền/ngày, các hàm `compute*`
  của store. Chạy trong vài trăm ms.
- **Playwright** (`e2e/*.spec.ts`) — luồng thật trên trình duyệt: sửa/xoá giao
  dịch, đặt/sửa/gỡ hạn mức, đổi tên & xoá danh mục, đổi tháng xuyên các màn,
  điều hướng. Nhiều test có bước `reload()` — dữ liệu chỉ ở `localStorage` nên
  đó mới là phép thử thật cho phần lưu.

Bảng desktop và danh sách mobile **cùng nằm trong DOM**, chỉ ẩn bằng CSS. Nên
locator trong E2E phải bám `data-testid` hoặc scope vào `tx-table`, không thì
mỗi chuỗi khớp hai lần.

## Còn tồn

- Số dư tổng đang là tổng dẫn xuất từ giao dịch, chưa có khái niệm **số dư đầu
  kỳ** theo từng nguồn tiền — nên không khớp con số trong mockup.
- Mini bar ở thẻ "Thu & chi" cao 32px thay vì 52px như thiết kế: hàng bento
  208px không đủ chỗ cho nhãn + hai dòng số + biểu đồ 52px ở đúng cỡ chữ.
- `docs/superpowers/` là spec/plan của thiết kế **đầu tiên**, đã lỗi thời.
