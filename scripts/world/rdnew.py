"""RD New (EPSG:28992) and the game frame: the Python twin of game/js/rdnew.js.

Same formulas in the same order (only + and * on doubles), so both give
bit-identical results; scripts/rdnew_test.mjs and scripts/world/rdnew_test.py
check that against scripts/fixtures/rdnew_points.json.

    x = RD_x - 233670,  y = -(RD_y - 582075)      (y is south)

project(lat, lon) is what the map scripts use: WGS84 -> world frame.
"""
import math

RD_ORIGIN_X = 233670
RD_ORIGIN_Y = 582075

LEGACY_LAT0 = 53.2195
LEGACY_LON0 = 6.5649999999999995
LEGACY_M_LAT = 110574.0
LEGACY_M_LON = 66652.96616805792

FRAME = "rd-new"

PHI0, LAM0 = 52.15517440, 5.38720621


def wgs_to_rd(lat, lon):
    dp = 0.36 * (lat - PHI0)
    dl = 0.36 * (lon - LAM0)
    dp2 = dp * dp; dp3 = dp2 * dp
    dl2 = dl * dl; dl3 = dl2 * dl; dl4 = dl3 * dl
    x = 155000 + (190094.945 * dl + -11832.228 * dp * dl + -114.221 * dp2 * dl + -32.391 * dl3
                  + -0.705 * dp + -2.340 * dp3 * dl + -0.608 * dp * dl3 + -0.008 * dl2 + 0.148 * dp2 * dl3)
    y = 463000 + (309056.544 * dp + 3638.893 * dl2 + 73.077 * dp2 + -157.984 * dp * dl2
                  + 59.788 * dp3 + 0.433 * dl + -6.439 * dp2 * dl2 + -0.032 * dp * dl + 0.092 * dl4 + -0.054 * dp * dl4)
    return x, y


def _rd_to_wgs_approx(x, y):
    dx = (x - 155000) * 1e-5
    dy = (y - 463000) * 1e-5
    dx2 = dx * dx; dx3 = dx2 * dx; dx4 = dx3 * dx; dx5 = dx4 * dx
    dy2 = dy * dy; dy3 = dy2 * dy; dy4 = dy3 * dy
    lat = PHI0 + (3235.65389 * dy + -32.58297 * dx2 + -0.24750 * dy2 + -0.84978 * dx2 * dy
                  + -0.06550 * dy3 + -0.01709 * dx2 * dy2 + -0.00738 * dx + 0.00530 * dx4 + -0.00039 * dx2 * dy3
                  + 0.00033 * dx4 * dy + -0.00012 * dx * dy) / 3600
    lon = LAM0 + (5260.52916 * dx + 105.94684 * dx * dy + 2.45656 * dx * dy2 + -0.81885 * dx3
                  + 0.05594 * dx * dy3 + -0.05607 * dx3 * dy + 0.01199 * dy + -0.00256 * dx3 * dy2
                  + 0.00128 * dx * dy4 + 0.00022 * dy2 + -0.00022 * dx2 + 0.00026 * dx5) / 3600
    return lat, lon


def rd_to_wgs(x, y):
    lat, lon = _rd_to_wgs_approx(x, y)
    for _ in range(2):
        fx, fy = wgs_to_rd(lat, lon)
        la, lo = _rd_to_wgs_approx(fx, fy)
        ta, to = _rd_to_wgs_approx(x, y)
        lat += ta - la
        lon += to - lo
    return lat, lon


def wgs_to_world(lat, lon):
    rx, ry = wgs_to_rd(lat, lon)
    return rx - RD_ORIGIN_X, RD_ORIGIN_Y - ry


def world_to_wgs(x, y):
    return rd_to_wgs(x + RD_ORIGIN_X, RD_ORIGIN_Y - y)


def legacy_to_wgs(x, y):
    return LEGACY_LAT0 - y / LEGACY_M_LAT, LEGACY_LON0 + x / LEGACY_M_LON


def wgs_to_legacy(lat, lon):
    return (lon - LEGACY_LON0) * LEGACY_M_LON, (LEGACY_LAT0 - lat) * LEGACY_M_LAT


def legacy_to_world(x, y):
    return wgs_to_world(*legacy_to_wgs(x, y))


def world_to_legacy(x, y):
    return wgs_to_legacy(*world_to_wgs(x, y))


def legacy_angle_to_world(x, y, a):
    c, s = math.cos(a), math.sin(a)
    x0, y0 = legacy_to_world(x, y)
    x1, y1 = legacy_to_world(x + c, y + s)
    b = math.atan2(y1 - y0, x1 - x0)
    return a + math.atan2(math.sin(b - a), math.cos(b - a))


def project(lat, lon, nd=None):
    """WGS84 -> world frame, rounded to nd decimals when given."""
    x, y = wgs_to_world(lat, lon)
    if nd is None:
        return x, y
    return round(x, nd), round(y, nd)


def P(x, y):
    """A hand-placed legacy coordinate in a map script -> world frame (cm), like worldframe.js P."""
    a, b = legacy_to_world(x, y)
    return [round(a, 2), round(b, 2)]


def frame_meta():
    """What stad.json / ommeland.json carry in meta to say which frame they are in."""
    return {"frame": FRAME, "rdOrigin": [RD_ORIGIN_X, RD_ORIGIN_Y]}


def meta_frame(meta):
    """(project, unproject) for a citymap meta: RD New when meta says so,
    else the legacy frame of its origin (older files)."""
    if meta.get("frame") == FRAME:
        return wgs_to_world, world_to_wgs
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    return ((lambda lat, lon: ((lon - lon0) * m_lon, (lat0 - lat) * m_lat)),
            (lambda x, y: (lat0 - y / m_lat, lon0 + x / m_lon)))


def legacy_wgs_box(bounds):
    """(south, west, north, east) of a legacy-frame rectangle: what the OSM
    caches in data/ were fetched for (osmfetch.map_bbox)."""
    x0, y0, x1, y1 = bounds
    return (LEGACY_LAT0 - y1 / LEGACY_M_LAT, LEGACY_LON0 + x0 / LEGACY_M_LON,
            LEGACY_LAT0 - y0 / LEGACY_M_LAT, LEGACY_LON0 + x1 / LEGACY_M_LON)


def meta_bbox(meta, pad=0.0, nd=None):
    """(south, west, north, east) of the map: meta.wgsBox (the lat/lon box
    the map was cut from), else round meta.bounds."""
    if meta.get("wgsBox"):
        s, w, n, e = meta["wgsBox"]
        b = (s - pad, w - pad, n + pad, e + pad)
    else:
        _, unproject = meta_frame(meta)
        x0, y0, x1, y1 = meta["bounds"]
        c = [unproject(x, y) for x in (x0, x1) for y in (y0, y1)]
        b = (min(p[0] for p in c) - pad, min(p[1] for p in c) - pad, max(p[0] for p in c) + pad, max(p[1] for p in c) + pad)
    return tuple(round(v, nd) for v in b) if nd is not None else b


def bbox_wgs(x0, y0, x1, y1, pad=0.001):
    """(south, west, north, east) round a world-frame box (for Overpass)."""
    corners = [world_to_wgs(x, y) for x in (x0, x1) for y in (y0, y1)]
    return (round(min(c[0] for c in corners) - pad, 5), round(min(c[1] for c in corners) - pad, 5),
            round(max(c[0] for c in corners) + pad, 5), round(max(c[1] for c in corners) + pad, 5))
