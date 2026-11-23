/**
 * Search-facing copy for each tool page: the phrase people actually type (used for
 * the <title> and <h1>), a short specific intro, and real use cases. Unique per page
 * so tool pages aren't thin, near-duplicate content.
 */
export interface ToolSeo {
  /** Search phrase, used as the H1 and the start of the <title>. */
  h1: string;
  intro: string;
  uses: [string, string, string];
}

export const TOOL_SEO: Record<string, ToolSeo> = {
  // PDF
  "pdf-to-docx": {
    h1: "PDF to Word Converter",
    intro: "Turn a PDF into an editable Word document so you can fix a typo, update a CV or reuse text and tables without retyping.",
    uses: ["Edit a contract or form that only came as a PDF", "Update an old CV you only have as a PDF", "Copy tables out of a report into Word"],
  },
  "docx-to-pdf": {
    h1: "Word to PDF Converter",
    intro: "Save a Word document as a PDF that looks the same on every device, ready to email, print or upload to a portal.",
    uses: ["Send a CV or cover letter as a PDF", "Submit assignments that must be PDF", "Share a document that can't be edited by accident"],
  },
  "pdf-merge": {
    h1: "Merge PDF Files",
    intro: "Combine several PDFs into one file in the order you choose. Handy when a form asks for a single upload.",
    uses: ["Join scanned pages into one document", "Combine an application form with its supporting documents", "Put invoices for a month into one file"],
  },
  "pdf-split": {
    h1: "Split PDF",
    intro: "Pull out the pages you need, split every page into its own file, or cut a big PDF into parts small enough to email.",
    uses: ["Send just one chapter of a long PDF", "Separate a scanned batch into individual documents", "Split a large file to get under an upload limit"],
  },
  "pdf-compress": {
    h1: "Compress PDF",
    intro: "Make a PDF smaller while keeping it readable, so it fits through email and upload-size limits.",
    uses: ["Get a scanned document under a portal's size limit", "Email a PDF that's too big to attach", "Save space on documents you archive"],
  },
  "pdf-to-img": {
    h1: "PDF to JPG Converter",
    intro: "Export every PDF page as a high-resolution JPG or PNG image, packed in a ZIP.",
    uses: ["Post a page of a PDF on social media", "Insert a PDF page into slides as an image", "Share a document with someone who can't open PDFs"],
  },
  "xlsx-to-pdf": {
    h1: "Excel to PDF Converter",
    intro: "Turn an Excel sheet or CSV file into clean, paginated PDF tables you can print or share.",
    uses: ["Share a price list or schedule as a PDF", "Print a spreadsheet without fighting page breaks", "Attach data to a report in a fixed format"],
  },
  "md-to-pdf": {
    h1: "Markdown to PDF Converter",
    intro: "Render a Markdown file, including GitHub-style tables and code blocks, into a tidy PDF.",
    uses: ["Share README docs with non-developers", "Turn meeting notes into a PDF handout", "Export documentation for offline reading"],
  },
  "pdf-to-pptx": {
    h1: "PDF to PowerPoint Converter",
    intro: "Turn PDF pages into PowerPoint slides so you can present them or add your own notes.",
    uses: ["Present a PDF report in a meeting", "Reuse pages from a PDF deck", "Add speaker notes to slides that only came as a PDF"],
  },
  "pdf-watermark": {
    h1: "Add Watermark and Page Numbers to PDF",
    intro: "Stamp a text watermark like DRAFT or CONFIDENTIAL across your pages, or add page numbers.",
    uses: ["Mark a document as a draft before sharing", "Number the pages of a thesis or report", "Label copies you send to different people"],
  },
  "pdf-redact": {
    h1: "Redact PDF",
    intro: "Find and black out emails, phone numbers, card numbers and other personal data. Redacted pages are flattened so the text is really gone, not just covered.",
    uses: ["Remove personal details before sharing a bank statement", "Hide customer data in a document you send to support", "Clean up records before publishing them"],
  },
  "pdf-sign": {
    h1: "Sign PDF",
    intro: "Place your signature on any page of a PDF without printing, scanning or creating an account.",
    uses: ["Sign a rental agreement or offer letter", "Approve an invoice or form", "Add your initials to every page"],
  },
  "pdf-unlock": {
    h1: "Unlock PDF and Remove Password",
    intro: "Remove the password from a PDF you can open, or add AES-256 password protection to one you want to keep private.",
    uses: ["Stop typing the password every time you open a bank statement", "Password-protect a document before emailing it", "Make a PDF printable and searchable again"],
  },
  "images-to-pdf": {
    h1: "JPG to PDF Converter",
    intro: "Turn photos and scans into one PDF, one image per page, on A4, Letter or the image's own size.",
    uses: ["Combine phone photos of documents into one PDF", "Submit ID or certificate scans as a single file", "Make a simple photo booklet"],
  },
  "pdf-organize": {
    h1: "Rearrange PDF Pages",
    intro: "Rotate, reorder and delete PDF pages with live thumbnails, then save the result as a new PDF.",
    uses: ["Fix pages that were scanned sideways or upside down", "Move an appendix to the end", "Drop blank or duplicate pages"],
  },
  "pdf-flatten": {
    h1: "Flatten PDF",
    intro: "Lock filled-in form fields into the page so the answers can't be changed and show up in every viewer.",
    uses: ["Send a completed form that can't be edited", "Fix form answers that disappear in some apps", "Archive signed forms as plain pages"],
  },
  "pdf-to-text": {
    h1: "PDF to Text Converter",
    intro: "Extract all the text from a PDF into a plain .txt file, page by page.",
    uses: ["Copy text out of a PDF that won't let you select it cleanly", "Feed a document into another tool or script", "Search and quote from a long report"],
  },

  // Image
  "image-heic": {
    h1: "HEIC to JPG Converter",
    intro: "Convert iPhone HEIC and HEIF photos to JPG or PNG so they open on Windows, Android and any website.",
    uses: ["Upload iPhone photos to a site that rejects HEIC", "Open iPhone photos on a Windows PC", "Share photos with Android friends"],
  },
  "image-compress-kb": {
    h1: "Compress Image to KB",
    intro: "Shrink a photo to an exact size like 20 KB, 50 KB or 200 KB, the limits that exam, job and government portals ask for.",
    uses: ["Get a photo under 50 KB for an application form", "Resize a signature image to 20 KB", "Make images load faster on a website"],
  },
  "image-exif": {
    h1: "Remove EXIF Data and GPS Location",
    intro: "Strip hidden metadata such as GPS location, camera details and dates from photos before you share them.",
    uses: ["Hide your home location before posting a photo", "Remove camera and device info from images", "Clean photos before selling something online"],
  },
  "image-convert": {
    h1: "Convert Images to JPG, PNG or WebP",
    intro: "Convert one image or a whole batch between JPG, PNG and WebP, then download them together as a ZIP.",
    uses: ["Turn WebP downloads into JPGs that open everywhere", "Make PNGs with transparency for design work", "Convert photos to WebP to speed up a website"],
  },
  "image-passport": {
    h1: "Passport Size Photo Maker",
    intro: "Tile a passport photo in standard sizes such as 35×45 mm and 2×2 inch onto a 4×6 or A4 sheet with cut lines, ready to print.",
    uses: ["Print passport photos at a photo kiosk for less", "Make visa or ID photos at home", "Fit several copies on one print"],
  },
  "image-favicon": {
    h1: "Favicon Generator",
    intro: "Create every favicon and app icon size a website needs, from 16 px to 512 px, plus favicon.ico and a web manifest, in one ZIP.",
    uses: ["Add a favicon to a new website", "Make home-screen icons for a web app", "Update a logo across every icon size at once"],
  },
  "image-resize": {
    h1: "Resize Image",
    intro: "Change an image's width and height in pixels, keeping the aspect ratio locked if you want.",
    uses: ["Make a photo fit a profile picture size", "Shrink large photos before emailing", "Prepare images for a blog or store"],
  },
  "image-bg-remove": {
    h1: "Remove Background from Image",
    intro: "AI cuts the person out of a photo and gives you a transparent PNG, or a white, black or blue background. The AI runs on your device, so the photo isn't uploaded.",
    uses: ["Make a clean profile or LinkedIn photo", "Create a white-background photo for an ID or form", "Cut yourself out for a thumbnail or poster"],
  },
  "text-to-image": {
    h1: "Text to Image Maker",
    intro: "Type a quote or message, pick a shader background and a font (Hindi works too) and share it as a picture.",
    uses: ["Share a quote on Instagram or WhatsApp status", "Make a quick announcement graphic", "Turn a thought into a shareable card"],
  },
  "image-crop": {
    h1: "Crop Image",
    intro: "Crop to 1:1, 4:5, 16:9 and other ratios, rotate and flip, with a live preview.",
    uses: ["Make a square photo for a profile picture", "Crop for an Instagram post or story", "Straighten a sideways photo"],
  },
  "image-text": {
    h1: "Add Text to Image",
    intro: "Put a caption, photo credit or tiled watermark on a picture.",
    uses: ["Watermark photos before posting them", "Add a caption to a meme or announcement", "Credit the photographer on an image"],
  },
  "image-colors": {
    h1: "Color Palette from Image",
    intro: "Pull the main colors out of any image and copy their hex codes.",
    uses: ["Match a website's colors to a photo", "Build a brand palette from a mood board", "Find the exact color in a screenshot"],
  },
  "screenshot-beautify": {
    h1: "Screenshot Beautifier",
    intro: "Frame a screenshot on a gradient with padding, rounded corners and a soft shadow, ready to post.",
    uses: ["Share app screenshots on X or LinkedIn", "Make product images for a launch", "Add polish to screenshots in docs"],
  },

  // Video & audio
  "universal-video-downloader": {
    h1: "Video Downloader",
    intro: "Paste a public video link to save it as MP4, or as MP3 for audio only. Only download videos you own or have permission to save.",
    uses: ["Save your own posts and clips", "Keep a copy of a public video you have rights to", "Grab audio from a video you made"],
  },
  "video-to-mp4": {
    h1: "Convert Video to MP4",
    intro: "Convert MOV, WebM, MKV and other videos to MP4, the format that plays on every phone, browser and editor.",
    uses: ["Make iPhone MOV videos play on Windows", "Convert screen recordings for uploading", "Fix videos that won't play in an app"],
  },
  "video-compress-mb": {
    h1: "Compress Video",
    intro: "Shrink a video to a target size, like 8 MB for Discord or 25 MB for email, while keeping it watchable.",
    uses: ["Send a video on Discord without Nitro", "Attach a clip to an email", "Save phone storage"],
  },
  "video-trim": {
    h1: "Trim Video",
    intro: "Cut the start and end of a video quickly without losing quality, or trim exactly to the frame.",
    uses: ["Cut a highlight out of a longer clip", "Remove dead air at the start of a recording", "Shorten a video to fit a time limit"],
  },
  "video-to-gif": {
    h1: "Video to GIF Converter",
    intro: "Turn a video clip into a smooth GIF with your choice of frame rate, width and looping.",
    uses: ["Make a reaction GIF", "Show a product feature in a README or tweet", "Loop a short moment from a video"],
  },
  "audio-extract-convert": {
    h1: "MP4 to MP3 Converter",
    intro: "Extract the audio from a video, or convert audio between MP3, WAV, M4A, OGG and Opus.",
    uses: ["Save the audio of a lecture or podcast video", "Convert a WAV recording to a smaller MP3", "Get a song's audio from your own video"],
  },
  "audio-booster": {
    h1: "Increase Audio Volume",
    intro: "Make quiet recordings louder, or normalize the loudness so everything plays at a steady level.",
    uses: ["Fix a voice note that's too quiet", "Boost a lecture recording", "Even out volume across podcast clips"],
  },
  "screen-recorder": {
    h1: "Screen Recorder",
    intro: "Record your screen, a window or a browser tab with microphone and system sound, right in the browser. No install, no watermark, no time limit.",
    uses: ["Record a tutorial or bug report", "Capture a presentation with your voice", "Save a video call or demo"],
  },
  "transcribe-audio": {
    h1: "Transcribe Audio to Text",
    intro: "Turn recordings, voice notes, lectures and videos into text with Whisper AI, in 99 languages including Hindi. It runs on your device, so recordings aren't uploaded.",
    uses: ["Get notes from a lecture or meeting recording", "Turn a voice note into text you can search", "Transcribe an interview for an article"],
  },
  "auto-subtitles": {
    h1: "Subtitle Generator",
    intro: "Create SRT and VTT subtitles for any video with AI, or translate speech into English subtitles, then preview them on your video.",
    uses: ["Add captions to Reels, Shorts and YouTube videos", "Make videos accessible for viewers who are deaf or hard of hearing", "Translate a video's speech into English subtitles"],
  },
  "video-mute": {
    h1: "Remove Audio from Video",
    intro: "Strip the sound from a video without re-encoding, so the picture stays exactly the same.",
    uses: ["Remove background noise or music before posting", "Make a silent clip for a presentation", "Remove copyrighted music from your own video"],
  },
  "audio-trim": {
    h1: "Audio Cutter and Ringtone Maker",
    intro: "Cut a section of a song or recording with fade in and fade out, and save it as MP3 or as an iPhone ringtone (M4R).",
    uses: ["Make a ringtone from your favorite song", "Cut a clip from a podcast", "Trim silence from a recording"],
  },
  "video-speed": {
    h1: "Change Video Speed",
    intro: "Speed up or slow down a video from 0.25× to 4×, with the audio pitch kept natural.",
    uses: ["Make a time-lapse from a long clip", "Slow down a sports or dance move", "Speed up a tutorial recording"],
  },
  "video-rotate": {
    h1: "Rotate Video",
    intro: "Fix sideways or upside-down phone videos by rotating 90° or 180°, or flip them.",
    uses: ["Fix a video recorded in the wrong orientation", "Mirror a selfie video", "Turn a landscape clip for vertical viewing"],
  },
  "voice-recorder": {
    h1: "Online Voice Recorder",
    intro: "Record your microphone in the browser and save it as WebM or MP3. Nothing is uploaded.",
    uses: ["Record a voice memo or quick idea", "Practice a speech or presentation", "Record a voice-over for a video"],
  },

  // Data & archives
  "archive-zip": {
    h1: "Zip and Unzip Files",
    intro: "Open ZIP files to get what's inside, or pack several files into one ZIP, without installing anything.",
    uses: ["Open a ZIP on a computer without an unzip app", "Bundle files to send as one attachment", "Pull one file out of a large archive"],
  },
  "data-convert": {
    h1: "JSON to CSV Converter",
    intro: "Convert data between JSON, CSV and Excel (XLSX) instantly.",
    uses: ["Open API data in Excel or Google Sheets", "Turn a spreadsheet into JSON for an app", "Convert a CSV export to XLSX"],
  },
  "file-hash": {
    h1: "Checksum Calculator (SHA-256, MD5)",
    intro: "Calculate SHA-256, SHA-1 and MD5 checksums to check that a download or backup hasn't been changed or corrupted.",
    uses: ["Verify a downloaded installer matches the published hash", "Check a backup copy is identical", "Compare two files without opening them"],
  },
  "qr-studio": {
    h1: "QR Code Generator",
    intro: "Make QR codes for links, Wi-Fi, UPI payments and contacts, and download them as PNG or SVG. No sign-up, and the codes never expire.",
    uses: ["Share your Wi-Fi with guests", "Put a UPI payment QR on your shop counter", "Add a link QR code to a poster or menu"],
  },

  // Text & dev
  "word-counter": {
    h1: "Word Counter",
    intro: "Count words, characters, sentences and paragraphs as you type, with reading and speaking time.",
    uses: ["Stay within an essay or application word limit", "Check a post fits a character limit", "Time a speech"],
  },
  "case-converter": {
    h1: "Case Converter",
    intro: "Change text to UPPER, lower, Title or Sentence case, or camelCase, snake_case, kebab-case and URL slugs.",
    uses: ["Fix text typed with Caps Lock on", "Format headings in title case", "Turn names into variable names or URL slugs"],
  },
  "json-formatter": {
    h1: "JSON Formatter and Validator",
    intro: "Pretty-print, minify or sort JSON, and see exactly which line and column an error is on.",
    uses: ["Read a minified API response", "Find the syntax error in a config file", "Sort keys to compare two JSON files"],
  },
  "base64-tool": {
    h1: "Base64 Encode and Decode",
    intro: "Encode or decode Base64, UTF-8 safe and with a URL-safe option, and turn files into data URLs.",
    uses: ["Decode a Base64 string from an API or email", "Embed a small image as a data URL", "Encode credentials for an HTTP header"],
  },
  "url-encoder": {
    h1: "URL Encode and Decode",
    intro: "Encode or decode URLs and see each part, including every query parameter.",
    uses: ["Read a long tracking link", "Encode text safely for a query string", "Debug a redirect URL"],
  },
  "uuid-password": {
    h1: "Password Generator",
    intro: "Create strong random passwords with a strength estimate, and generate UUID v4s in bulk. Generated on your device, never sent anywhere.",
    uses: ["Make a strong password for a new account", "Generate test IDs for a database", "Create a Wi-Fi password that's hard to guess"],
  },
  "timestamp-converter": {
    h1: "Unix Timestamp Converter",
    intro: "Convert Unix time in seconds or milliseconds to a readable date and back, with a live clock.",
    uses: ["Read timestamps in logs", "Set an expiry time in an API request", "Check when a record was created"],
  },
  "text-diff": {
    h1: "Text Compare (Diff Checker)",
    intro: "Compare two texts line by line or word by word, with additions and removals highlighted.",
    uses: ["See what changed between two drafts", "Compare two config files", "Check edits made to a contract"],
  },

  // P2P
  "p2p-transfer": {
    h1: "Send Large Files Peer to Peer",
    intro: "Send files directly from one browser to another over an encrypted connection, with no upload to a server and no size cap from us.",
    uses: ["Send a large video to a friend", "Move files between your phone and computer", "Share files without a cloud account"],
  },
};

