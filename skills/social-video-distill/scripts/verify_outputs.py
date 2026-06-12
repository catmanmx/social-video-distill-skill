#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify media distillation output counts.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--videos-dir", default="videos")
    parser.add_argument("--audio-dir", default="audio")
    parser.add_argument("--transcripts-dir", default="transcripts")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    ids = [item.get("id") for item in manifest.get("items", []) if item.get("id")]
    videos_dir = Path(args.videos_dir)
    audio_dir = Path(args.audio_dir)
    transcripts_dir = Path(args.transcripts_dir)

    missing = []
    for item_id in ids:
      if not list(videos_dir.glob(f"{item_id}.*")):
          missing.append({"id": item_id, "type": "video"})
      if not (audio_dir / f"{item_id}.mp3").exists():
          missing.append({"id": item_id, "type": "audio"})
      if not (transcripts_dir / f"{item_id}.md").exists():
          missing.append({"id": item_id, "type": "transcript"})

    result = {
        "expected": len(ids),
        "videos": len([p for p in videos_dir.glob("*") if p.is_file()]),
        "audio": len(list(audio_dir.glob("*.mp3"))),
        "transcripts": len(list(transcripts_dir.glob("*.md"))),
        "missing": missing,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
