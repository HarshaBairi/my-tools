/* Single list of tools: used by the home page and by each tool page. */
const CATEGORIES=[
 {
  "id": "images",
  "name": "Image tools",
  "icon": "IMG",
  "intro": "Resize, edit, upscale, remove backgrounds and read text from pictures."
 },
 {
  "id": "pdf",
  "name": "PDF tools",
  "icon": "PDF",
  "intro": "Compress, merge, split, sign, redact, protect and convert PDFs."
 },
 {
  "id": "documents",
  "name": "Word & documents",
  "icon": "DOC",
  "intro": "Edit and shrink Word files, and turn text into pages."
 },
 {
  "id": "sheets",
  "name": "Spreadsheets",
  "icon": "XLS",
  "intro": "Clean, merge and convert spreadsheet and table files."
 },
 {
  "id": "text",
  "name": "Text & developer tools",
  "icon": "TXT",
  "intro": "Clean and compare text, format JSON, encode and decode."
 },
 {
  "id": "files",
  "name": "File utilities",
  "icon": "ZIP",
  "intro": "Convert, inspect, package and compare files."
 },
 {
  "id": "daily",
  "name": "Everyday tools",
  "icon": "+",
  "intro": "Calculators, converters and generators for daily use."
 },
 {
  "id": "exam",
  "name": "Exam & application",
  "icon": "FORM",
  "intro": "Photo and signature sizes, upload rules and a document checklist."
 },
 {
  "id": "media",
  "name": "Audio & video",
  "icon": "AV",
  "intro": "Convert, trim and extract sound from audio and video files."
 }
];
const TOOL_CATALOG=[
{
"id": "resize-image",
"category": "images",
"title": "Resize or compress an image",
"detail": "Set exact width, height and a maximum size in KB, with crop and preview.",
"icon": "KB",
"page": "photo.html?preset=custom",
"section": "",
"set": {}
},
{
"id": "image-upscaler",
"category": "images",
"title": "Upscale an image",
"detail": "Enlarge a picture 2×, 3× or 4× with smooth interpolation and optional sharpening.",
"icon": "↑",
"page": "image-tools.html",
"section": "image-editor",
"set": {
"sizePreset": "2x"
}
},
{
"id": "image-editor",
"category": "images",
"title": "Edit an image",
"detail": "Adjust brightness, contrast and colour, rotate, crop to fit, and add a caption.",
"icon": "✎",
"page": "image-tools.html",
"section": "image-editor",
"set": {}
},
{
"id": "social-sizes",
"category": "images",
"title": "Social media & print sizes",
"detail": "Crop to a square, story or post size in one step.",
"icon": "▢",
"page": "image-tools.html",
"section": "image-editor",
"set": {
"sizePreset": "square"
}
},
{
"id": "background-remover",
"category": "images",
"title": "Remove an image background",
"detail": "Cut out a person with AI, or remove a plain colour, and save a transparent PNG.",
"icon": "BG",
"page": "image-tools.html",
"section": "background-remover",
"set": {}
},
{
"id": "image-ocr",
"category": "images",
"title": "Read text from an image (OCR)",
"detail": "Recognize English or Hindi text in a photo or scan and copy it.",
"icon": "OCR",
"page": "image-tools.html",
"section": "image-ocr",
"set": {}
},
{
"id": "batch-resize",
"category": "images",
"title": "Resize many images at once",
"detail": "Resize up to 100 images and download them together as a ZIP.",
"icon": "×N",
"page": "image-tools.html",
"section": "batch-image",
"set": {}
},
{
"id": "convert-image",
"category": "images",
"title": "Convert an image to JPG, PNG or WebP",
"detail": "Change the format of a picture and keep its size.",
"icon": "JPG",
"page": "office-tools.html",
"section": "file-converter",
"set": {
"convertTo": "jpg"
}
},
{
"id": "compress-pdf",
"category": "pdf",
"title": "Compress a PDF to a size limit",
"detail": "Get a PDF under 100 KB, 200 KB or any limit your form asks for.",
"icon": "PDF",
"page": "pdf-compress.html",
"section": "",
"set": {}
},
{
"id": "merge-pdf",
"category": "pdf",
"title": "Merge PDFs",
"detail": "Combine several PDF files into one, in the order you choose.",
"icon": "+",
"page": "pdf-tools.html",
"section": "merge",
"set": {}
},
{
"id": "organize-pdf",
"category": "pdf",
"title": "Reorder, delete & rotate pages",
"detail": "Keep only the pages you want, put them in order and rotate them.",
"icon": "↕",
"page": "pdf-tools.html",
"section": "organize",
"set": {}
},
{
"id": "split-pdf",
"category": "pdf",
"title": "Split a PDF into single pages",
"detail": "Save each chosen page as its own PDF file.",
"icon": "✂",
"page": "pdf-tools.html",
"section": "organize",
"set": {
"splitMode": "separate"
}
},
{
"id": "images-to-pdf",
"category": "pdf",
"title": "Images to PDF",
"detail": "Turn JPG and PNG photos into one PDF in A4, Letter or image size.",
"icon": "IMG",
"page": "pdf-tools.html",
"section": "images-to-pdf",
"set": {}
},
{
"id": "pdf-to-images",
"category": "pdf",
"title": "PDF to images",
"detail": "Save each page of a PDF as a JPG or PNG picture.",
"icon": "JPG",
"page": "pdf-tools.html",
"section": "pdf-to-images",
"set": {}
},
{
"id": "sign-pdf",
"category": "pdf",
"title": "Sign, stamp & watermark a PDF",
"detail": "Add a typed signature, note, stamp or watermark to pages.",
"icon": "✍",
"page": "pdf-tools.html",
"section": "pdf-markup",
"set": {}
},
{
"id": "redact-pdf",
"category": "pdf",
"title": "Black out parts of a PDF",
"detail": "Permanently hide sensitive areas so the text cannot be recovered.",
"icon": "▮",
"page": "pdf-tools.html",
"section": "pdf-redact",
"set": {}
},
{
"id": "ocr-pdf",
"category": "pdf",
"title": "Make a scanned PDF searchable",
"detail": "Read text from scanned pages and save a searchable PDF or plain text.",
"icon": "OCR",
"page": "pdf-tools.html",
"section": "pdf-ocr",
"set": {}
},
{
"id": "protect-pdf",
"category": "pdf",
"title": "Add or remove a PDF password",
"detail": "Protect a PDF with a password, or unlock one you know the password for.",
"icon": "🔒",
"page": "pdf-tools.html",
"section": "pdf-password",
"set": {}
},
{
"id": "pdf-to-office",
"category": "pdf",
"title": "Convert a PDF to Word, Excel or PowerPoint",
"detail": "Extract the text of a PDF into an editable file. Layout is not kept.",
"icon": "DOC",
"page": "pdf-tools.html",
"section": "pdf-office-convert",
"set": {}
},
{
"id": "word-editor",
"category": "documents",
"title": "Edit a Word document",
"detail": "Open a .docx, edit its text, then save a clean .docx, print or save as PDF.",
"icon": "DOC",
"page": "office-tools.html",
"section": "word-workbench",
"set": {}
},
{
"id": "compress-docx",
"category": "documents",
"title": "Compress a Word document",
"detail": "Make a .docx file smaller without changing its content.",
"icon": "↓",
"page": "office-tools.html",
"section": "docx-compress",
"set": {}
},
{
"id": "text-to-pages",
"category": "documents",
"title": "Turn text into slides or PDF pages",
"detail": "Paste text and export it as page images or a PDF.",
"icon": "▤",
"page": "office-tools.html",
"section": "slide-tools",
"set": {}
},
{
"id": "spreadsheet-clean",
"category": "sheets",
"title": "Clean, merge & convert spreadsheets",
"detail": "Trim spaces, remove duplicate rows, combine files and save as XLSX, CSV, TSV or JSON.",
"icon": "XLS",
"page": "office-tools.html",
"section": "sheet-workbench",
"set": {}
},
{
"id": "sheet-to-pdf",
"category": "sheets",
"title": "Spreadsheet to PDF",
"detail": "Turn a CSV or Excel table into a PDF table.",
"icon": "PDF",
"page": "office-tools.html",
"section": "sheet-workbench",
"set": {
"sheetFormat": "pdf"
}
},
{
"id": "text-cleaner",
"category": "text",
"title": "Count and clean text",
"detail": "Count words and characters, change case, remove blank lines and find and replace.",
"icon": "Aa",
"page": "text-tools.html",
"section": "text-cleaner",
"set": {}
},
{
"id": "json-tool",
"category": "text",
"title": "JSON formatter & validator",
"detail": "Format, minify and check JSON.",
"icon": "{}",
"page": "text-tools.html",
"section": "json",
"set": {}
},
{
"id": "encode-tool",
"category": "text",
"title": "URL & Base64 encoder",
"detail": "Encode or decode text for links and data.",
"icon": "64",
"page": "text-tools.html",
"section": "encoding",
"set": {}
},
{
"id": "compare-text",
"category": "text",
"title": "Compare two texts",
"detail": "See what changed between two versions of a text.",
"icon": "≠",
"page": "text-tools.html",
"section": "compare",
"set": {}
},
{
"id": "convert-file",
"category": "files",
"title": "Convert a file",
"detail": "Change images, tables and text between common formats.",
"icon": "⇄",
"page": "office-tools.html",
"section": "file-converter",
"set": {}
},
{
"id": "zip-files",
"category": "files",
"title": "Create or extract a ZIP file",
"detail": "Pack files into a ZIP or open a ZIP and download its contents.",
"icon": "ZIP",
"page": "office-tools.html",
"section": "zip-workbench",
"set": {}
},
{
"id": "metadata",
"category": "files",
"title": "View or remove file metadata",
"detail": "See what hidden details a photo, PDF or Word file carries, and save a clean copy.",
"icon": "i",
"page": "office-tools.html",
"section": "metadata-cleaner",
"set": {}
},
{
"id": "file-inspector",
"category": "files",
"title": "Check a file and its SHA-256 fingerprint",
"detail": "See type, size and a fingerprint that proves a file has not changed.",
"icon": "#",
"page": "everyday-tools.html",
"section": "file-info",
"set": {}
},
{
"id": "find-duplicates",
"category": "files",
"title": "Find duplicate files",
"detail": "Compare files to find identical copies.",
"icon": "≡",
"page": "office-tools.html",
"section": "duplicate-files",
"set": {}
},
{
"id": "unit-converter",
"category": "daily",
"title": "Unit converter",
"detail": "Length, weight, temperature, time and data sizes.",
"icon": "⇆",
"page": "everyday-tools.html",
"section": "converter",
"set": {}
},
{
"id": "gst-calculator",
"category": "daily",
"title": "Percentage, discount & GST calculator",
"detail": "Work out discounts, GST and price changes in rupees.",
"icon": "%",
"page": "everyday-tools.html",
"section": "calculator",
"set": {}
},
{
"id": "qr-generator",
"category": "daily",
"title": "QR code generator",
"detail": "Make a QR code for a link or text and download it.",
"icon": "QR",
"page": "everyday-tools.html",
"section": "qr-generator",
"set": {}
},
{
"id": "password-generator",
"category": "daily",
"title": "Password generator",
"detail": "Create a strong random password on your device.",
"icon": "***",
"page": "everyday-tools.html",
"section": "password-generator",
"set": {}
},
{
"id": "date-time",
"category": "daily",
"title": "Date & time helper",
"detail": "Find days between dates and convert time zones.",
"icon": "31",
"page": "everyday-tools.html",
"section": "date-time-tools",
"set": {}
},
{
"id": "color-tools",
"category": "daily",
"title": "Colour picker & palette",
"detail": "Inspect a colour and build matching shades.",
"icon": "◐",
"page": "everyday-tools.html",
"section": "color-tools",
"set": {}
},
{
"id": "exam-photo",
"category": "exam",
"title": "Exam photo & signature resizer",
"detail": "Pick your exam and get a photo or signature at the exact size, with a white background option.",
"icon": "IMG",
"page": "photo.html",
"section": "",
"set": {}
},
{
"id": "exam-guide",
"category": "exam",
"title": "Upload guide for exams & applications",
"detail": "Photo, signature, thumb and document rules, with links to official notices.",
"icon": "?",
"page": "application-prep.html",
"section": "",
"set": {}
},
{
"id": "app-checklist",
"category": "exam",
"title": "Application document checklist",
"detail": "Keep track of which files are ready for your application.",
"icon": "✓",
"page": "everyday-tools.html",
"section": "application-checklist",
"set": {}
},
{
"id": "convert-video",
"category": "media",
"title": "Convert a video or audio file",
"detail": "Change format to MP4, WebM, MKV, MOV, AVI, GIF, MP3, M4A, WAV, OGG or FLAC.",
"icon": "⇄",
"page": "media-tools.html",
"section": "video-convert",
"set": {}
},
{
"id": "trim-video",
"category": "media",
"title": "Trim, join & compress a video",
"detail": "Cut a clip, join clips and save a smaller WebM.",
"icon": "▶",
"page": "media-tools.html",
"section": "video-tools",
"set": {}
},
{
"id": "trim-audio",
"category": "media",
"title": "Trim or join audio",
"detail": "Cut and join audio and export a WAV file.",
"icon": "♪",
"page": "media-tools.html",
"section": "audio-tools",
"set": {}
},
{
"id": "extract-audio",
"category": "media",
"title": "Extract sound from a video",
"detail": "Save the audio of a video as a separate file.",
"icon": "♫",
"page": "media-tools.html",
"section": "extract-audio",
"set": {}
}
];
function toolHref(t){if(t.page.includes('?')||!t.section)return t.page;return t.page+'?tool='+encodeURIComponent(t.id)+'#'+t.section;}
TOOL_CATALOG.forEach(t=>{t.href=toolHref(t);});
