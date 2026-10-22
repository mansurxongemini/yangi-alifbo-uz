# Oʻzbek Lotin Alifbosi Konvertori (Yangi Imlo Standarti)

Oʻzbek tilining takomillashtirilgan yangi lotin alifbosi (**Ö ö, Ğ ğ, Ş ş, Ç ç**) hamda amaldagi lotin va kirill yozuvlari oʻrtasida tezkor, xavfsiz va aniq transliteratsiya qiluvchi zamonaviy veb-ilova.

---

## 🌟 Asosiy Imkoniyatlar

- **100% Oflayn va Maxfiy:** Barcha amallar faqat foydalanuvchining oʻz brauzerida bajariladi. Hech qanday maʼlumot serverga yuborilmaydi yoki tashqi tarmoqqa chiqmaydi.
- **Word (.docx) Hujjatlarini Formatini Saqlab Oʻgirish:**
  - Hujjat ichidagi barcha jadvallar, ranglar, shriftlar, paragraflar va tasvirlar **100% oʻz holida saqlanadi**.
  - Faqat matn qatlamlari transliteratsiya qilinib, tayyor `.docx` (Word) hujjati sifatida yuklab beriladi.
- **ZIP Arxivlarini Toʻliq Qoʻllab-quvvatlash:**
  - `.zip` arxiv yuklanganda ichidagi barcha axborot fayllari (`.docx`, `.txt`) avtomatik oʻgiriladi.
  - Yangi arxivni toʻliq `.zip` holida yoki ichidagi har bir faylni alohida-alohida yuklab olish imkoniyati.
- **Matnli (.txt) Fayllar:** Istalgan matnli faylni tezkor oʻgirib beradi.
- **Ultra-Minimalistik va Intuitiv Dizayn:**
  - Matnni asosiy oʻringa qoʻyuvchi, chalgʻitmaydigan sokin interfeys.
  - Google Translate uslubidagi qulay yoʻnalish almashtirish (⇄).
  - Klaviaturada boʻlmagan yangi harflar uchun ixcham keycap tugmalari (`Ö`, `Ğ`, `Ş`, `Ç`, `ʻ`, `ʼ`, `-`).
  - Qorongʻi (Dark) va Yorugʻ (Light) mavzular.
- **Imlo Qoidalariga Qatʼiy Muvofiqlik:**
  - Oʻ va Gʻ harflari uchun maxsus teskari modifikator `ʻ` (U+02BB).
  - Tutuq belgisi uchun `ʼ` (U+02BC).
  - Istisnolar va avto-aniqlash lugʻati.

---

## 🛠 Texnologik Stack

- **Frontend:** React 19, TypeScript
- **Stillar:** Tailwind CSS v4, CSS Custom Variables
- **Ikonkalar:** Lucide React
- **Arxiv va Hujjatlar:** JSZip (Word XML darajasida tahlil qilish va qayta yigʻish)
- **Shriftlar:** `@fontsource/inter` (toʻliq lokal, tashqi CDN yoʻq)
- **Yigʻuvchi:** Vite 6
- **Testlash:** Vitest (19 ta avtomatlashtirilgan unit testlar)

---

## 🚀 Oʻrnatish va Ishga Tushirish

### 1. Repozitoriyni klonlash:
```bash
git clone https://github.com/mansurxongemini/yangi-alifbo-uz.git
cd yangi-alifbo-uz
```

### 2. Bogʻliqliklarni oʻrnatish:
```bash
npm install
```

### 3. Dasturchi rejimida ishga tushirish (Dev):
```bash
npm run dev
```
Brauzerda `http://localhost:5173/` manzilini oching.

### 4. Testlarni ishga tushirish:
```bash
npm test
```

### 5. Production uchun yigʻish (Build):
```bash
npm run build
```
Tayyor statik fayllar `dist/` papkasida hosil boʻladi.

---

## 📄 Litsenziya

MIT License. Oʻzbekiston Respublikasi fuqarolari, idoralari va dasturchilari erkin foydalanishi mumkin.
