# Cost Engine & Recipe Rule Specification v2.1

## Mục tiêu

Thiết kế Rule Engine tính **Material Cost (Giá vốn nguyên vật liệu)** cho sản phẩm handmade.

> **Giá bán (Sale Price) luôn nhập thủ công, Rule Engine không tính giá bán.**

---

# Kiến trúc

```text
Master Data
├── Matching Rule
├── Product
└── Recipe

        ↓

Order

        ↓

Rule Engine

        ↓

Material Cost
```

---

# 1. Matching Rule (Master Data)

Matching Rule là dữ liệu hệ thống, dùng để định nghĩa cách nhận diện ký tự.

Người dùng **KHÔNG nhập Regex**.

Người dùng chỉ chọn từ danh sách.

## Cấu trúc

| Field       | Mô tả                |
| ----------- | -------------------- |
| id          | UUID                 |
| code        | Mã rule              |
| name        | Tên hiển thị         |
| pattern     | Regex/Pattern nội bộ |
| description | Mô tả                |
| active      | Kích hoạt            |

## Rule mặc định

| Code         | Tên hiển thị      | Pattern        | Mô tả             |
| ------------ | ----------------- | -------------- | ----------------- |
| ALPHANUMERIC | Chữ & Số          | `[a-zA-Z0-9]`  | Tất cả chữ và số  |
| ALPHA        | Chỉ chữ           | `[a-zA-Z]`     | Chữ cái           |
| NUMBER       | Chỉ số            | `[0-9]`        | Chữ số            |
| UNDERSCORE   | Dấu gạch dưới (_) | `_`            | Charm hình        |
| AT           | Ký tự @           | `@`            | Charm kim loại    |
| HASH         | Ký tự #           | `#`            | Charm đặc biệt    |
| CUSTOM       | Quy tắc tùy chỉnh | Custom Pattern | Dành cho quản trị |

> Chỉ Admin mới được tạo hoặc sửa Matching Rule.

---

# 2. Product

Chỉ có 2 loại:

- BASE
- CHARM

## Cấu trúc

| Field            | Mô tả                            |
| ---------------- | -------------------------------- |
| id               | UUID                             |
| name             | Tên                              |
| type             | BASE / CHARM                     |
| cost             | Giá vốn                          |
| matching_rule_id | Tham chiếu Matching Rule (CHARM) |
| track_inventory  | Boolean                          |
| status           | Active                           |

Ví dụ:

| Product       | Type  | Matching Rule     | Cost |
| ------------- | ----- | ----------------- | ---: |
| Phôi móc khóa | BASE  | -                 | 5000 |
| Charm chữ     | CHARM | Chữ & Số          | 2000 |
| Charm hình    | CHARM | Dấu gạch dưới (_) | 5000 |

---

# 3. Recipe

Recipe là template bán hàng.

Recipe chỉ tham chiếu Product.

Ví dụ:

Móc khóa Custom

- Phôi móc khóa
- Charm chữ
- Charm hình

---

# 4. Order

Người dùng:

1. Chọn Recipe.
2. Nhập chuỗi custom.

Ví dụ:

TANDAT__

Order lưu:

- recipe_id
- custom_input
- sale_price
- material_cost
- packaging_cost
- total_cost

---

# 5. Rule Engine

Quy trình:

1. Đọc Recipe.
2. Lấy Product trong Recipe.
3. Với BASE: cộng trực tiếp cost.
4. Với CHARM:
   - Đọc Matching Rule.
   - Lấy pattern.
   - Đếm số ký tự khớp.
   - Nhân với cost.
5. Tổng = Material Cost.

Ví dụ:

Base:
5000

Input:
TANDAT__

Charm chữ:
6 × 2000

Charm hình:
2 × 5000

Material Cost = 27000

---

# 6. Snapshot

Khi Confirm Order phải lưu:

- Recipe Snapshot
- Custom Input
- Sale Price
- Material Cost
- Packaging Cost
- Total Cost

Giá vốn thay đổi sau này không ảnh hưởng đơn cũ.

---

# Business Rules

- Matching Rule là Master Data.
- Người dùng chọn Matching Rule bằng SelectBox.
- Không nhập Regex trên giao diện.
- Product chỉ tham chiếu Matching Rule.
- Recipe chỉ tham chiếu Product.
- Rule Engine đọc Pattern từ Matching Rule.
- Không hardcode Pattern trong source.
- Không hardcode Cost.
- Rule Engine chỉ tính Material Cost.
- Giá bán nhập thủ công.
- Không tạo SKU cho sản phẩm custom.
