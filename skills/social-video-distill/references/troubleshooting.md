# Troubleshooting

## Login Window Closes

Playwright-owned browsers close when the controlling process exits. Keep a wait loop running while the user logs in. Use a dedicated browser profile under the working directory.

## Cookies Cannot Be Decrypted

Modern Chrome may protect cookies with OS or app-bound encryption. Do not fight this by bypassing encryption. Use a visible login session with a dedicated profile, or ask the user to export cookies manually if lawful and appropriate.

## Some Items Are Missing

Compare:

- visible page cards
- collected manifest IDs
- downloaded files
- transcript files

If a visible item is absent from the manifest, rerun visible collection after login and scrolling. If download still fails, ask for a direct authorized URL or local media file.

## Transcripts Are Garbled

Re-run with a larger Whisper model or re-listen manually. Mark the transcript as unusable until corrected if repeated numbers, duplicated fragments, or broken names appear.
