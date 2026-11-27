#!/usr/bin/env bash
# Windows paketini yakunlaydi: .exe ga ikonka/versiya joylaydi va ko'chma ZIP yig'adi.
# (electron-builder buni Linux'da faqat Wine bilan qila oladi.)
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(node -p "require('./package.json').version")
node build/win-resources.mjs release/win-unpacked/ozbek-alifbosi.exe
cd release
rm -f "ozbek-alifbosi-$VER-win-x64.zip"
mv win-unpacked "Ozbek Alifbosi"
zip -qr -9 "ozbek-alifbosi-$VER-win-x64.zip" "Ozbek Alifbosi"
mv "Ozbek Alifbosi" win-unpacked
echo "tayyor: release/ozbek-alifbosi-$VER-win-x64.zip"
