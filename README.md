# 🏭 OmborXona — Ombor Boshqaruv Tizimi

Ombor boshqaruvining to'liq tizimi: Admin va Ishchi rollari, sklad, aktlar, sotuv va ogohlantirishlar.

---

## 📁 Loyiha tuzilmasi

```
omborxona/
├── backend/
│   ├── server.py        ← Asosiy Flask serveri (API)
│   ├── database.py      ← SQLite ma'lumotlar bazasi
│   ├── requirements.txt ← Python kutubxonalari
│   └── omborxona.db     ← Avtomatik yaratiladi
└── frontend/
    ├── index.html       ← Asosiy HTML sahifa
    ├── css/
    │   └── style.css    ← Dizayn
    └── js/
        ├── api.js       ← Backend bilan ulanish
        ├── auth.js      ← Login / Ro'yxatdan o'tish
        ├── pages.js     ← Barcha sahifalar
        └── app.js       ← Asosiy boshqaruvchi
```

---

## 🚀 Ishga tushirish

### 1. Python kutubxonalarini o'rnatish

```bash
cd backend
pip install -r requirements.txt
```

### 2. Serverni ishga tushirish

```bash
cd backend
python server.py
```

### 3. Brauzerda ochish

```
http://localhost:5000
```

---

## 🔑 Demo hisob

| Login | Parol     | Rol   |
|-------|-----------|-------|
| admin | admin123  | Admin |

---

## 👤 Foydalanuvchi rollari

### Admin (Ombor egasi)
- ✅ Statistika dashboard
- ✅ Ishlab chiqarish
- ✅ Aktlar yaratish (omborga kirim)
- ✅ Sklad qoldig'i boshqaruvi
- ✅ Ishchilar qo'shish va parol almashtirish
- ✅ Sotuv (chiqim)
- ✅ Ogohlantirishlar

### Ishchi
- ✅ Ishlab chiqarish (tayyorlangan tovarni qayd etish)
- ✅ Ogohlantirishlar (qaysi model kam qolganini ko'rish)

---

## 🛠 Texnologiyalar

| Qatlam   | Texnologiya              |
|----------|--------------------------|
| Backend  | Python + Flask           |
| Database | SQLite (fayl asosida)    |
| Frontend | HTML + CSS + Vanilla JS  |
| Auth     | JWT (JSON Web Token)     |

---

## 📡 API endpointlar

| Method | URL                           | Tavsif                    |
|--------|-------------------------------|---------------------------|
| POST   | /api/register                 | Ro'yxatdan o'tish (admin) |
| POST   | /api/login                    | Tizimga kirish            |
| GET    | /api/workers                  | Ishchilar ro'yxati        |
| POST   | /api/workers                  | Yangi ishchi qo'shish     |
| PUT    | /api/workers/:id/password     | Parol almashtirish        |
| GET    | /api/products                 | Mahsulotlar ro'yxati      |
| POST   | /api/products                 | Yangi model qo'shish      |
| GET    | /api/production               | Ishlab chiqarish tarixi   |
| POST   | /api/production               | Yangi tayyorlangan tovar  |
| GET    | /api/acts                     | Aktlar ro'yxati           |
| POST   | /api/acts                     | Yangi akt yaratish        |
| GET    | /api/sales                    | Sotuvlar tarixi           |
| POST   | /api/sales                    | Yangi sotuv               |
| GET    | /api/stats                    | Dashboard statistikasi    |
| GET    | /api/alerts                   | Ogohlantirishlar          |

---

## ⚠️ Eslatmalar

- `omborxona.db` fayli avtomatik yaratiladi, o'chirmanng — barcha ma'lumotlar shu yerda.
- Har bir admin o'zining `warehouse_id`siga ega, boshqa omborga aralasha olmaydi.
- Mahsulot 10 donadan kam qolganda ogohlantirishda ko'rinadi.