/** Category landing pages: /pdf-tools, /image-tools, ... */
export const CATEGORY_PAGES = {
  "pdf-tools": {
    category: "pdf",
    h1: "Free PDF Tools",
    title: "Free PDF Tools: Merge, Compress, Convert, No Upload",
    intro: "Merge, split, compress, sign, unlock and convert PDFs right in your browser. Your documents are processed on your device and never uploaded.",
  },
  "image-tools": {
    category: "image",
    h1: "Free Image Tools",
    title: "Image Tools: Compress, Convert, Remove Background",
    intro: "Compress photos to an exact KB size, convert HEIC to JPG, remove backgrounds with on-device AI, crop, resize and more. Photos never leave your device.",
  },
  "video-audio-tools": {
    category: "media",
    h1: "Free Video and Audio Tools",
    title: "Video and Audio Tools: Compress, Trim, Transcribe",
    intro: "Compress and trim videos, convert MP4 to MP3, make ringtones, record your screen and transcribe audio with AI, all in your browser.",
  },
  "file-tools": {
    category: "data",
    h1: "Free File and Data Tools",
    title: "Free File Tools: Zip, Unzip, JSON to CSV, QR Codes",
    intro: "Zip and unzip files, convert JSON, CSV and Excel, check file checksums and make QR codes, without uploading anything.",
  },
  "text-tools": {
    category: "text",
    h1: "Free Text and Developer Tools",
    title: "Free Text and Developer Tools: JSON, Base64, Diff",
    intro: "Word counter, case converter, JSON formatter, Base64 and URL encoding, password generator, timestamp converter and text diff. Instant and private.",
  },
} as const;

export type CategorySlug = keyof typeof CATEGORY_PAGES;
