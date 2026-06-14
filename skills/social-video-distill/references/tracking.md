# Tracking Accounts

Use this reference when the user asks to follow an account, check whether new posts appeared, or process only newly published videos.

## Principle

Tracking has two separate layers:

- Collection: whether the current account page can be read reliably.
- Diffing: whether current item IDs differ from `track_state.json`.

Only trust "no new items" when collection is healthy. If the page returns zero items, login is missing, or previously known latest items are absent, report `check_failed` or `possibly_incomplete` instead of saying there are no updates.

## State Shape

```json
{
  "source_url": "https://example.com/account",
  "known_ids": ["123", "122"],
  "latest_items": [
    { "id": "123", "url": "https://example.com/video/123", "title": "..." }
  ],
  "last_checked_at": "2026-06-14T00:00:00.000Z",
  "last_status": "has_new_items",
  "last_new_ids": ["124"]
}
```

## Check

```powershell
node skills/social-video-distill/scripts/track_check_updates.js `
  --url=https://example.com/account `
  --state=track_state.json `
  --out=run-update-check.json `
  --new-manifest=new-items-manifest.json `
  --profile-dir=browser-profile
```

For Douyin-like pages where account posts arrive through account-specific JSON responses, pass a trusted response filter so recommendations in the DOM are not treated as account posts:

```powershell
node skills/social-video-distill/scripts/track_check_updates.js `
  --url=https://www.example.com/user/... `
  --state=track_state.json `
  --trusted-response-filter=aweme/post `
  --out=run-update-check.json `
  --new-manifest=new-items-manifest.json `
  --profile-dir=browser-profile
```

## Process New Items

When `status` is `has_new_items`, process only `new-items-manifest.json`:

```powershell
python skills/social-video-distill/scripts/download_with_ytdlp.py --manifest=new-items-manifest.json --out-dir=videos
python skills/social-video-distill/scripts/transcribe_media.py --manifest=new-items-manifest.json --videos-dir=videos --audio-dir=audio --transcripts-dir=transcripts
```

If `new-items-manifest.json` contains authorized direct media fields, use:

```powershell
python skills/social-video-distill/scripts/download_direct_media.py --manifest=new-items-manifest.json --out-dir=videos
```

## Commit

Commit tracking state only after download/transcription succeeds:

```powershell
node skills/social-video-distill/scripts/track_ingest_new_items.js `
  --check=run-update-check.json `
  --new-manifest=new-items-manifest.json `
  --manifest=manifest.json `
  --state=track_state.json `
  --commit
```

## Status Meanings

- `has_new_items`: collection looked healthy and new IDs were found.
- `no_new_items`: collection looked healthy and no new IDs were found.
- `initialized`: state did not exist; current items were written as the first baseline candidate.
- `possibly_incomplete`: collection returned items but none of the previous latest IDs appeared.
- `check_failed`: login, page load, or item collection failed.
