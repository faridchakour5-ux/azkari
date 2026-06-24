# أذكاري — Azkari

<div dir="rtl">

تطبيق ويب بسيط (PWA) لمتابعة أذكارك اليومية: أذكار الصباح والمساء، وِرد القرآن، والمسبحة — برواية حفص وورش. يعمل دون اتصال بالإنترنت ويمكن تثبيته على الهاتف كتطبيق.

</div>

A simple Progressive Web App (PWA) to keep up with your daily devotions: morning & evening *adhkār* (remembrances), a Qur'an *wird* (daily reading), and a *tasbīḥ* counter — in both Ḥafṣ and Warsh narrations. Works offline and can be installed to your home screen.

## Features / المزايا

- **الأذكار — Adhkar:** Morning and evening remembrances with a progress tracker and source/virtue (الفضل) notes.
- **الوِرد — Wird:** Daily Qur'an reading in the **Ḥafṣ** and **Warsh** narrations.
- **المسبحة — Tasbih:** A tap-anywhere digital counter for dhikr.
- **الإعدادات — Settings:** Choose the narration, switch reading fonts (Naskh, Kufi, Maghribi, Ruqʿah, and more), and adjust text size.
- **Offline & installable:** A service worker caches the app so it works without a connection and installs as a standalone app.
- **Arabic-first:** Fully right-to-left (RTL) interface.

## Usage / الاستخدام

This is a static web app — no build step or server is required.

- **Online:** Open `index.html` in a browser, or visit the deployed site (GitHub Pages).
- **Locally:** Serve the folder so the service worker and fonts load correctly, e.g.:

  ```bash
  python3 -m http.server 8000
  ```

  then open <http://localhost:8000>.

To install it as an app, open it in a mobile browser and choose **Add to Home Screen**.

## Project structure / بنية المشروع

| File | Description |
| --- | --- |
| `index.html` | The app: layout, styles, and logic |
| `data.js` | Adhkar content |
| `wird_hafs.js` / `wird_warsh.js` | Qur'an text (Ḥafṣ & Warsh narrations) |
| `adhan.min.js` | Prayer-time calculations |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (offline caching) |
| `fonts/`, `icons/` | App fonts and icons |

## License / الترخيص

Personal project. Qur'an text and adhkar are reproduced for worship and educational use.
