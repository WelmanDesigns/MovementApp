# One-time importer: "Purple belt exam.xlsx" -> src/js/belt-seed-generated.js
#
# Usage:  python import-belt-curriculum.py [path-to-xlsx]
#
# Reads Sheet1 (Name / Technique / Position / Type / Stripe 1-4 / Purple belt / Notes),
# normalises whitespace, derives stable ids, groups rows into UI categories using the
# Belt Tracker grouping rules, and writes checked-in seed data so the app never needs
# an XLSX parser at runtime. Sheet2 is vocabulary only and is ignored.
#
# The generated stage configs (sections/groups/target counts) are data, not code:
# edit belt-data.js overrides or re-run this script if the spreadsheet changes.

import json
import re
import sys
import os

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required:  pip install openpyxl")

_REPO_XLSX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Belt Tracker", "Purple belt exam.xlsx")
DEFAULT_XLSX = _REPO_XLSX if os.path.exists(_REPO_XLSX) else \
    os.path.join(os.path.expanduser("~"), "Downloads", "Purple belt exam.xlsx")
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "js", "belt-seed-generated.js")

STAGE_FLAGS = [
    ("blue-s1", "Stripe 1"),
    ("blue-s2", "Stripe 2"),
    ("blue-s3", "Stripe 3"),
    ("blue-s4", "Stripe 4"),
    ("purple-exam", "Purple belt"),
]

# Import sanity checks — counts of selected moves per stage, from the curriculum sheet
EXPECTED_TOTALS = {
    "blue-s1": 52,
    "blue-s2": 51,
    "blue-s3": 59,
    "blue-s4": 47,
    "purple-exam": 177,
}

# Blue Belt Stripe 1 category targets from the printed curriculum. The derived
# grouping must reproduce these exactly or the import aborts.
BLUE_S1_EXPECTED_TARGETS = {
    "takedowns--judo": 6,
    "guard-pass--open": 6,
    "guard-pass--dlr": 2,
    "guard-pass--inv-dlr": 2,
    "sweeps--open": 4,
    "sweeps--dlr": 4,
    "sweeps--inv-dlr": 2,
    "submissions--armlock--full": 4,
    "submissions--armlock--half": 2,
    "submissions--armlock--50-50": 1,
    "submissions--armlock--mount": 4,
    "submissions--armlock--back": 2,
    "submissions--armlock--side-control": 2,
    "defence--armlock": 4,
    "defence--esc-mount": 4,
    "defence--esc-side-control": 3,
}

SECTIONS = {
    "Basic":             ("basic", "Basic", 1),
    "Control":           ("control", "Control", 2),
    "Takedowns":         ("takedowns", "Takedowns", 3),
    "Guard pulling":     ("guard-pulling", "Guard Pulling", 4),
    "Guard pass":        ("guard-pass", "Guard Pass", 5),
    "Sweeps":            ("sweeps", "Sweeps", 6),
    "Submissions":       ("submissions", "Submissions", 7),
    "Defense & Escapes": ("defence", "Defence & Escapes", 8),
    "T/D Counters":      ("td-counters", "Takedown Counters", 9),
}

POSITION_NAMES = {
    "Open": "Open Guard", "Full": "Full Guard", "Half": "Half Guard",
    "Butterfly": "Butterfly", "Spider": "Spider Guard", "X": "X Guard",
    "Single X": "Single X", "DLR": "DLR", "INV DLR": "Inverted DLR",
    "Deep 1/2": "Deep Half", "50/50": "50/50", "Lapel": "Lapel Guard",
    "INV 1/2": "Inverted Half", "Standing": "Standing", "Mount": "Mount",
    "Back": "Back", "Side Control": "Side Control", "North south": "North South",
    "Knee ride": "Knee Ride",
}

BASIC_TECH_NAMES = {
    "Control": "Mount Control",   # every Control row in the sheet is Mount
    "Back take": "Back Takes",
    "Grip break": "Grip Breaks",
}


def clean(v):
    """Collapse repeated whitespace, trim; None -> ''. Preserves the original name otherwise."""
    if v is None:
        return ""
    return re.sub(r"\s+", " ", str(v)).strip()


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "x"


def pos_name(pos):
    return POSITION_NAMES.get(pos, pos)


