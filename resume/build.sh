#!/bin/sh
# prints resume/resume.html to /resume.pdf with chrome
cd "$(dirname "$0")/.." || exit 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=8000 --print-to-pdf="$PWD/resume.pdf" "file://$PWD/resume/resume.html"
