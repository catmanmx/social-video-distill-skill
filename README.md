# Social Video Distill Skill

An open Codex skill for turning authorized social-video sources into local transcripts, review notes, and inbox-ready knowledge cards.

This repository packages a reusable workflow, not a scraping bypass. It is intended for content you own, content you are authorized to process, or content a platform explicitly allows you to export. It avoids hidden anti-bot bypasses, does not ship cookies or browser profiles, and keeps all generated media/transcripts local unless the user chooses otherwise.

## What It Does

- Opens a visible browser session when login is required.
- Collects visible video links and lightweight metadata from a user-provided page.
- Downloads authorized media through user-provided URLs or optional `yt-dlp`.
- Extracts audio with `ffmpeg`.
- Transcribes audio with `faster-whisper`.
- Verifies output counts.
- Tracks authorized accounts and processes only newly discovered items.
- Generates a review/inbox material card for later knowledge-base cleanup.

## Safety Boundaries

- Do not use this skill to bypass CAPTCHA, paywalls, access controls, rate limits, or platform anti-abuse systems.
- Do not commit cookies, Chrome profiles, downloaded videos, generated audio, transcripts from private sources, or user-specific paths.
- Treat platform rules, recommendation algorithms, monetization programs, and legal/tax claims as material requiring verification.
- Use visible user-driven login only; never print cookie values.

## Install As A Codex Skill

Copy `skills/social-video-distill` into your Codex skills directory:

```powershell
Copy-Item -Recurse .\skills\social-video-distill "$env:USERPROFILE\.codex\skills\social-video-distill"
```

Then start a new Codex session and ask:

```text
Use $social-video-distill to distill this authorized video account into transcripts and an inbox card.
```

For update tracking:

```text
Use $social-video-distill to check this authorized account for new videos and process only the new items.
```

## Requirements

- Node.js 18+ for Playwright scripts.
- Python 3.10+ for download/transcription helpers.
- `ffmpeg` on `PATH` for audio extraction.
- Optional: `yt-dlp` or `uvx yt-dlp` for platform-supported downloads.
- Optional: `faster-whisper` for local transcription.

Install helpers:

```powershell
npm install
python -m pip install -r requirements.txt
```

## License

MIT.
