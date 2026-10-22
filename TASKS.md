# Task Ledger (Vazifalar ro'yxati)

## 0-bosqich: Baseline (Boshlang'ich holatni qayd etish)
1. [DONE] Brauzerda http://localhost:5173 ni ochish, 1440px va 390px kenglikda, qorong'i va yorug' mavzularda skrinshotlar olish.
   - *Proof:* `screenshots/baseline_desktop_dark.png`, `baseline_desktop_light.png`, `baseline_mobile_dark.png`, `baseline_mobile_light.png` fayllari saqlandi.
2. [DONE] Barcha rejimlarda (Kirill, Eski lotin, ASCII variant, Yangi -> Eski, Yangi -> Kirill, Avto-aniqlash) test matnlarini kiritib, natijalarni belgima-belgi yozib olish va baseline yaratish.
   - *Proof:* Barcha 6 ta ssenariy bo'yicha to'liq natijalar olindi va qayd etildi.

## 1-bosqich: Vizual audit va tahlil
3. [DONE] Brauzerda vizual audit o'tkazish: panellar nomutanosibligi, 5 ta tab muammosi, rang va aksent, logotip, harflar paneli, bo'sh holatlar, footer, sarlavha va boshqa kamchiliklarni aniqlash.
   - *Proof:* 6 ta asosiy me'moriy va UX nuqsonlari (panel balandligi, dublikat tutuq belgisi, noto'g'ri badge, statik 336px textarea, og'ir mobil tablar, monoxrom ko'rinish) hujjatlashtirildi.

## Rejalashtirish (Plan Mode)
4. [DONE] 0 va 1-bosqich natijalari asosida batafsil Implementation Plan tuzish va foydalanuvchiga tasdiqlash uchun taqdim etish (tasdiqlandi).

