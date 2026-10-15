"""The lane model (docs/PROVINCIE-PLAN.md 2.12), shared by process_osm.py
(new builds) and lanes.py (the current map, in place).

From a way's OSM tags: lanes per direction (`lanes`, `lanes:forward`,
`lanes:backward`, `lanes:both_ways`; a default per class), the turn lanes
(`turn:lanes`, `turn:lanes:forward/backward`), `placement`, and a width:
the `width`/`est_width` tag, else for a one-way carriageway the sum of its
lanes (NL widths per class) plus its edges and shoulders, for a two-way road
the class default, widened when the lanes need more.

The bug this fixes: a dual carriageway is two one-way ways, and each got
the default width of the WHOLE road (trunk 12 m), so it was drawn with
round(12 / 3.3) = 4 lanes per direction where OSM says 2.
"""

# lane width per class (m): motorway 3.5, N-road 3.25, urban 2.75-3.25
LANE_W = {
    "motorway": 3.5, "motorway_link": 3.5, "trunk": 3.25, "trunk_link": 3.25,
    "primary": 3.25, "primary_link": 3.0, "secondary": 3.0, "secondary_link": 3.0,
    "tertiary": 3.0, "tertiary_link": 2.75, "unclassified": 2.75, "residential": 2.75,
    "living_street": 2.75, "service": 2.75, "track": 2.75, "busway": 3.25,
}
# one-way carriageway: what comes on top of its lanes (both edges; motorway
# with a hard shoulder, a ramp with a little room either side; an urban
# secondary or tertiary carriageway its kerb margins, room to pass a stopped
# car and a bridge's railings set back: a single lane is 5 m)
ONEWAY_EXTRA = {
    "motorway": 3.5, "motorway_link": 3.0, "trunk": 1.0, "trunk_link": 1.5,
    "primary": 1.0, "primary_link": 1.5, "secondary": 2.0, "secondary_link": 1.6,
    "tertiary": 2.0, "tertiary_link": 1.6,
}
# lanes in a one-way carriageway's direction without a tag
ONEWAY_LANES = {"motorway": 2, "trunk": 2, "primary": 2}
# classes whose one-way width the model sets (the minor ones keep their
# default: a one-way street is one lane plus parking and kerbs). Motorway,
# trunk, primary and their slip roads always; secondary and tertiary only
# where the way is one carriageway of a dual one (`dual`: a parallel way of
# the same road the other way), since a single one-way city street's paved
# width also holds parking and cycle lanes the tags rarely give
MODELLED_ONEWAY = set(ONEWAY_EXTRA)
DUAL_ALWAYS = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary_link", "tertiary_link"}
BUS_W = 3.25


def num(v):
    try:
        return int(float(str(v).split(";")[0]))
    except (TypeError, ValueError):
        return None


def turn_list(v):
    if not v:
        return None
    return [s.strip() or "none" for s in str(v).split("|")]


def is_oneway(hw, tags):
    return (tags.get("junction") == "roundabout" or tags.get("oneway") in ("yes", "1", "true")
            or (hw in ("motorway", "motorway_link") and tags.get("oneway") != "no"))


def tag_width(tags):
    tw = tags.get("width") or tags.get("est_width")
    if not tw:
        return None
    try:
        return max(2.5, float(str(tw).split()[0].replace(",", ".")))
    except ValueError:
        return None


def lane_fields(hw, tags, default_width, dual=True):
    """{lanes, lanesFwd, lanesBwd, lanesBoth, turnFwd, turnBwd, placement,
    laneW, width} for a way of class hw (only the keys that apply)."""
    oneway = is_oneway(hw, tags)
    total = num(tags.get("lanes"))
    fwd, bwd, both = num(tags.get("lanes:forward")), num(tags.get("lanes:backward")), num(tags.get("lanes:both_ways"))
    lw = LANE_W.get(hw, 3.0)
    out = {"laneW": lw}
    if oneway:
        n = fwd or total or ONEWAY_LANES.get(hw, 1)
        out["lanesFwd"], out["lanesBwd"] = n, 0
        t = turn_list(tags.get("turn:lanes") or tags.get("turn:lanes:forward"))
        if t:
            out["turnFwd"] = t
    else:
        if fwd or bwd:
            f, b = fwd or 1, bwd or 1
        elif total:
            rest = total - (both or 0)
            f, b = max(1, (rest + 1) // 2), max(1, rest // 2)
        else:
            f, b = 1, 1
        out["lanesFwd"], out["lanesBwd"] = f, b
        if both:
            out["lanesBoth"] = both
        for key, k in (("turn:lanes:forward", "turnFwd"), ("turn:lanes:backward", "turnBwd")):
            t = turn_list(tags.get(key))
            if t:
                out[k] = t
    # turn:lanes has one entry per lane: without a lane count it gives one,
    # against one it is dropped (tagged for another set of lanes)
    for k, nk in (("turnFwd", "lanesFwd"), ("turnBwd", "lanesBwd")):
        if k in out and len(out[k]) != out[nk]:
            if oneway and not (fwd or total) and k == "turnFwd":
                out[nk] = len(out[k])
            else:
                del out[k]
    out["lanes"] = out["lanesFwd"] + out["lanesBwd"] + (both or 0)
    if tags.get("placement"):
        out["placement"] = str(tags["placement"])
    tw = tag_width(tags)
    if tw:
        out["width"], out["widthSrc"] = tw, "tag"
    elif oneway and hw in MODELLED_ONEWAY and (hw in DUAL_ALWAYS or dual):
        out["width"], out["widthSrc"] = round(out["lanesFwd"] * lw + ONEWAY_EXTRA[hw], 2), "lanes"
    elif total:
        # a lane count is a real signal: only ever widens the class default
        out["width"], out["widthSrc"] = max(default_width, round(out["lanes"] * 3.1 + 0.6, 2)), "lanes"
    else:
        out["width"], out["widthSrc"] = default_width, "class"
    return out
