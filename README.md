# Rubik Academy

Thiết kế và phát triển bởi **Phuc Nguyen Hoang**.

Website học chơi Rubik (tiếng Việt và tiếng Anh): phòng trưng bày 3D, chơi tự do, học từng bước với khối 3D minh hoạ.

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bản production trong dist/
npm run verify   # kiểm chứng engine + toàn bộ công thức OLL/PLL/F2L/bài người mới
```

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `blender/build_models.py` | Script Blender dựng viên cubie (bản chi tiết và bản nhẹ cho kệ trưng bày), cúp, chậu cỏ 4 lá → `public/models/*.glb`. Chạy lại: `npm run models`. |
| `src/cube/engine.ts` | Engine NxN thuần (ký hiệu, đảo công thức, facelet Kociemba, xáo trộn). |
| `src/cube/CubeView.ts` | Khối three.js dạng instanced, animation & kéo xoay tầng. |
| `src/cube/AlgPlayer.tsx` | Trình phát công thức 3D (tua từng nước, tốc độ, làm xám viên không liên quan). |
| `src/showroom/` | Phòng trưng bày 4 bức tường (landing). |
| `src/data/` | OLL 57, PLL 21, F2L 41 (sinh tự động bởi `scripts/gen-f2l.ts`), bài người mới, tảng băng, hoạ tiết. |
| `src/ui/` | Bộ component tự làm: Button, Select, Checkbox, Switch, Slider, Modal, Drawer, Toast, logo, cờ ngôn ngữ. |
| `src/i18n.tsx` | Song ngữ vi/en. |
| `src/pages/` | Landing, Chơi tự do, Học, Thư viện, Tảng băng, Bấm giờ, Trainer… |

Hình nhận diện mọi trường hợp được sinh trực tiếp từ công thức, nên hình và công thức luôn khớp nhau.