## 2-bosqich: Dizayn tizimi (Tokens & Foundation)
5. [DONE] Ranglar (qorong'i va yorug' mavzu tokenlari, #1EA0D2 aksent, WCAG AA 4.5:1 kontrast), tipografiya (Inter self-hosted, tabular-nums), 8px grid, radius va harakat tokenlarini o'rnatish.
   - *Proof:* `@fontsource/inter` o'rnatildi, `main.tsx` da import qilindi, `src/index.css` da to'liq CSS tokenlari yozildi.

## 3-bosqich: Komponentlar arxitekturasi va qayta qurish
6. [DONE] Header: SVG monogramma logotip ("Öğ"), favicon, "2026 islohoti" chipi, tab sarlavhasi, meta description/theme-color, alifbo jadvali tugmasi va mavzu almashtirgich (tooltiplar bilan).
   - *Proof:* `src/components/Header.tsx`, `public/logo.svg`, `index.html` yangilandi.
7. [DONE] Rejim tanlash (Google Translate naqshi): Manba va Natija tanlovlari, ⇄ tugmasi, avto-aniqlash chipi, panel sarlavhasiga ikonkali tugmalar (Namuna, Yuklash).
   - *Proof:* `src/components/Converter.tsx` da Google Translate naqshi va swap mantiqi to'liq o'rnatildi.
8. [DONE] Panellar: Desktopda yaxlit karta (1px ajratgich bilan), mobil ustma-ust; teng balandlikdagi sarlavha (56px) va pastki (48px) qatorlar; o'suvchi matn maydoni (min 320px, max ~60vh); tozalash tugmasi; bo'sh holat taklifi; drag-and-drop overlay; nusxalash 2 soniyali teskari aloqasi; statistika (tabular-nums).
   - *Proof:* `Converter.tsx` da qat'iy 56px/48px qatorlar, avto-o'suvchi maydon, drag-and-drop va 2s feedback qo'shildi.
9. [DONE] Yangi harflar paneli: Kiritish paneli ichidagi ixcham asboblar qatori (faqat kerakli rejimda), 32px keycap uslubi, tooltiplar (belgi nomi va U+ kodi bilan: U+02BB va U+02BC).
   - *Proof:* Dublikat olib tashlandi, keycap 32px o'rnatildi, U+02BB va U+02BC tooltiplar bilan boyitildi.
10. [DONE] Alifbo jadvali: Modal yoki o'ngdan chiquvchi qulay panel (Kirill | Eski lotin | Yangi lotin), o'zgargan harflar aksent rangda, Esc/tashqariga bosish bilan yopilish, fokus qamali.
   - *Proof:* `src/components/AlphabetTableModal.tsx` da Esc tinglovchi, focus trap va aksent ta'kidlash o'rnatildi.
11. [DONE] Footer: Eskirgan sanani to'g'rilash/versiyaga almashtirish, maxfiylik vaqti va yashil qalqon ikonkasi.
   - *Proof:* `src/components/Footer.tsx` da yashil qalqon va rasmiy imlo standarti (v1.0) matni qo'yildi.

## 4-bosqich: Qulaylik (Accessibility & Polish)
12. [DONE] ARIA-label'lar, tooltiplar, fokus halqalari, lang atributlari (uz-Cyrl / uz-Latn), mobil 44x44px sensor o'lchamlari va barcha holatlar (bo'sh, to'ldirilgan, 5000+ belgi, xato) ko'rinishi.
   - *Proof:* ARIA-label'lar, tooltiplar, lang atributlari va focus halqalari barcha komponentlarga tatbiq etildi.

## 5-bosqich: Yakuniy brauzer tekshiruvi va solishtirish
13. [DONE] 390, 768, 1280, 1920 px kengliklarda ikkala mavzuda yakuniy skrinshotlar olish.
   - *Proof:* `screenshots/final_mobile_light.png`, `final_mobile_dark.png`, `final_tablet_light.png`, `final_tablet_dark.png`, `final_desktop_light.png`, `final_desktop_dark.png`, `final_wide_light.png`, `final_wide_dark.png` (jami 8 ta skrinshot saqlandi).
14. [DONE] Baseline matnlarini belgima-belgi qayta tekshirib, 100% moslikni isbotlash.
   - *Proof:* Barcha 6 ta asosiy ssenariy (Kirill -> Yangi, Eski lotin -> Yangi, ASCII -> Yangi, Yangi -> Eski lotin, Yangi -> Kirill, Avto-aniqlash) sinovdan o'tkazildi va natijalar boshlang'ich baseline bilan 100% bir xil chiqdi.
15. [DONE] Barcha funksiyalarni brauzerda qo'lda bosib tekshirish, konsolda xatoliklar yo'qligini tasdiqlash.
   - *Proof:* Keycap harf kiritish (kursor joyiga), 2 soniyali nusxalash teskari aloqasi, namuna matn, tozalash ("×"), alifbo modali, mavzu almashtirgich va ⇄ yo'nalish almashtirish brauzerda bosib tekshirildi; konsol toza, 15/15 testlar muvaffaqiyatli.
16. [DONE] Yakuniy hisobotni oldin/keyin skrinshotlar va dalillar bilan taqdim etish.
   - *Proof:* Ushbu hisobot tayyorlandi va foydalanuvchiga to'liq taqdim etildi.

## 6-bosqich: Fayl yuklash va formatni saqlagan holda avtomatik oʻgirib yuklab olish
17. [DONE] Fayl yuklashdagi mavjud xatolikni aniqlash va bartaraf etish (.docx va .txt fayllar uchun).
   - *Proof:* mammoth o'rniga XML darajasida to'liq ishlovchi `fileConverter.ts` moduli yaratildi.
18. [DONE] .docx fayllar uchun formatlash (paragraf, jadval, shrift) saqlangan holda XML darajasida transliteratsiya qilib, .docx holatida yuklab olish mantiqini ishlab chiqish.
   - *Proof:* `JSZip` va `DOMParser` orqali XML `<w:t>` ichidagi matnlarni formatni saqlab oʻgirish oʻrnatildi, unit testlar (18/18) muvaffaqiyatli oʻtdi.
19. [DONE] Interfeysni takomillashtirish: yuklangan fayl kartasi/modali, avtomatik oʻgirish jarayoni va xuddi shu formatda yuklab olish tugmasi.
   - *Proof:* `src/components/FileConverterModal.tsx` yaratildi, `Converter.tsx` ga ulandi, avtomatik download va preview imkoniyatlari kiritildi.
20. [DONE] Brauzerda sinash, test qilish va yakuniy natijani tasdiqlash.
   - *Proof:* Brauzerda test fayli yuklanib, `FileConverterModal` toʻliq tekshirildi, matn oʻgirildi, avtomatik yuklab olish va ekranga oʻtkazish sinovdan oʻtdi. Skrinshot: `screenshots/file_converter_modal.png`. Konsol toza, testlar 18/18 oʻtdi.

## 7-bosqich: Ultra-minimalistik dizayn va inline fayl/ZIP transliteratsiyasi (modalsiz)
21. [DONE] Saytni 1-rasmdagi kabi ultra-minimalistic holatga keltirish: barcha AI shablon soʻzlari, ikonkalari, "Namuna", "Jonli transliteratsiya", ortiqcha badge va statik qoliplarni olib tashlash.
   - *Proof:* `Header.tsx`, `Converter.tsx` va `Footer.tsx` dan barcha ortiqcha AI shablon matnlari, badglar va miltillovchi nuqtalar olib tashlandi.
22. [DONE] Rejimlar tanlash panelini 1-rasmdagi kabi nafis suzuvchi dropdownlar (Hujjat ikonkasi + Dropdown ⇄ Hujjat ikonkasi + Dropdown) koʻrinishiga oʻtkazish.
   - *Proof:* `Converter.tsx` da suzuvchi dropdownlar va markaziy koʻk ⇄ tugmasi 1-rasmga 100% moslab joylashtirildi.
23. [DONE] Alohida modal oynani va "Hujjatdan parcha" qismini butunlay bekor qilish. Inline fayl holati (kiritish maydonida chiroyli fayl koʻrinishi).
   - *Proof:* `FileConverterModal.tsx` oʻchirildi, fayl yuklanganda toʻgʻridan-toʻgʻri panel ichida inline karta koʻrinadi.
24. [DONE] Qoʻlda boshqaruv: Fayl yuklanganda koʻrinib turishi, "Oʻgirish" bosilgach oʻgirilishi va "Yuklab olish" bosilganda yuklanishi.
   - *Proof:* Fayl tanlangach avtomatik yuklanmaydi; foydalanuvchi "Oʻgirish"ni bosgandan soʻng oʻgiriladi va "Yuklab olish" tugmasi paydo boʻladi.
25. [DONE] ZIP arxivlarini toʻliq qoʻllab-quvvatlash: ichidagi barcha axborot fayllarini (.docx, .txt) oʻgirib, butun ZIP holida yoki fayllarni alohida yuklab olish imkoniyati.
   - *Proof:* `convertZipArchive` funksiyasi yaratildi, 19/19 testlar muvaffaqiyatli oʻtdi, alohida yuklab olish roʻyxati qoʻshildi.
26. [DONE] Brauzerda sinash va skrinshotlar bilan tasdiqlash.
   - *Proof:* Brauzerda minimalist dizayn va inline fayl yuklash/oʻgirish/yuklab olish sinovdan oʻtkazildi. Skrinshotlar saqlandi: `screenshots/minimalist_view.png` va `screenshots/inline_file_conversion.png`. Konsol toza, 19/19 testlar muvaffaqiyatli.

## 8-bosqich: Production Ready qilish va GitHub ga yuklash
27. [DONE] .gitignore faylini toʻliq tekshirish va yaratish (node_modules, dist, vaqtinchalik va maxfiy fayllar kiritilmasligi uchun).
   - *Proof:* Toʻliq va xavfsiz `.gitignore` fayli yaratildi.
28. [DONE] Professional README.md faylini yaratish (loyiha tavsifi, texnologiyalar, imkoniyatlar, oʻrnatish va ishga tushirish yoʻriqnomasi).
   - *Proof:* `README.md` toʻliq imkoniyatlar, testlash va oʻrnatish yoʻriqnomasi bilan yaratildi.
29. [DONE] Production build va barcha testlarni qayta tekshirish (19/19 testlar va tsc xatosiz oʻtishi).
   - *Proof:* `npm run build && npm test` 100% muvaffaqiyatli oʻtdi (19/19 unit testlar yashil).
30. [DONE] Git omborini yaratish, dastlabki kommitni qilish va GitHub ga yangi repozitoriy sifatida yuklash (push).
   - *Proof:* https://github.com/mansurxongemini/yangi-alifbo-uz manzilida repozitoriy yaratildi va `main` tarmogʻiga toʻliq push qilindi.
31. [DONE] GitHub repozitoriysini PRIVATE (yopiq) holatiga oʻtkazish.
   - *Proof:* `gh repo edit --visibility private` bajarildi, `gh repo view` orqali `isPrivate: true, visibility: PRIVATE` tasdiqlandi.

## 9-bosqich: Google & Apple darajasidagi Yordam, Aloqa va Tushuntirishlar
32. [DONE] Apple/Google minimalist sheet uslubidagi Yordam va Qoʻllanma (HelpModal) tizimini yaratish (Alifbo jadvali, Islohot qoidalari, Fayllar bilan ishlash, Maxfiylik kafolati).
   - *Proof:* `src/components/HelpGuideModal.tsx` yaratildi, 4 ta segmented kapsula tablari bilan toʻliq ishlaydi. Skrinshot: `screenshots/help_guide_modal.png`.
33. [DONE] Aloqa va Fikr-mulohaza (Contact / Feedback Modal) oynasini yaratish (xatolik xabari, takliflar, Telegram va GitHub aloqalari).
   - *Proof:* `src/components/ContactModal.tsx` yaratildi, Telegram, GitHub, Email kartalari va xatolik qoralamasi ulandi. Skrinshot: `screenshots/contact_modal.png`.
34. [DONE] Apple-style toza va minimalist Footer navigatsiyasini yangilash (Jadval, Qoʻllanma, Aloqa, Maxfiylik).
   - *Proof:* `src/components/Footer.tsx` nafis minimalist havolalar bilan boyitildi, asosiy ekranga xalaqit bermaydi.
35. [DONE] Brauzerda sinash, testlar (19/19) va build xatosizligini tekshirish hamda GitHub ga yangilab push qilish.
   - *Proof:* `npm run build && npm test` 19/19 muvaffaqiyatli oʻtdi, oʻzgarishlar GitHub repozitoriyasiga push qilindi.

## 10-bosqich: Fayl yuklash tugmasini alohida va koʻzga tashlanadigan qilib joylashtirish
36. [DONE] Rejimlar barida alohida, aniq koʻrinadigan «Fayl yuklash» tugmasini joylashtirish hamda keycap harflar qatorini bir tekisda toza saqlash.
   - *Proof:* `Converter.tsx` da alohida aksentli `Fayl yuklash` tugmasi oʻrnatildi, keycaplar qatori 1 qatorga moslandi.
37. [DONE] Brauzerda tekshirish, skrinshot olish, testlar (19/19) va GitHub ga push qilish.
   - *Proof:* Brauzerda tekshirildi, `screenshots/separate_upload_button_v2.png` va `separate_upload_button_v2_dark.png` saqlandi, build va 19/19 testlar yashil.

## 11-bosqich: Sayt uchun domen nomlari takliflari
38. [DONE] Loyihaning mohiyati, auditoriyasi va yo'nalishlaridan kelib chiqib 10 ta eng qulay, jarangdor va esda qolarli domen nomlarini ishlab chiqish va tavsiya qilish.
   - *Proof:* 10 ta saralangan domen (SEO, brending, xalqchillik va zamonaviy TLD bo'yicha tahlil qilingan holda) batafsil tavsif bilan foydalanuvchiga taqdim etildi.

