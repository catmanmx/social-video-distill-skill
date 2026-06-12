#!/usr/bin/env python3
import argparse
from datetime import date
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an inbox-ready Markdown card from transcript files.")
    parser.add_argument("--title", required=True)
    parser.add_argument("--source-url", default="")
    parser.add_argument("--author", default="")
    parser.add_argument("--transcripts-dir", default="transcripts")
    parser.add_argument("--out", default="inbox-card.md")
    args = parser.parse_args()

    transcripts = sorted(Path(args.transcripts_dir).glob("*.md"))
    lines = [
        "---",
        "type: inbox",
        "status: pending",
        f"created: {date.today().isoformat()}",
        "tags:",
        "  - video-distill",
        "---",
        "",
        f"# {args.title}",
        "",
        "## Source",
        "",
        f"- URL: {args.source_url}",
        f"- Author: {args.author}",
        f"- Date: {date.today().isoformat()}",
        f"- Transcript files: {len(transcripts)}",
        "",
        "## Summary",
        "",
        "TODO: summarize the distilled material.",
        "",
        "## Reusable Ideas",
        "",
        "TODO: extract reusable ideas.",
        "",
        "## Risks / Claims To Verify",
        "",
        "- Platform rules, recommendation algorithms, monetization thresholds, legal/tax/finance claims, and copyright/IP issues should be verified before reuse.",
        "",
        "## Transcript Index",
        "",
    ]
    for path in transcripts:
        lines.append(f"- [{path.stem}]({args.transcripts_dir}/{path.name})")
    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
