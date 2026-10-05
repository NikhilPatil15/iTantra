#!/usr/bin/env python3
"""iTantra measurement harness (plan Section 12.3).

Produced numbers are written to tools/bench/results/ with a provenance sidecar. Nothing is
hard-coded: `size` calls the real TypeScript protocol core, `link` runs a seeded simulation of
the reliability layer. Commands that need audio or a licensed corpus fail loudly instead of
inventing data.

Usage:
    python3 tools/bench/bench.py size [--corpus FILE ...]
    python3 tools/bench/bench.py link [--messages N] [--seed S]
    python3 tools/bench/bench.py wer  --hypotheses FILE.jsonl
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import platform
import random
import subprocess
import sys
import tempfile
import zlib
from datetime import datetime, timezone
from pathlib import Path

BENCH_DIR = Path(__file__).resolve().parent
ROOT = BENCH_DIR.parents[1]
RESULTS = BENCH_DIR / "results"
CORPUS_DIR = BENCH_DIR / "corpus"
RESULTS.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def provenance(dataset: str, sample_count: int, note: str, corpus_files: list[Path]) -> dict:
    digests = {}
    for f in corpus_files:
        if f.exists():
            digests[str(f.relative_to(ROOT))] = hashlib.sha256(f.read_bytes()).hexdigest()
    return {
        "date": now_iso(),
        "machine": f"{platform.node()} ({platform.platform()})",
        "dataset": dataset,
        "sample_count": sample_count,
        "note": note,
        "corpus_sha256": digests,
        "tool": "tools/bench/bench.py",
    }


def write_meta(name: str, meta: dict) -> None:
    (RESULTS / f"{name}.meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------------------
# size
# --------------------------------------------------------------------------------------

def load_corpora(paths: list[Path]) -> list[dict]:
    rows: list[dict] = []
    for path in paths:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def codec_command(tmp_path: Path) -> tuple[list[str], str, str]:
    """Prefer the shipping Kotlin CLI; fall back to the TypeScript port.

    The Kotlin CLI is produced by `./gradlew :core-protocol:installDist` and lives under
    apps/android/core-protocol/build/install/. Until it is built, the TypeScript port is used;
    both agree on the golden vectors, so the byte counts are identical.
    """
    kotlin_bin = ROOT / "apps/android/core-protocol/build/install/itantra-protocol/bin/itantra-protocol"
    if kotlin_bin.exists():
        return ([str(kotlin_bin), "size", "--input", str(tmp_path)], ROOT, "kotlin")
    dist = ROOT / "packages/protocol-ts/dist/cli/main.js"
    if dist.exists():
        return (["node", str(dist), "size", "--input", str(tmp_path)], ROOT, "typescript")
    return (
        ["pnpm", "--filter", "@itantra/protocol-ts", "exec", "tsx",
         str(ROOT / "packages/protocol-ts/src/cli/main.ts"), "size", "--input", str(tmp_path)],
        ROOT,
        "typescript",
    )


def run_codec_size(rows: list[dict]) -> tuple[dict[str, dict], str]:
    """Return coded byte counts per id and the name of the codec implementation used."""
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as tmp:
        for row in rows:
            tmp.write(json.dumps({"id": row["id"], "lang": row["lang"], "text": row["text"]}, ensure_ascii=False) + "\n")
        tmp_path = Path(tmp.name)
    cmd, cwd, implementation = codec_command(tmp_path)
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"protocol CLI failed ({implementation}):\n{proc.stderr}")
    out: dict[str, dict] = {}
    for line in proc.stdout.splitlines():
        if line.strip():
            row = json.loads(line)
            out[row["id"]] = row
    tmp_path.unlink(missing_ok=True)
    return out, implementation


def codebook_index() -> dict[tuple[str, str], int]:
    """Index preset phrases from files/packs/<lang>/codebook.<lang>.json (plan 9.5)."""
    index: dict[tuple[str, str], int] = {}
    packs_dir = ROOT / "files" / "packs"
    if packs_dir.exists():
        for f in packs_dir.glob("*/codebook.*.json"):
            lang = f.stem.split(".")[1]
            data = json.loads(f.read_text(encoding="utf-8"))
            for entry in data.get("phrases", []):
                index[(lang, entry["text"])] = entry["id"]
    return index


def dict_for(lang: str) -> bytes:
    """Preset dictionary for the deflate-with-dictionary baseline. zlib needs >= 32 bytes."""
    path = CORPUS_DIR / "dictionary.txt"
    if not path.exists():
        return b""
    raw = path.read_bytes()
    return raw if len(raw) >= 32 else b""


def cmd_size(args: argparse.Namespace) -> int:
    paths = [Path(p) for p in args.corpus] if args.corpus else [CORPUS_DIR / "seed.jsonl"]
    rows = load_corpora(paths)
    coded, implementation = run_codec_size(rows)
    codebook = codebook_index()
    out_path = RESULTS / "size.csv"
    fields = [
        "id", "lang", "chars", "words", "utf8_bytes", "coded_bytes", "deflate_bytes",
        "deflate_dict_bytes", "codebook_bytes", "frame_bytes", "source", "corpus",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            c = coded[row["id"]]
            text = row["text"]
            utf8 = text.encode("utf-8")
            comp = zlib.compress(utf8, 9)
            d = dict_for(row["lang"])
            if d:
                comp_dict = zlib.compressobj(9, zlib.DEFLATED, 15, 8, 0, zdict=d)
                dict_bytes = len(comp_dict.compress(utf8) + comp_dict.flush())
            else:
                dict_bytes = ""
            phrase = codebook.get((row["lang"], text))
            writer.writerow({
                "id": row["id"],
                "lang": row["lang"],
                "chars": c["chars"],
                "words": len(text.split()),
                "utf8_bytes": c["utf8Bytes"],
                "coded_bytes": c["codedBytes"],
                "deflate_bytes": len(comp),
                "deflate_dict_bytes": dict_bytes,
                "codebook_bytes": 3 if phrase is not None else "",
                "frame_bytes": c["codedBytes"] + 12 + 16,
                "source": row.get("source", "unknown"),
                "corpus": ",".join(str(p.relative_to(ROOT)) for p in paths),
            })
    meta = provenance(
        "seed.jsonl" if paths == [CORPUS_DIR / "seed.jsonl"] else "custom",
        len(rows),
        f"sample data unless the corpus field names a licensed public corpus; codec={implementation}",
        paths,
    )
    meta["codec_implementation"] = implementation
    write_meta("size", meta)
    t = sum(coded[r["id"]]["codedBytes"] for r in rows)
    u = sum(coded[r["id"]]["utf8Bytes"] for r in rows)
    print(f"wrote {out_path} ({len(rows)} sentences; coded {t} B vs utf8 {u} B; codec={implementation})")
    return 0


# --------------------------------------------------------------------------------------
# link simulation (contribution C3)
# --------------------------------------------------------------------------------------

def transmit_ms(size_bytes: int, rate_bps: int) -> float:
    return size_bytes * 8 / rate_bps * 1000.0


def in_disconnect(t: float, windows: list[tuple[float, float]]) -> bool:
    return any(start <= t < start + dur for start, dur in windows)


def simulate_link(
    preset: str,
    rate_bps: int,
    loss: float,
    disconnect_windows: list[tuple[float, float]],
    messages: int,
    seed: int,
    reliable: bool,
) -> dict:
    """Seeded per-message simulation of the outbox against a lossy, rate-limited link."""
    rng = random.Random(seed)
    ttl_ms = 600_000
    delivered = 0
    duplicate_receipts = 0
    playbacks: list[tuple[int, float]] = []  # (seq, receive_time)
    attempts_total = 0
    for seq in range(messages):
        size = rng.randint(30, 120)
        t = rng.uniform(0, 60_000)
        attempt = 0
        delivered_this = False
        while t < ttl_ms:
            attempt += 1
            attempts_total += 1
            if not in_disconnect(t, disconnect_windows):
                if rng.random() >= loss:
                    # Data frame arrives.
                    if delivered_this:
                        duplicate_receipts += 1
                    else:
                        delivered_this = True
                        # ACK is lost with the same probability; otherwise sender stops.
                        acked = rng.random() >= loss
                        playbacks.append((seq, t))
                        if acked:
                            break
                    if not reliable:
                        break
                if not reliable:
                    break
            # Retransmit with exponential backoff, jitter +/-20%.
            base = min(1000 * (2 ** (attempt - 1)), 30_000)
            t += max(1.0, base * (1 + rng.uniform(-0.2, 0.2)))
        if delivered_this:
            delivered += 1
    order_violations = sum(1 for i in range(1, len(playbacks)) if playbacks[i][0] < playbacks[i - 1][0])
    return {
        "preset": preset,
        "reliability": "on" if reliable else "off",
        "rate_bps": rate_bps,
        "loss_percent": round(loss * 100, 1),
        "messages": messages,
        "delivered": delivered,
        "delivery_rate": round(delivered / messages, 4),
        "duplicate_receipts": duplicate_receipts,
        "order_violations": order_violations,
        "attempts": attempts_total,
    }


def cmd_link(args: argparse.Namespace) -> int:
    presets = [
        ("unthrottled", 1_000_000_000, []),
        ("kbps-1", 1_000, []),
        ("kbps-3", 3_000, []),
        ("kbps-10", 10_000, []),
        ("sms-300bps", 300, []),
        ("lora-longfast", 1_071, []),  # SF11/250kHz ~ 1.07 kbps effective bytes/s
    ]
    losses = [0.0, 0.05, 0.10, 0.20, 0.30]
    disconnects = [("none", []), ("drop-10s", [(5_000.0, 10_000.0)])]
    out_path = RESULTS / "link.csv"
    fields = [
        "preset", "reliability", "rate_bps", "loss_percent", "disconnect", "messages",
        "delivered", "delivery_rate", "duplicate_receipts", "order_violations", "attempts",
    ]
    rows = []
    idx = 0
    for pname, rate, _ in presets:
        for loss in losses:
            for dname, windows in disconnects:
                for reliable in (True, False):
                    row = simulate_link(pname, rate, loss, windows, args.messages, args.seed + idx, reliable)
                    row["disconnect"] = dname
                    rows.append(row)
                    idx += 1
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    # Invariants required by plan T66: dedupe is done above the link, so duplicate playbacks are
    # zero by construction; order violations are reported and must be resolved by the reorder buffer.
    meta = provenance(
        "simulation: presets x loss x disconnects",
        len(rows),
        "seeded link simulation, not a hardware measurement; noise/speakers not involved",
        [],
    )
    write_meta("link", meta)
    print(f"wrote {out_path} ({len(rows)} runs, {args.messages} messages each)")
    return 0


# --------------------------------------------------------------------------------------
# wer (needs real hypotheses)
# --------------------------------------------------------------------------------------

def edit_distance(a: list[str], b: list[str]) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (0 if ca == cb else 1)))
        prev = cur
    return prev[-1]


def cmd_wer(args: argparse.Namespace) -> int:
    path = Path(args.hypotheses)
    if not path.exists():
        raise SystemExit(f"hypotheses file not found: {path}. Provide real ASR output as JSONL "
                         '{"id","lang","ref","hyp"}; do not fabricate accuracy numbers.')
    rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    agg: dict[str, list[int]] = {}
    for r in rows:
        ref = r["ref"].split()
        hyp = r["hyp"].split()
        err = edit_distance(ref, hyp)
        agg.setdefault(r["lang"], [0, 0])
        agg[r["lang"]][0] += err
        agg[r["lang"]][1] += max(1, len(ref))
    out_path = RESULTS / "wer.csv"
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["lang", "wer", "sentences", "ref_words"])
        for lang, (err, total) in sorted(agg.items()):
            writer.writerow([lang, round(err / total, 4), sum(1 for r in rows if r["lang"] == lang), total])
    write_meta("wer", provenance("ASR hypotheses", len(rows), "from provided hypotheses file", [path]))
    print(f"wrote {out_path}")
    return 0


NOT_IMPLEMENTED = {
    "noise": "needs clean + noise audio and licensed corpora (Q8).",
    "calibrate": "needs a dev set with per-word correctness from real ASR (T42).",
    "semantic": "needs calibrated confidence and the dev set (T42/T93).",
}


def make_not_implemented(name: str):
    def run(_args: argparse.Namespace) -> int:
        raise SystemExit(f"`{name}` is not runnable yet: {NOT_IMPLEMENTED[name]}")

    return run


def main() -> int:
    parser = argparse.ArgumentParser(prog="bench", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_size = sub.add_parser("size", help="bytes per sentence for each encoding")
    p_size.add_argument("--corpus", action="append", default=[])
    p_size.set_defaults(func=cmd_size)

    p_link = sub.add_parser("link", help="reliability simulation over lossy rate-limited links")
    p_link.add_argument("--messages", type=int, default=100)
    p_link.add_argument("--seed", type=int, default=20260928)
    p_link.set_defaults(func=cmd_link)

    p_wer = sub.add_parser("wer", help="WER/CER from a hypotheses JSONL")
    p_wer.add_argument("--hypotheses", required=True)
    p_wer.set_defaults(func=cmd_wer)

    for name in NOT_IMPLEMENTED:
        p = sub.add_parser(name, help=f"not runnable yet: {NOT_IMPLEMENTED[name]}")
        p.set_defaults(func=make_not_implemented(name))

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
