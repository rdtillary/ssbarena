SSB Arena: Android APK via GitHub Actions

1. Unzip. Upload everything to the ROOT of your GitHub repo (Add file > Upload files):
     .github/workflows/build-apk.yml   (hidden folder! if the upload skips it, use
                                         Add file > Create new file, type the path
                                         .github/workflows/build-apk.yml and paste the contents)
     mobile/                            (Android wrapper + signing key)
     app/download/page.tsx              (new Download APK page)
     app/page.tsx                       (replaced: adds the Download APK tab/link)
2. In the repo go to Settings > Actions > General > Workflow permissions
   and select "Read and write permissions". Save.
3. Go to the Actions tab > "Build Android APK" > Run workflow. Takes ~5-8 minutes.
4. When it finishes, it saves public/downloads/ssb-arena.apk in your repo.
   Render redeploys and the file is live at https://YOUR-SITE/downloads/ssb-arena.apk
   and on the /download page.

The app loads https://ssbarena.onrender.com. If you change your domain, edit
mobile/capacitor.config.json ("url") and commit; the APK rebuilds automatically.
Optional icon: add a 1024x1024 PNG at mobile/resources/icon.png.
