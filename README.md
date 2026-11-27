# Oʻzbek Lotin Alifbosi Konvertori (Yangi Imlo Standarti)

Oʻzbek tilining takomillashtirilgan yangi lotin alifbosi (**Ö ö, Ğ ğ, Ş ş, Ç ç**) hamda amaldagi lotin va kirill yozuvlari oʻrtasida tezkor, xavfsiz va aniq transliteratsiya qiluvchi zamonaviy veb-ilova.

---

## 🌟 Asosiy Imkoniyatlar

- **Istalgan yoʻnalish:** Kirill, eski lotin va yangi lotin oʻrtasida har qanday yoʻnalishda. Manba va natija bir-biridan mustaqil tanlanadi.
- **Aralash matnlar:** har bir soʻz oʻz yozuvi boʻyicha alohida aniqlanadi — kirill va lotin aralash hujjatlar, notoʻgʻri tanlangan manba, kirill soʻz ichidagi lotincha homoglif harflar (o, c, p…) ham toʻgʻri oʻgiriladi. URL, e-pochta va xorijiy nomlar (Microsoft Word) oʻzgarmaydi.
- **Word, Excel, PowerPoint formatini 100% saqlash:** XML qayta yigʻilmaydi — faqat `<w:t>`/`<a:t>`/`<t>` ichidagi harflar almashtiriladi. Jadvallar, ustun kengliklari, shrift, rang, kolontitul, rasm va sahifa sozlamalari bayt-bayt oʻz holida qoladi. Word soʻzni bir nechta "run"ga boʻlgan boʻlsa ham har bir harf oʻz formatlashida qoladi.
- **Katta ZIP arxivlar:** 300–400+ hujjatli arxivlar fon oqimida (Web Worker) qayta ishlanadi — sahifa qotmaydi, jarayon koʻrsatkichi va bekor qilish tugmasi bor. Buzilgan fayl butun jarayonni toʻxtatmaydi, hisobotda koʻrsatiladi. Windows'da yaratilgan arxivlardagi kirill fayl nomlari (CP866) toʻgʻri oʻqiladi.
- **Boshqa hujjat formatlari:** LibreOffice (`.odt`, `.ods`, `.odp`), `.rtf` (CP1251 dagi kirill ham), `.html`/`.htm` — faqat matn joylari almashadi, teglar, `script`/`style`/`code`, tahrirlar tarixi va izoh mualliflari tegilmaydi. ODF `mimetype` talabi saqlanadi.
- **RAR, 7z, TAR, GZ arxivlar:** 7-Zip (WebAssembly) bilan brauzerning o'zida ochiladi, natija ZIP bo'ladi. 7-Zip moduli faqat shunday arxiv yuklanganda yuklanadi.
- **Istalgancha fayl va papka:** bir yo'la ko'p fayl tanlash, keyin yana qo'shish yoki butun papkani sudrab tashlash mumkin. Natija bitta ZIP (papka tuzilishi saqlanadi); tanlovdagi ZIP/RAR/7z arxivlar ham ichiga kirib o'giriladi.
- **Matn fayllari:** `.txt`, `.md`, `.csv` — UTF-8, UTF-16 va Windows-1251 kodirovkalari avtomatik taniladi, qator oxirlari saqlanadi.
- **Hujjatni koʻrish (nima oʻzgardi):** oʻgirilgan Word hujjati Word sahifasidagidek ochiladi, oʻzgargan soʻzlar sariq rang bilan belgilanadi (ustiga olib borilsa asl soʻz koʻrinadi), «Asl hujjat» bilan solishtirish va oʻzgarishlar boʻylab ↑/↓ yurish mumkin. Arxivdagi har bir fayl ham shunday ochiladi; Excel, PowerPoint va matn fayllari uchun matn koʻrinishi. Matn rejimida ham oʻzgargan soʻzlar belgilanadi.
- **Markdown:** kiritish maydoni Markdown qabul qiladi (sarlavha, roʻyxat, jadval, kod), natija formatlangan koʻrinishda chiqadi va Word'ga formatlangan holda nusxalanadi. Kod boʻlaklari va havola manzillari oʻgirilmaydi. Kiritish maydoni tepasidagi `</>` tugmasi bilan xom matn (raw) rejimiga oʻtiladi.
- **100% oflayn va maxfiy:** barcha amallar brauzerda bajariladi. Production build'da qatʼiy Content-Security-Policy (`connect-src 'self'`) sahifaning tashqi serverga maʼlumot yuborishini texnik jihatdan taqiqlaydi.

