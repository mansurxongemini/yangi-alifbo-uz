# Oʻzbek Lotin Alifbosi Konvertori (Yangi Imlo Standarti)

Oʻzbek tilining takomillashtirilgan yangi lotin alifbosi (**Ö ö, Ğ ğ, Ş ş, Ç ç**) hamda amaldagi lotin va kirill yozuvlari oʻrtasida tezkor, xavfsiz va aniq transliteratsiya qiluvchi zamonaviy veb-ilova.

---

## 🌟 Asosiy Imkoniyatlar

- **Istalgan yoʻnalish:** Kirill, eski lotin va yangi lotin oʻrtasida har qanday yoʻnalishda. Manba va natija bir-biridan mustaqil tanlanadi.
- **Aralash matnlar:** har bir soʻz oʻz yozuvi boʻyicha alohida aniqlanadi — kirill va lotin aralash hujjatlar, notoʻgʻri tanlangan manba, kirill soʻz ichidagi lotincha homoglif harflar (o, c, p…) ham toʻgʻri oʻgiriladi. URL, e-pochta va xorijiy nomlar (Microsoft Word) oʻzgarmaydi.
- **Word, Excel, PowerPoint formatini 100% saqlash:** XML qayta yigʻilmaydi — faqat `<w:t>`/`<a:t>`/`<t>` ichidagi harflar almashtiriladi. Jadvallar, ustun kengliklari, shrift, rang, kolontitul, rasm va sahifa sozlamalari bayt-bayt oʻz holida qoladi. Word soʻzni bir nechta "run"ga boʻlgan boʻlsa ham har bir harf oʻz formatlashida qoladi.
- **Katta ZIP arxivlar:** 300–400+ hujjatli arxivlar fon oqimida (Web Worker) qayta ishlanadi — sahifa qotmaydi, jarayon koʻrsatkichi va bekor qilish tugmasi bor. Buzilgan fayl butun jarayonni toʻxtatmaydi, hisobotda koʻrsatiladi. Windows'da yaratilgan arxivlardagi kirill fayl nomlari (CP866) toʻgʻri oʻqiladi.
- **Matn fayllari:** `.txt`, `.md`, `.csv` — UTF-8, UTF-16 va Windows-1251 kodirovkalari avtomatik taniladi, qator oxirlari saqlanadi.
- **Hujjatni koʻrish (nima oʻzgardi):** oʻgirilgan Word hujjati Word sahifasidagidek ochiladi, oʻzgargan soʻzlar sariq rang bilan belgilanadi (ustiga olib borilsa asl soʻz koʻrinadi), «Asl hujjat» bilan solishtirish va oʻzgarishlar boʻylab ↑/↓ yurish mumkin. Arxivdagi har bir fayl ham shunday ochiladi; Excel, PowerPoint va matn fayllari uchun matn koʻrinishi. Matn rejimida ham oʻzgargan soʻzlar belgilanadi.
- **Markdown:** kiritish maydoni Markdown qabul qiladi (sarlavha, roʻyxat, jadval, kod), natija formatlangan koʻrinishda chiqadi va Word'ga formatlangan holda nusxalanadi. Kod boʻlaklari va havola manzillari oʻgirilmaydi. Kiritish maydoni tepasidagi `</>` tugmasi bilan xom matn (raw) rejimiga oʻtiladi.
- **100% oflayn va maxfiy:** barcha amallar brauzerda bajariladi. Production build'da qatʼiy Content-Security-Policy (`connect-src 'self'`) sahifaning tashqi serverga maʼlumot yuborishini texnik jihatdan taqiqlaydi.

---

## 🛠 Texnologik Stack

- **Frontend:** React 19, TypeScript
- **Stillar:** Tailwind CSS v4, CSS Custom Variables
- **Ikonkalar:** Lucide React
- **Arxiv va Hujjatlar:** JSZip + Web Worker (XML'ga jarrohlik usulida tegish)
- **Markdown:** marked + DOMPurify (XSS'dan himoyalangan)
- **Shriftlar:** `@fontsource/inter` (toʻliq lokal, tashqi CDN yoʻq)
- **Yigʻuvchi:** Vite 6
- **Testlash:** Vitest (transliteratsiya yadrosi, Word XML tuzilishi va 400 faylli ZIP testlari)

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
