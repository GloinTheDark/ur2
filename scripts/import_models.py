#!/usr/bin/env python3
"""
Import neural network model JSON files from the ursim project into ur2.

This script syncs the latest models from the sibling ursim project into ur2's public/models.
By default, it reads ../ursim/models/best_models.json and copies the referenced model files.

Features:
- Syncs from ../ursim/models by default (same structure as ur2's public/models)
- Reads ursim's best_models.json to find the latest models per ruleset
- Copies model files into public/models/<Ruleset>/
- Updates ur2's best_models.json with the imported models
- Safe overwrite behavior with content hash check
- Dry run and verbose modes

Usage examples:
  python scripts/import_models.py                    # Sync latest from ../ursim/models
  python scripts/import_models.py --all              # Sync all models, not just best
  python scripts/import_models.py --cleanup          # Sync best + delete old models
  python scripts/import_models.py --dry-run -v       # Preview what would be synced
  python scripts/import_models.py --src ../other     # Use different source
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import shutil
import sys
from pathlib import Path
from typing import Dict, Optional, Set

# Default paths relative to ur2 repo root
DEFAULT_URSIM_MODELS = "../ursim/models"
DEST_MODELS_SUBPATH = Path("public") / "models"
BEST_MODELS_FILENAME = "best_models.json"


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    tmp.replace(path)


def file_md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def files_identical(src: Path, dst: Path) -> bool:
    """Check if two files have identical content via MD5."""
    if not dst.exists():
        return False
    try:
        return file_md5(src) == file_md5(dst)
    except Exception:
        return False


def copy_model_file(src_file: Path, dest_file: Path, overwrite: bool, dry_run: bool, verbose: bool) -> bool:
    """
    Copy a model file from src to dest.
    Returns True if copied (or would be copied in dry-run), False if skipped.
    """
    if dest_file.exists():
        if files_identical(src_file, dest_file):
            if verbose:
                print(f"= Already up-to-date: {dest_file.name}")
            return False
        
        if not overwrite:
            if verbose:
                print(f"- Skipping (exists, no --overwrite): {dest_file.name}")
            return False

    if dry_run:
        print(f"DRY-RUN: would copy {src_file} -> {dest_file}")
        return True

    ensure_dir(dest_file.parent)
    if verbose:
        status = "Overwriting" if dest_file.exists() else "Copying"
        print(f"+ {status}: {dest_file.name}")
    
    shutil.copy2(src_file, dest_file)
    return True


def sync_best_models(src_models_dir: Path, dest_models_dir: Path, overwrite: bool, dry_run: bool, verbose: bool) -> Dict[str, str]:
    """
    Sync models listed in src's best_models.json.
    Returns dict of {ruleset: model_filename} for successfully synced models.
    """
    src_best_json = src_models_dir / BEST_MODELS_FILENAME
    if not src_best_json.exists():
        eprint(f"! Source best_models.json not found: {src_best_json}")
        return {}

    try:
        src_best = read_json(src_best_json)
    except Exception as e:
        eprint(f"! Failed to read source best_models.json: {e}")
        return {}

    if verbose:
        print(f"Found {len(src_best)} rulesets in source best_models.json")

    synced_models = {}
    
    for ruleset, entry in src_best.items():
        if not isinstance(entry, dict) or "model_file" not in entry:
            eprint(f"! Invalid entry for {ruleset} in best_models.json")
            continue

        model_filename = entry["model_file"]
        src_model_file = src_models_dir / ruleset / model_filename
        dest_model_file = dest_models_dir / ruleset / model_filename

        if not src_model_file.exists():
            eprint(f"! Source model file not found: {src_model_file}")
            continue

        if copy_model_file(src_model_file, dest_model_file, overwrite, dry_run, verbose):
            synced_models[ruleset] = model_filename

    return synced_models


def sync_all_models(src_models_dir: Path, dest_models_dir: Path, overwrite: bool, dry_run: bool, verbose: bool) -> Dict[str, str]:
    """
    Sync all model_*.json files from src to dest, maintaining directory structure.
    Returns dict of {ruleset: model_filename} for the last synced model per ruleset.
    """
    synced_models = {}
    
    # Find all ruleset directories in source
    for ruleset_dir in src_models_dir.iterdir():
        if not ruleset_dir.is_dir() or ruleset_dir.name.startswith('.'):
            continue
            
        ruleset = ruleset_dir.name
        if verbose:
            print(f"Scanning ruleset: {ruleset}")
        
        # Find all model files in this ruleset directory
        model_files = sorted([f for f in ruleset_dir.glob("model_*.json")])
        
        for model_file in model_files:
            dest_model_file = dest_models_dir / ruleset / model_file.name
            
            if copy_model_file(model_file, dest_model_file, overwrite, dry_run, verbose):
                synced_models[ruleset] = model_file.name  # Last one wins

    return synced_models


def cleanup_old_models(dest_models_dir: Path, dry_run: bool, verbose: bool) -> None:
    """Delete models that are not listed as best in best_models.json."""
    dest_best_json = dest_models_dir / BEST_MODELS_FILENAME
    
    if not dest_best_json.exists():
        if verbose:
            print("No best_models.json found, skipping cleanup")
        return
    
    try:
        dest_best = read_json(dest_best_json)
    except Exception as e:
        eprint(f"! Failed to read best_models.json for cleanup: {e}")
        return
    
    # Get set of best model files
    best_model_files = set()
    for ruleset, entry in dest_best.items():
        if isinstance(entry, dict) and "model_file" in entry:
            best_model_files.add((ruleset, entry["model_file"]))
    
    if verbose:
        print(f"Found {len(best_model_files)} best model(s) to preserve")
    
    # Scan each ruleset directory for models to delete
    deleted_count = 0
    for ruleset_dir in dest_models_dir.iterdir():
        if not ruleset_dir.is_dir() or ruleset_dir.name.startswith('.'):
            continue
            
        ruleset = ruleset_dir.name
        model_files = list(ruleset_dir.glob("model_*.json"))
        
        for model_file in model_files:
            # Skip if this is a best model
            if (ruleset, model_file.name) in best_model_files:
                if verbose:
                    print(f"= Preserving best model: {ruleset}/{model_file.name}")
                continue
            
            # Delete non-best model
            if dry_run:
                print(f"DRY-RUN: would delete {model_file}")
            else:
                if verbose:
                    print(f"- Deleting old model: {ruleset}/{model_file.name}")
                model_file.unlink()
                deleted_count += 1
    
    if not dry_run and deleted_count > 0:
        print(f"Deleted {deleted_count} old model(s)")


def update_dest_best_models(dest_models_dir: Path, synced_models: Dict[str, str], dry_run: bool, verbose: bool) -> None:
    """Update ur2's best_models.json with the synced models."""
    if not synced_models:
        return

    dest_best_json = dest_models_dir / BEST_MODELS_FILENAME
    
    # Read existing best_models.json or start fresh
    dest_best = {}
    if dest_best_json.exists():
        try:
            dest_best = read_json(dest_best_json)
        except Exception as e:
            eprint(f"! Failed to read destination best_models.json: {e}, starting fresh")
            dest_best = {}

    # Update with synced models
    now = _dt.datetime.now()
    for ruleset, model_filename in synced_models.items():
        dest_best[ruleset] = {
            "model_file": model_filename,
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M:%S"),
        }
        if verbose:
            print(f"* Updated best model for {ruleset}: {model_filename}")

    if dry_run:
        print(f"DRY-RUN: would update {dest_best_json}")
        return

    write_json(dest_best_json, dest_best)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync neural network models from ursim project to ur2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Sync latest models from ../ursim/models
  %(prog)s --all              # Sync all models, not just best
  %(prog)s --cleanup          # Sync best models + delete old ones
  %(prog)s --dry-run -v       # Preview what would be synced
  %(prog)s --src ../other     # Use different source directory
        """.strip()
    )
    
    parser.add_argument("--src", 
                       help=f"Source models directory (default: {DEFAULT_URSIM_MODELS})")
    parser.add_argument("--dest", 
                       help="Destination models directory (default: public/models)")
    parser.add_argument("--all", action="store_true",
                       help="Sync all models, not just those in best_models.json")
    parser.add_argument("--cleanup", action="store_true",
                       help="Delete models that are not listed as best")
    parser.add_argument("--overwrite", action="store_true",
                       help="Overwrite existing files even if different")
    parser.add_argument("--dry-run", action="store_true",
                       help="Show what would be done without making changes")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="Verbose output")
    
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    # Determine paths
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    
    src_models_dir = Path(args.src or DEFAULT_URSIM_MODELS).resolve()
    dest_models_dir = Path(args.dest).resolve() if args.dest else (repo_root / DEST_MODELS_SUBPATH)

    # Validate source
    if not src_models_dir.exists():
        eprint(f"! Source models directory not found: {src_models_dir}")
        eprint(f"  Make sure the ursim project exists at: {src_models_dir}")
        return 2

    if args.verbose:
        print(f"Source: {src_models_dir}")
        print(f"Destination: {dest_models_dir}")
        print(f"Mode: {'All models' if args.all else 'Best models only'}")

    # Sync models
    if args.all:
        synced_models = sync_all_models(src_models_dir, dest_models_dir, args.overwrite, args.dry_run, args.verbose)
    else:
        synced_models = sync_best_models(src_models_dir, dest_models_dir, args.overwrite, args.dry_run, args.verbose)

    # Update ur2's best_models.json if models were synced
    if synced_models:
        update_dest_best_models(dest_models_dir, synced_models, args.dry_run, args.verbose)
    elif not synced_models:
        print("No models were synced.")

    # Cleanup old models if requested (run regardless of sync status)
    if args.cleanup:
        cleanup_old_models(dest_models_dir, args.dry_run, args.verbose)

    if args.verbose and synced_models:
        print(f"Successfully synced {len(synced_models)} model(s).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