---

## 🛠 Texnologik Stack

- **Frontend:** React 19, TypeScript
- **Stillar:** Tailwind CSS v4, CSS Custom Variables
- **Ikonkalar:** Lucide React
- **Arxiv va Hujjatlar:** JSZip + Web Worker (XML'ga jarrohlik usulida tegish), RTF tahlilchisi, 7-Zip WASM (`7z-wasm`, LGPL + unRAR litsenziyasi)
- **Markdown:** marked + DOMPurify (XSS'dan himoyalangan)
- **Shriftlar:** `@fontsource/inter` (toʻliq lokal, tashqi CDN yoʻq)
- **Yigʻuvchi:** Vite 6
- **Testlash:** Vitest (transliteratsiya yadrosi, Word XML tuzilishi va 400 faylli ZIP testlari)

---

## 💻 Dasturlar (oflayn): Linux, Windows, Android

Sayt dastur sifatida ham ishlaydi — internet umuman kerak emas, hech qanday ma'lumot tashqariga chiqmaydi.

| Platforma | Fayl | O'rnatish |
|---|---|---|
| Linux (har qanday distributiv) | `ozbek-alifbosi-<versiya>-linux-x86_64.AppImage` | Faylga bajarish ruxsatini bering (`chmod +x`) va ishga tushiring |
| Ubuntu / Debian | `ozbek-alifbosi-<versiya>-linux-amd64.deb` | `sudo apt install ./ozbek-alifbosi-*.deb` |
| Windows 10/11 (64-bit) | `ozbek-alifbosi-<versiya>-win-x64.zip` | Arxivni oching va `ozbek-alifbosi.exe` ni ishga tushiring (o'rnatish shart emas) |
| Android 6.0+ | `ozbek-alifbosi-<versiya>.apk` | Telefonga yuboring va oching ("Noma'lum manbalardan o'rnatish"ga ruxsat bering) |

**Xavfsizlik:**
- Desktop: sahifa ichki `app://` protokoli orqali ochiladi, barcha http/https so'rovlari dastur darajasida bekor qilinadi.
- Android: ilovada `INTERNET` ruxsati umuman yo'q — tarmoqqa chiqa olmasligini Android'ning o'zi kafolatlaydi.
- Android'da natija fayllari `Documents/Yangi Alifbo/` papkasiga saqlanadi va "Ulashish" oynasi ochiladi.

**Saytdagi «Yuklab olish» sahifasi** (`#/yuklab-olish`) foydalanuvchining tizimini aniqlab, mos dasturni taklif qiladi;
fayl hajmi va SHA-256 yig'indisi ko'rsatiladi. Ma'lumotlar `src/data/downloads.json` da — dasturlar qayta yig'ilgach
`npm run release:manifest` bilan yangilanadi. Fayllar manzili standart bo'yicha GitHub Releases
(`<homepage>/releases/download/v<versiya>/`); boshqa hosting uchun: `DOWNLOAD_BASE=https://... npm run release:manifest`.

**Yig'ish:**

```bash
npm run dist:linux     # release/ — AppImage va .deb
npm run dist:win       # release/ — Windows ZIP (Wine shart emas)
npm run android:apk    # android/app/build/outputs/apk/release/app-release.apk
```

Android uchun: Android SDK (`ANDROID_HOME`) va JDK 21 kerak. Reliz imzosi `android/keystore.properties`
va `android/keystore/release.jks` da saqlanadi (git'ga kirmaydi). **Bu kalitni xavfsiz joyda zaxiralang** —
usiz ilovaning keyingi versiyasini o'rnatilgan ilova ustidan yangilab bo'lmaydi.

Windows o'rnatuvchisi (`.exe` installer) Linux'da faqat Wine bilan yig'iladi; hozir ko'chma ZIP beriladi.

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
