#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path


def run_ffmpeg(video: Path, audio: Path) -> None:
    audio.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video), "-vn", "-acodec", "libmp3lame", "-q:a", "2", str(audio)],
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract audio and transcribe media files with faster-whisper.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--videos-dir", default="videos")
    parser.add_argument("--audio-dir", default="audio")
    parser.add_argument("--transcripts-dir", default="transcripts")
    parser.add_argument("--model", default="Systran/faster-whisper-medium")
    parser.add_argument("--language", default="zh")
    args = parser.parse_args()

    from faster_whisper import WhisperModel

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    videos_dir = Path(args.videos_dir)
    audio_dir = Path(args.audio_dir)
    transcripts_dir = Path(args.transcripts_dir)
    transcripts_dir.mkdir(parents=True, exist_ok=True)

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    index = ["# Transcript Index", ""]

    for item in manifest.get("items", []):
        item_id = item.get("id")
        if not item_id:
            continue
        videos = list(videos_dir.glob(f"{item_id}.*"))
        if not videos:
            index.append(f"- {item_id}: missing video")
            continue
        audio = audio_dir / f"{item_id}.mp3"
        if not audio.exists():
            run_ffmpeg(videos[0], audio)
        out = transcripts_dir / f"{item_id}.md"
        if not out.exists():
            segments, info = model.transcribe(str(audio), language=args.language, vad_filter=True, beam_size=1, best_of=1)
            text = "\n\n".join(" ".join(seg.text.split()) for seg in segments if seg.text.strip())
            title = item.get("title") or item_id
            out.write_text(
                "\n".join([
                    f"# {title}",
                    "",
                    f"- ID: {item_id}",
                    f"- URL: {item.get('url', '')}",
                    f"- Language: {getattr(info, 'language', '')}",
                    "",
                    "## Transcript",
                    "",
                    text,
                    "",
                ]),
                encoding="utf-8",
            )
        index.append(f"- [{item.get('title') or item_id}]({transcripts_dir.name}/{item_id}.md)")

    Path("index.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