def group_for(row):
    """Apply the Belt Tracker grouping rules -> (groupId, groupName, contextLabel).

    contextLabel is secondary info shown on the move row (never a redundant
    'Pass'/'Sweep' technique label)."""
    typ, tech, pos = row["type"], row["technique"], row["position"]
    sec_slug = SECTIONS[typ][0]

    if typ in ("Guard pass", "Sweeps"):
        # Category = position; generic 'Pass'/'Sweep' technique is not displayed
        return (f"{sec_slug}--{slug(pos)}", pos_name(pos), "")

    if typ == "Submissions":
        if pos:
            return (f"{sec_slug}--{slug(tech)}--{slug(pos)}", f"{tech} → {pos_name(pos)}", "")
        return (f"{sec_slug}--{slug(tech)}", tech, "")

    if typ == "Defense & Escapes":
        if tech:
            return (f"{sec_slug}--{slug(tech)}", f"{tech} Defence", pos_name(pos) if pos else "")
        return (f"{sec_slug}--esc-{slug(pos)}", f"{pos_name(pos)} Escapes", "")

    if typ in ("Takedowns", "T/D Counters"):
        return (f"{sec_slug}--{slug(tech)}", tech, pos_name(pos) if pos and pos != "Standing" else "")

    if typ == "Basic":
        name = BASIC_TECH_NAMES.get(tech, tech)
        ctx = pos_name(pos) if pos and tech != "Control" else ""
        return (f"{sec_slug}--{slug(tech)}", name, ctx)

    if typ == "Guard pulling":
        return (f"{sec_slug}--{slug(tech)}", tech, "")

    raise ValueError(f"Unhandled Type: {typ!r}")


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    if not os.path.exists(xlsx):
        sys.exit(f"Spreadsheet not found: {xlsx}")

    wb = openpyxl.load_workbook(xlsx, data_only=True)
    ws = wb["Sheet1"]

    header_row = None
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=10, values_only=True), start=1):
        if "Name" in [clean(c) for c in row]:
            header_row = i
            headers = [clean(c) for c in row]
            break
    if header_row is None:
        sys.exit("Could not find a header row containing 'Name' in Sheet1")

    col = {h: idx for idx, h in enumerate(headers) if h}
    required_cols = ["Name", "Technique", "Position", "Type", "Notes"] + [f for _, f in STAGE_FLAGS]
    missing = [c for c in required_cols if c not in col]
    if missing:
        sys.exit(f"Missing expected columns: {missing}")

    errors, warnings = [], []
    moves = []            # ordered list of move dicts
    by_id = {}
    by_key = {}           # dedupe key -> move

    for rownum, raw in enumerate(ws.iter_rows(min_row=header_row + 1, values_only=True), start=header_row + 1):
        vals = [clean(c) for c in raw]
        if all(v == "" for v in vals):
            continue

        def cell(name):
            return vals[col[name]] if col[name] < len(vals) else ""

        name, tech, pos, typ, notes = cell("Name"), cell("Technique"), cell("Position"), cell("Type"), cell("Notes")

        if not name:
            errors.append(f"Row {rownum}: missing Name")
            continue
        if not typ:
            errors.append(f"Row {rownum}: empty Type for '{name}'")
            continue
        if typ not in SECTIONS:
            errors.append(f"Row {rownum}: unknown Type {typ!r} for '{name}'")
            continue

        stages = []
        for stage_id, flag_col in STAGE_FLAGS:
            v = cell(flag_col)
            if v == "":
                continue
            if v.lower() == "yes":
                stages.append(stage_id)
            else:
                errors.append(f"Row {rownum}: unexpected stage flag {v!r} in '{flag_col}' for '{name}'")

        key = "|".join([typ.lower(), tech.lower(), pos.lower(), name.lower()])
        if key in by_key:
            prev = by_key[key]
            merged = sorted(set(prev["stages"]) | set(stages))
            if set(prev["stages"]) == set(stages):
                warnings.append(f"Row {rownum}: exact duplicate of '{name}' ({typ}/{tech}/{pos}) — dropped")
            else:
                warnings.append(f"Row {rownum}: duplicate '{name}' ({typ}/{tech}/{pos}) with different stage flags — flags merged")
                prev["stages"] = merged
            if notes and not prev["notes"]:
                prev["notes"] = notes
            continue

        base_id = "sd-" + "-".join(filter(None, [slug(typ), slug(tech) if tech else None,
                                                 slug(pos) if pos else None, slug(name)]))
        move_id = base_id
        n = 2
        while move_id in by_id:  # deterministic: rows keep spreadsheet order
            move_id = f"{base_id}-{n}"
            n += 1

        move = {"id": move_id, "name": name, "technique": tech, "position": pos,
                "type": typ, "stages": stages, "notes": notes, "row": rownum}
        moves.append(move)
        by_id[move_id] = move
        by_key[key] = move

    if errors:
        print("IMPORT FAILED — fix these problems in the spreadsheet:")
        for e in errors:
            print("  ✗", e)
        sys.exit(1)

    # Totals sanity check
    totals = {sid: sum(1 for m in moves if sid in m["stages"]) for sid, _ in STAGE_FLAGS}
    for sid, expected in EXPECTED_TOTALS.items():
        if totals[sid] != expected:
            sys.exit(f"IMPORT FAILED — {sid}: expected {expected} selected moves, got {totals[sid]}")

    # Build per-stage sections/groups (initial targets = number of selected rows in the group).
    # Suggested moves = other rows in the same group that are NOT selected for that stage.
    group_members = {}   # groupId -> ordered move ids (all stages)
    group_meta = {}      # groupId -> (sectionKey, groupName)
    for m in moves:
        gid, gname, ctx = group_for(m)
        if not ctx and m["position"] and m["position"] != "Standing":
            ctx = pos_name(m["position"])  # disambiguates pooled suggestion lists
        m["groupId"] = gid
        m["context"] = ctx
        group_members.setdefault(gid, []).append(m["id"])
        group_meta.setdefault(gid, (SECTIONS[m["type"]], gname))

    stages_out = {}
    for sid, _ in STAGE_FLAGS:
        sections = {}
        for m in moves:
            if sid not in m["stages"]:
                continue
            gid = m["groupId"]
            (sec_slug, sec_name, sec_order), gname = group_meta[gid]
            sec = sections.setdefault(sec_slug, {"key": sec_slug, "name": sec_name,
                                                 "order": sec_order, "groups": {}})
            grp = sec["groups"].setdefault(gid, {"id": gid, "name": gname,
                                                 "requirementMode": "target_count",
                                                 "targetCount": 0,
                                                 "defaultMoveIds": [], "suggestedMoveIds": []})
            grp["defaultMoveIds"].append(m["id"])
            grp["targetCount"] += 1

        for sec in sections.values():
            for gid, grp in sec["groups"].items():
                selected = set(grp["defaultMoveIds"])
                grp["suggestedMoveIds"] = [mid for mid in group_members[gid] if mid not in selected]

        stages_out[sid] = {
            "id": sid,
            "sections": [
                {"key": s["key"], "name": s["name"], "order": s["order"],
                 "groups": list(s["groups"].values())}
                for s in sorted(sections.values(), key=lambda s: s["order"])
            ],
        }

    # Blue Stripe 1 must reproduce the printed category targets exactly
    s1_targets = {g["id"]: g["targetCount"]
                  for sec in stages_out["blue-s1"]["sections"] for g in sec["groups"]}
    if s1_targets != BLUE_S1_EXPECTED_TARGETS:
        print("IMPORT FAILED — Blue Stripe 1 derived targets do not match the printed curriculum:")
        for k in sorted(set(s1_targets) | set(BLUE_S1_EXPECTED_TARGETS)):
            a, b = s1_targets.get(k), BLUE_S1_EXPECTED_TARGETS.get(k)
            if a != b:
                print(f"  ✗ {k}: derived={a} expected={b}")
        sys.exit(1)

    moves_out = {}
    for m in moves:
        entry = {"id": m["id"], "name": m["name"], "type": m["type"],
                 "technique": m["technique"], "position": m["position"],
                 "groupId": m["groupId"], "stages": m["stages"]}
        if m["context"]:
            entry["context"] = m["context"]
        if m["notes"]:
            entry["defaultNotes"] = m["notes"]
        moves_out[m["id"]] = entry

    out = {
        "source": os.path.basename(xlsx),
        "moveCount": len(moves),
        "stageTotals": totals,
        "moves": moves_out,
        "stages": stages_out,
    }

    js = ("// Auto-generated by import-belt-curriculum.py from \"" + os.path.basename(xlsx) + "\" — do not edit by hand.\n"
          "// Re-run the importer if the curriculum spreadsheet changes.\n"
          "const BELT_SEED = " + json.dumps(out, indent=2, ensure_ascii=False) + ";\n")
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)

    print(f"Imported {len(moves)} moves from {xlsx}")
    print("Stage totals:", ", ".join(f"{k}={v}" for k, v in totals.items()), "(all match expected)")
    if warnings:
        print("Warnings:")
        for w in warnings:
            print("  ⚠", w)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
