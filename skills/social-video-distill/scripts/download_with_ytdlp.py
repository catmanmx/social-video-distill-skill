#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
from pathlib import Path


def ytdlp_command() -> list[str]:
    if shutil.which("yt-dlp"):
        return ["yt-dlp"]
    if shutil.which("uvx"):
        return ["uvx", "yt-dlp"]
    raise SystemExit("yt-dlp not found. Install yt-dlp or uv, or provide local media files.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Download authorized media URLs from a manifest.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", default="videos")
    parser.add_argument("--cookies", default="")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    base_cmd = ytdlp_command()

    results = []
    for item in manifest.get("items", []):
        url = item.get("url")
        if not url:
            continue
        item_id = item.get("id") or "%03d" % (len(results) + 1)
        template = str(out_dir / f"{item_id}.%(ext)s")
        cmd = [*base_cmd, "--no-playlist", "-o", template]
        if args.cookies:
            cmd.extend(["--cookies", args.cookies])
        cmd.append(url)
        proc = subprocess.run(cmd, text=True)
        results.append({"id": item_id, "url": url, "returncode": proc.returncode})

    print(json.dumps({"downloaded": results}, ensure_ascii=False, indent=2))
    return 0 if all(r["returncode"] == 0 for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
