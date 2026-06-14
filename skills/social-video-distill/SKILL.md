---
name: social-video-distill
description: Distill and track authorized social-video accounts or local video collections into downloaded media, audio, transcripts, content-review notes, and inbox-ready Markdown material cards. Use when the user asks to process short-form/social videos, extract video lists, transcribe posts, follow/track account updates, process only newly published items, review scripts for logic or factual risk, or save distilled content into a knowledge inbox. Only use for content the user owns, is authorized to process, or can access under platform rules; do not bypass CAPTCHA, paywalls, access controls, anti-bot controls, or platform restrictions.
---

# Social Video Distill

## Core Rule

Process only authorized content. Keep login visible and user-driven. Never print, paste, or commit cookies, browser profiles, access tokens, private URLs, downloaded media, or private transcripts.

## Workflow

1. Clarify source and scope:
   - account/profile URL, playlist URL, local video folder, or user-provided URL list
   - target count
   - output directory
   - whether to produce review notes, transcripts, or a knowledge-inbox card

2. Prepare outputs:
   - `videos/`
   - `audio/`
   - `transcripts/`
   - `manifest.json`
   - `index.md`

3. If login is required:
   - run `scripts/visible_login_wait.js`
   - use a dedicated browser profile under the working directory
   - ask the user to log in in the visible window
   - export cookies only to a local ignored file if needed
   - do not display cookie values

4. Collect visible links and metadata:
   - prefer user-provided URLs or local files
   - otherwise run `scripts/collect_visible_links.js`
   - collect only visible page links and lightweight metadata
   - do not implement hidden signing, anti-bot bypasses, CAPTCHA solving, or reverse-engineered private endpoints

5. Download authorized media:
   - use user-provided direct media files when available
   - optionally use `yt-dlp` for URLs that the user is authorized to download
   - if platform rules or tool errors require fresh cookies, stop and ask for a visible-login path or user-provided files

6. Extract and transcribe:
   - run `scripts/transcribe_media.py`
   - use `ffmpeg` for audio extraction
   - use `faster-whisper` when available

7. Verify:
   - run `scripts/verify_outputs.py`
   - compare manifest items, videos, audio, transcripts, and index links
   - report missing items explicitly

8. Review and capture:
   - for script/content review, read `references/review-rubric.md`
   - for knowledge-base capture, read `references/inbox-capture.md`
   - generate an inbox card with claims, risks, reusable ideas, and next actions

## Tracking Workflow

Use tracking when the user asks to follow an account, check for updates, process only new posts, or "追更".

1. Read `references/tracking.md`.
2. Run `scripts/track_check_updates.js` with a state file and account URL.
3. Treat results conservatively:
   - `has_new_items`: process the generated new-items manifest.
   - `no_new_items`: report no new content.
   - `check_failed` or `possibly_incomplete`: do not say there are no updates; explain why the check is unreliable.
4. Download and transcribe only the new-items manifest.
5. After successful processing, run `scripts/track_ingest_new_items.js --commit` to merge new items into `manifest.json` and `track_state.json`.

## Scripts

- `scripts/visible_login_wait.js`: open a visible Playwright Chrome session and optionally export cookies for allowed domains without printing values.
- `scripts/collect_visible_links.js`: collect visible links from a page into a manifest.
- `scripts/download_with_ytdlp.py`: download authorized URLs from a manifest using `yt-dlp` or `uvx yt-dlp`.
- `scripts/download_direct_media.py`: download authorized direct media URLs from manifest fields such as `direct_url` or `best_url`.
- `scripts/transcribe_media.py`: extract audio and create Markdown transcripts.
- `scripts/verify_outputs.py`: verify expected output counts.
- `scripts/make_inbox_card.py`: create an inbox-ready Markdown review card from transcripts.
- `scripts/track_check_updates.js`: check an authorized account page for newly visible/captured items against `track_state.json`.
- `scripts/track_ingest_new_items.js`: write a new-items manifest and optionally commit processed items into `manifest.json` and `track_state.json`.

## Review Defaults

Flag these issues in distilled scripts:

- transcription mistakes that change meaning
- unsupported platform-rule claims
- algorithm claims stated as official facts
- legal, tax, medical, investment, or financial advice without sources
- over-absolute language such as "must", "always", "guaranteed", "official algorithm"
- copyright or character/IP risks in reusable content

## Failure Handling

If collection or download fails:

- identify whether the issue is missing login, missing permission, tool support, expired cookies, or platform restriction
- prefer user-visible login, user-provided files, or manual URL export
- do not add evasion logic
- keep partial outputs and index missing items clearly
