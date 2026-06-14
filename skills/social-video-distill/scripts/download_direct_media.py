#!/usr/bin/env python3
import argparse
import json
import urllib.request
from pathlib import Path


def pick_url(item: dict) -> str:
    return item.get("direct_url") or item.get("best_url") or item.get("media_url") or ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Download authorized direct media URLs from a manifest.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", default="videos")
    parser.add_argument("--extension", default="mp4")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []

    opener = urllib.request.build_opener()
    opener.addheaders = [
        ("User-Agent", "Mozilla/5.0"),
        ("Accept", "*/*"),
    ]

    for item in manifest.get("items", []):
        item_id = str(item.get("id") or item.get("source_id") or len(results) + 1)
        url = pick_url(item)
        if not url:
            results.append({"id": item_id, "status": "missing_direct_url"})
            continue
        dest = out_dir / f"{item_id}.{args.extension}"
        if dest.exists() and dest.stat().st_size > 0:
            results.append({"id": item_id, "status": "exists", "bytes": dest.stat().st_size})
            continue
        part = dest.with_suffix(dest.suffix + ".part")
        with opener.open(url, timeout=120) as response, part.open("wb") as handle:
            handle.write(response.read())
        part.replace(dest)
        results.append({"id": item_id, "status": "downloaded", "bytes": dest.stat().st_size})

    print(json.dumps({"downloaded": results}, ensure_ascii=False, indent=2))
    return 0 if all(r["status"] in {"downloaded", "exists"} for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
