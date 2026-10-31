"""Ralph-tick: één ronde van de loop op GDE-Groningen.

Draait als OpenHands-automation (cron). Elke run doet één tick:

1. Kies het beste open issue (prioriteit uit AGENTS.md, via ralph/select.mjs).
2. Claim het atomair: assign jezelf + bordkolom Bezig + comment. Lukt dat niet, stop.
3. Start één agent-conversatie met ralph/PROMPT.md als opdracht.
4. Wacht tot die klaar is, rommel de claim op en schrijf de stand in de KV-store.

Waarom ticks en geen uur: de automation-backend staat maximaal 1800 s per run toe.
Drie ticks op hetzelfde issue is samen ongeveer het uur dat de eigenaar wil; de
agent krijgt per tick een verse context, wat precies het punt van een Ralph-loop is.

Geen LLM in dit script: het kiezen, claimen en opruimen is deterministisch. Alleen de
agent-conversatie kost tokens.
"""

import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# Eén script voor elk project: alles wat verschilt staat in ralph.toml naast dit
# bestand, zodat een tweede repo een eigen automation met eigen config krijgt en niet
# een tweede kopie van de code.
TICK_SECONDS = int(os.environ.get("RALPH_TICK_SECONDS", "1500"))
MAX_TICKS_PER_ISSUE = int(os.environ.get("RALPH_MAX_TICKS", "3"))

HERE = os.path.dirname(os.path.abspath(__file__))


def lees_config():
    """Lees de configuratie van dit project.

    `RALPH_CONFIG` kiest het bestand: elke automation krijgt één tarball met alle
    configs erin en zet zelf `RALPH_CONFIG=...`, zodat een tweede repo geen tweede
    kopie van de code nodig heeft.
    """
    import tomllib
    with open(os.path.join(HERE, CONFIG_BESTAND), "rb") as f:
        return tomllib.load(f)


CONFIG_BESTAND = os.environ.get("RALPH_CONFIG") or "ralph.toml"


CFG = lees_config()
REPO = CFG["repo"]
PROJECT_NUMBER = CFG.get("project_number")
BORD_BEZIG = CFG.get("bord_bezig")
# De branch waar werk naartoe gaat; per project in te stellen.
HOOFDBRANCH = CFG.get("hoofdbranch") or "main"
# De labels waarmee een project prioriteit aangeeft (bug voor wens); een issue zonder
# een van deze is nog steeds kiesbaar, maar onderaan en met een melding op het issue.
EERSTE = tuple(CFG.get("eerste") or ("bug",))
# Een automation-run krijgt een verse map per run, dus de checkout moet op een vaste
# plek staan. Die plek is een echte Agent Canvas-workspace (zichtbaar in de UI, blijft
# bestaan tussen runs) en geen los mapje; de loop registreert hem bij de eerste tick.
# Eén gedeelde kloon, geen worktree per tick: deze repo is ~640 MB en de schijf is de
# beperkende factor.
WORKSPACE_NAAM = CFG.get("workspace_naam") or f"{REPO} (ralph)"
WORKSPACE_SLUG = CFG.get("workspace_slug") or REPO.replace("/", "-").lower()
WORKSPACE_BASIS = os.path.expanduser("~/.openhands/workspaces")
REPO_DIR = os.environ.get("RALPH_REPO_DIR") or os.path.join(
    WORKSPACE_BASIS, WORKSPACE_SLUG, CFG.get("repo_map") or REPO.split("/")[-1])


# ---------------------------------------------------------------- omgeving

def env(name, default=""):
    return os.environ.get(name, default) or default


def get_secret(name):
    """Secrets staan op de agent-server, ook in een lokale Agent Canvas."""
    url = env("AGENT_SERVER_URL").rstrip("/")
    key = env("SESSION_API_KEY") or env("OH_SESSION_API_KEYS_0")
    if url:
        url = f"{url}/api/settings/secrets/{name}"
    else:
        api = env("OPENHANDS_CLOUD_API_URL").rstrip("/")
        url = f"{api}/api/v1/sandboxes/{env('SANDBOX_ID')}/settings/secrets/{name}"
    req = urllib.request.Request(url, headers={"X-Session-API-Key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode().strip()


def fire_callback(status="COMPLETED", error=None):
    url = env("AUTOMATION_CALLBACK_URL")
    if not url:
        return
    body = {"status": status, "run_id": env("AUTOMATION_RUN_ID")}
    if error:
        body["error"] = error[:2000]
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {env('AUTOMATION_CALLBACK_API_KEY')}",
        },
    )
    try:
        urllib.request.urlopen(req, timeout=30)
    except Exception as e:  # een mislukte callback mag de run niet maskeren
        print(f"callback mislukt: {e}", file=sys.stderr)


# ---------------------------------------------------------------- KV-state

def kv_key(name):
    # Per project, anders overschrijft de ene loop de tick-teller van de andere.
    return f"ralph:{WORKSPACE_SLUG}:{name}"


def kv_base():
    """Basis-URL van de KV-API. AUTOMATION_API_URL is al .../api/automation, dus het
    versiepad moet er los achter; anders wordt het pad dubbel en krijg je 404."""
    base = env("AUTOMATION_API_URL").rstrip("/")
    if not base or not env("AUTOMATION_KV_TOKEN"):
        return None
    return f"{base}/v1" if base.endswith("/automation") else f"{base}/api/automation/v1"


def kv_get(name, default=None):
    """Lees uit de KV-store van de automation-service; lokaal bestand als terugval.

    De run-omgeving heeft geen vaste schijf tussen runs, dus de KV-store is de echte
    staat. Lokaal bestand is alleen voor het testen op de ontwikkelmachine.
    """
    base = kv_base()
    if base:
        url = f"{base}/kv/{urllib.parse.quote(kv_key(name))}"
        req = urllib.request.Request(
            url, headers={"Authorization": f"Bearer {env('AUTOMATION_KV_TOKEN')}"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read().decode()).get("value", default)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return default
            raise
    path = os.path.join(HERE, "state", f"{name}.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def kv_set(name, value):
    base = kv_base()
    if base:
        url = f"{base}/kv/{urllib.parse.quote(kv_key(name))}"
        req = urllib.request.Request(
            url,
            data=json.dumps(value).encode(),
            headers={"Authorization": f"Bearer {env('AUTOMATION_KV_TOKEN')}",
                     "Content-Type": "application/json"},
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            r.read()
        return
    os.makedirs(os.path.join(HERE, "state"), exist_ok=True)
    with open(os.path.join(HERE, "state", f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- GitHub

class Gh:
    def __init__(self, token):
        self.token = token

    def __call__(self, *args, check=True, stdin=None):
        r = subprocess.run(
            ["gh", *args],
            capture_output=True,
            text=True,
            input=stdin,
            env={**os.environ, "GH_TOKEN": self.token, "GH_PAGER": "cat"},
        )
        if check and r.returncode != 0:
            raise RuntimeError(f"gh {' '.join(args)} faalde: {r.stderr.strip()[:500]}")
        return r

    def json(self, *args):
        return json.loads(self(*args).stdout or "null")

    def graphql(self, query):
        return self.json("api", "graphql", "-f", f"query={query}")["data"]


def kies_issue(gh, skip, na=0):
    issues = gh.json(
        "issue", "list", "--repo", REPO, "--state", "open", "--limit", "100",
        "--json", "number,title,labels,assignees",
    )
    arg = ",".join(str(n) for n in skip)
    r = subprocess.run(
        ["node", os.path.join(HERE, "select.mjs"), f"--skip={arg}",
         f"--na={na}",
         f"--config={os.path.join(HERE, CONFIG_BESTAND)}"],
        input=json.dumps(issues), capture_output=True, text=True, timeout=60,
    )
    if r.returncode == 1:
        return None
    if r.returncode != 0:
        raise RuntimeError(f"select.mjs faalde: {r.stderr.strip()[:500]}")
    nummer, titel = r.stdout.strip().split("\t", 1)
    gekozen = next((i for i in issues if i.get("number") == int(nummer)), {})
    gelabeld = any((l if isinstance(l, str) else l.get("name")) in EERSTE
                   for l in (gekozen.get("labels") or []))
    return {"number": int(nummer), "title": titel, "open": len(issues),
            "ongelabeld": not gelabeld}


def bord_naar_bezig(gh, nummer):
    """Zet de bordkolom op Bezig. Best-effort: een bordfout mag de tick niet stoppen."""
    try:
        data = gh.graphql(
            '{ user(login:"NatusPella") { projectV2(number:%d) { id } } }' % PROJECT_NUMBER
        )
        project = data["user"]["projectV2"]["id"]
        item = gh.graphql(
            "mutation { addProjectV2ItemById(input:{projectId:\"%s\", contentId:\"%s\"}) { item { id } } }"
            % (project, gh.json("issue", "view", str(nummer), "--repo", REPO, "--json", "id")["id"])
        )["addProjectV2ItemById"]["item"]["id"]
        field = gh.graphql(
            'query { node(id:"%s") { ... on ProjectV2 { field(name:"Status") '
            "{ ... on ProjectV2SingleSelectField { id } } } } }" % project
        )["node"]["field"]["id"]
        gh.graphql(
            'mutation { updateProjectV2ItemFieldValue(input:{projectId:"%s", itemId:"%s", '
            'fieldId:"%s", value:{singleSelectOptionId:"%s"}}) { projectV2Item { id } } }'
            % (project, item, field, BORD_BEZIG)
        )
    except Exception as e:
        print(f"bord bijwerken mislukt (gaat door): {e}", file=sys.stderr)


def werkmap_gereedmaken(gh):
    """Zet de checkout schoon op main, zonder werk van een gecrashte tick te verliezen.

    Ticks draaien in dezelfde checkout. Valt er één om met niet-gecommitte wijzigingen,
    dan committen we die eerst op een herstelbranch en pushen hem, zodat de volgende
    tick met een schone lei begint en er tóch niets weg is.
    """
    git = ["git", "-C", REPO_DIR]
    vuil = subprocess.run(git + ["status", "--porcelain"], capture_output=True,
                          text=True, timeout=120).stdout.strip()
    if vuil:
        naam = f"ralph-herstel-{int(time.time())}"
        url = f"https://x-access-token:{gh.token}@github.com/{REPO}.git"
        for stap in (["checkout", "-b", naam],
                     ["add", "-A"],
                             ["commit", "-m", "wip: werk van een afgebroken tick"],
                     ["push", url, naam]):
            r = subprocess.run(git + stap, capture_output=True, text=True, timeout=600)
            if r.returncode != 0:
                print(f"herstel stap {stap[0]} mislukt: {r.stderr[:300]}", file=sys.stderr)
        print(f"werk van een afgebroken tick veiliggesteld op {naam}")
    subprocess.run(git + ["fetch", "origin", "--prune", "--quiet"],
                   capture_output=True, text=True, timeout=300)
    subprocess.run(git + ["checkout", HOOFDBRANCH], capture_output=True, text=True, timeout=300)
    subprocess.run(git + ["reset", "--hard", f"origin/{HOOFDBRANCH}"], capture_output=True,
                   text=True, timeout=300)


def registreer_workspace():
    """Zet de checkout in de lijst met workspaces van Agent Canvas.

    Zonder dit staat de kloon wel op schijf, maar ziet de eigenaar hem niet in de UI en
    kan hij er niet zelf in kijken. Idempotent: bestaat de workspace al, dan doen we
    niets. Mislukt het (andere serverversie), dan gaat de tick gewoon door.
    """
    api = env("AGENT_SERVER_URL").rstrip("/")
    key = env("SESSION_API_KEY") or env("OH_SESSION_API_KEYS_0")
    if not api:
        return
    try:
        req = urllib.request.Request(f"{api}/api/workspaces",
                                     headers={"X-Session-API-Key": key})
        with urllib.request.urlopen(req, timeout=30) as r:
            bestaand = json.loads(r.read().decode()).get("workspaces") or []
        if any(w.get("path") == REPO_DIR for w in bestaand):
            return
        body = {"workspaces": [{"id": WORKSPACE_SLUG,
                                "name": WORKSPACE_NAAM,
                                "path": REPO_DIR,
                                "parentPath": WORKSPACE_BASIS}]}
        req = urllib.request.Request(
            f"{api}/api/workspaces",
            data=json.dumps(body).encode(),
            headers={"X-Session-API-Key": key, "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()
        print(f"workspace geregistreerd: {WORKSPACE_NAAM} ({REPO_DIR})")
    except Exception as e:
        print(f"workspace registreren mislukt (gaat door): {e}", file=sys.stderr)


def zorg_voor_repo(gh):
    """Zorg dat er een kloon is om in te werken.

    De automation draait in de agent-server-omgeving, waar geen checkout van de repo
    staat. Zonder dit zou de agent in de map van het tarball-script werken.
    """
    os.makedirs(os.path.dirname(REPO_DIR.rstrip("/")) or "/tmp", exist_ok=True)
    if os.path.isdir(os.path.join(REPO_DIR, ".git")):
        subprocess.run(["git", "-C", REPO_DIR, "fetch", "origin", "--prune", "--quiet"],
                       capture_output=True, text=True, timeout=300)
        return
    url = f"https://x-access-token:{gh.token}@github.com/{REPO}.git"
    r = subprocess.run(
        ["git", "clone", "--filter=blob:none", url, REPO_DIR],
        capture_output=True, text=True, timeout=900,
    )
    if r.returncode != 0:
        raise RuntimeError(f"clone mislukt: {r.stderr.strip()[:400]}")


def kv_incr(name):
    """Atoom ophogen; geeft de nieuwe waarde terug, of None als de store ontbreekt."""
    base = kv_base()
    if not base:
        return None
    url = f"{base}/kv/{urllib.parse.quote(kv_key(name))}/incr"
    req = urllib.request.Request(
        url, data=b"{}", method="POST",
        headers={"Authorization": f"Bearer {env('AUTOMATION_KV_TOKEN')}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode()).get("value")


def kv_verwijder(name):
    base = kv_base()
    if not base:
        return
    req = urllib.request.Request(
        f"{base}/kv/{urllib.parse.quote(kv_key(name))}", method="DELETE",
        headers={"Authorization": f"Bearer {env('AUTOMATION_KV_TOKEN')}"})
    try:
        urllib.request.urlopen(req, timeout=15).read()
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise


def claim(gh, nummer):
    """Claim het issue met een atomaire lock.

    `incr` is de enige atomaire operatie in de KV-store: alleen de tick die de waarde
    op 1 ziet heeft de lock. Check-dan-schrijf zou hier niet volstaan, want twee loops
    kunnen allebei tegelijk "vrij" lezen en dan allebei hetzelfde issue pakken.

    Een lock van een gecrashte tick laten we verlopen: staat de teller te lang op 1,
    dan nemen we hem over. Zonder dat blijft een issue voor altijd bezet.
    """
    sleutel = f"claim:{nummer}"
    waarde = kv_incr(sleutel)
    if waarde is None:
        # Geen KV-store (lokaal testen): val terug op de assignee-check van GitHub.
        voor = gh.json("issue", "view", str(nummer), "--repo", REPO, "--json", "assignees")
        if voor.get("assignees"):
            return False
    elif waarde > 1:
        moment = kv_get(f"claimtijd:{nummer}") or {}
        ouderdom = time.time() - (moment.get("t") or 0)
        if ouderdom < TICK_SECONDS * 2:
            return False
        print(f"verlopen claim op #{nummer} overgenomen ({(ouderdom / 60):.0f} min oud)")
        kv_verwijder(sleutel)
        if kv_incr(sleutel) != 1:
            return False
    kv_set(f"claimtijd:{nummer}", {"t": time.time(), "run": env("AUTOMATION_RUN_ID")})

    r = subprocess.run(
        ["gh", "issue", "edit", str(nummer), "--repo", REPO, "--add-assignee", "@me"],
        capture_output=True, text=True,
        env={**os.environ, "GH_TOKEN": gh.token, "GH_PAGER": "cat"},
    )
    return r.returncode == 0


def geef_claim_vrij(gh, nummer):
    """Geef de claim vrij: assignee eraf én de lock in de KV-store weg.

    Het vrijgeven van de lock is niet optioneel: zonder dat blijft de teller op 1 staan
    en kan hetzelfde issue pas na de vervaltijd weer worden opgepakt.
    """
    subprocess.run(
        ["gh", "issue", "edit", str(nummer), "--repo", REPO, "--remove-assignee", "@me"],
        capture_output=True, text=True, env={**os.environ, "GH_TOKEN": gh.token},
    )
    for sleutel in (f"claim:{nummer}", f"claimtijd:{nummer}"):
        try:
            kv_verwijder(sleutel)
        except Exception as e:
            print(f"lock {sleutel} vrijgeven mislukt: {e}", file=sys.stderr)


def ruim_worktrees_op():
    """Ruim worktrees van eerdere ticks op.

    De agent-server maakt per conversatie een worktree onder
    /tmp/conversation-worktrees. Deze repo is ~635 MB, dus een handvol blijvende
    worktrees vult de schijf. Een tick duurt hooguit een half uur; alles wat ouder
    is dan twee uur is van een afgelopen of vastgelopen run en mag weg.
    """
    basis = "/tmp/conversation-worktrees"
    if not os.path.isdir(basis):
        return
    grens = time.time() - 2 * 3600
    for naam in os.listdir(basis):
        pad = os.path.join(basis, naam)
        try:
            if os.path.getmtime(pad) > grens:
                continue
            shutil.rmtree(pad, ignore_errors=True)
            print(f"worktree opgeruimd: {pad}")
        except OSError as e:
            print(f"opruimen van {pad} mislukt: {e}", file=sys.stderr)


def agent_profiel():
    """Zoek het agentprofiel voor de tick.

    De agent-server eist `agent`, `agent_settings` of `agent_profile_id`; zonder een
    van die drie geeft hij 422. We nemen het profiel met de naam `default`, anders het
    eerste dat er is, zodat dit niet breekt als de eigenaar een profiel hernoemt.
    """
    vast = env("RALPH_AGENT_PROFILE_ID")
    if vast:
        return vast
    api = env("AGENT_SERVER_URL").rstrip("/")
    key = env("SESSION_API_KEY") or env("OH_SESSION_API_KEYS_0")
    req = urllib.request.Request(f"{api}/api/agent-profiles",
                                headers={"X-Session-API-Key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    profielen = data if isinstance(data, list) else data.get("items") or data.get("profiles") or []
    for p in profielen:
        if p.get("name") == "default":
            return p["id"]
    return profielen[0]["id"] if profielen else None


def start_agent(gh, prompt, deadline_min, issue_number):
    """Start één agent-conversatie in de gedeelde checkout en wacht tot die klaar is.

    Geen worktree per tick: deze repo is ~635 MB, dus drie ticks zouden bijna 2 GB
    aan worktrees kosten. De loop draait ticks na elkaar, dus één checkout volstaat;
    de branch houdt de draad tussen ticks vast.
    """
    api = env("AGENT_SERVER_URL").rstrip("/")
    key = env("SESSION_API_KEY") or env("OH_SESSION_API_KEYS_0")
    body = {
        "workspace": {"kind": "LocalWorkspace", "working_dir": REPO_DIR},
        "agent_profile_id": agent_profiel(),
        "worktree": False,
        "autotitle": True,
        "tags": {"ralph": "1", "issue": str(issue_number)},
        "initial_message": {
            "role": "user",
            "content": [{"type": "text", "text": prompt}],
            "run": True,
        },
    }
    req = urllib.request.Request(
        f"{api}/api/conversations",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-Session-API-Key": key},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        conv = json.loads(r.read().decode())
    cid = conv.get("conversation_id") or conv.get("id")

    einde = time.time() + deadline_min * 60
    status = None
    while time.time() < einde:
        time.sleep(20)
        try:
            req = urllib.request.Request(
                f"{api}/api/conversations/{cid}", headers={"X-Session-API-Key": key}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                status = json.loads(r.read().decode()).get("execution_status")
        except Exception as e:
            print(f"status ophalen mislukt: {e}", file=sys.stderr)
            continue
        # waiting_for_confirmation zou een mens vereisen; die agent is vastgelopen.
        if str(status).lower() in ("finished", "error", "stuck",
                                   "waiting_for_confirmation", "deleting"):
            return cid, status

    # Deadline gehaald terwijl de agent nog werkt: stop hem. Anders werkt hij door
    # terwijl de claim al is vrijgegeven en pakt de volgende tick hetzelfde issue op.
    stop_agent(cid)
    return cid, "timeout"


def stop_agent(cid):
    """Stop een nog lopende agent netjes, zodat twee ticks nooit dubbel werk doen."""
    api = env("AGENT_SERVER_URL").rstrip("/")
    key = env("SESSION_API_KEY") or env("OH_SESSION_API_KEYS_0")
    for path, method in ((f"/api/conversations/{cid}/interrupt", "POST"),
                         (f"/api/conversations/{cid}", "DELETE")):
        try:
            req = urllib.request.Request(f"{api}{path}", method=method,
                                         headers={"X-Session-API-Key": key})
            urllib.request.urlopen(req, timeout=60).read()
            return
        except Exception as e:
            print(f"stoppen via {path} mislukt: {e}", file=sys.stderr)


# ---------------------------------------------------------------- tick

def main():
    tick_ms = int(time.time() * 1000)
    ruim_worktrees_op()
    gh = Gh(get_secret("GITHUB_PERSONAL_ACCESS_TOKEN"))
    stand = kv_get("state", {"ticks": {}}) or {"ticks": {}}
    ticks = stand.setdefault("ticks", {})

    # Een issue dat drie ticks had en nog open is, krijgt geen vierde: dan is er een
    # beslissing of een grotere opdracht nodig, en dat is mensenwerk.
    vol = {n for n, v in ticks.items() if v.get("count", 0) >= MAX_TICKS_PER_ISSUE}
    # Waar de vorige tick gebleven is. Zonder dit pakt de loop na een gesloten issue
    # steeds weer hetzelfde laagste nummer en komt de rest van het bord nooit aan bod.
    vorige = (stand.get("last") or {}).get("issue") or 0
    keuze = kies_issue(gh, vol, vorige)
    if not keuze:
        print("geen kiesbaar issue; tick doet niets")
        if not stand.get("leeg_gemeld"):
            # Één keer vastleggen dat de tick niets deed, anders is een stille loop
            # niet te onderscheiden van een werkende.
            stand["leeg_gemeld"] = True
            kv_set("state", stand)
        fire_callback("COMPLETED")
        return
    stand["leeg_gemeld"] = False

    nummer, titel = keuze["number"], keuze["title"]
    if not claim(gh, nummer):
        print(f"#{nummer} is al geclaimd; tick doet niets")
        fire_callback("COMPLETED")
        return

    bord_naar_bezig(gh, nummer)
    if keuze.get("ongelabeld"):
        # Het bord heeft dit issue geen `bug`/`wens` gegeven. De loop pakt het toch op,
        # maar zegt het, zodat de eigenaar kan bijsturen in plaats van te denken dat de
        # prioriteit klopt.
        gh("issue", "comment", str(nummer), "--repo", REPO, "--body",
           "**Opgepakt zonder prioriteitslabel.** Dit issue heeft geen "
           f"`{'` of `'.join(sorted(EERSTE))}`; de loop behandelt het daarom als laagste "
           "prioriteit. Zet het juiste label als het hoger moet.")
    gh(
        "issue", "comment", str(nummer), "--repo", REPO, "--body",
        f"**Ralph-tick gestart.** Agent pakt dit op met een verse context "
        f"(tick {ticks.get(str(nummer), {}).get('count', 0) + 1} van {MAX_TICKS_PER_ISSUE}). "
        f"De stand komt hieronder als comment; bij een halve run blijft het issue open.",
    )
    print(f"tick op #{nummer}: {titel}")

    zorg_voor_repo(gh)
    registreer_workspace()
    werkmap_gereedmaken(gh)
    with open(os.path.join(HERE, "PROMPT.md"), encoding="utf-8") as f:
        prompt = f.read()
    prompt = (
        prompt.replace("{{REPO}}", REPO)
        .replace("{{ISSUE}}", str(nummer))
        .replace("{{TITLE}}", titel)
        .replace("{{BRANCH}}", f"ralph-{nummer}")
        .replace("{{HOOFDBRANCH}}", HOOFDBRANCH)
        .replace("{{DEADLINE}}", f"{TICK_SECONDS // 60} minuten")
        .replace("{{WORKTREE}}", REPO_DIR)
        .replace("{{MAX_TICKS}}", str(MAX_TICKS_PER_ISSUE))
        .replace("{{CONSTITUTIE}}", CFG.get("constitutie") or "AGENTS.md")
        .replace("{{LABEL_VRAAG}}", (CFG.get("geparkeerd") or ["vraag-eigenaar"])[-1])
    )

    cid, status = start_agent(gh, prompt, TICK_SECONDS // 60, nummer)

    # Claim vrijgeven zodat een volgende tick (of een mens) verder kan. Het issue
    # blijft open tenzij de agent het zelf sloot na een merge.
    geef_claim_vrij(gh, nummer)
    ticks[str(nummer)] = {"count": ticks.get(str(nummer), {}).get("count", 0) + 1,
                          "last_status": status, "last_tick": tick_ms,
                          "conversation": cid}
    stand["last"] = {"issue": nummer, "conversation": cid, "status": status}
    kv_set("state", stand)
    print(f"klaar: #{nummer} status={status} conversation={cid}")
    klaar = str(status).lower() == "finished"
    fire_callback("COMPLETED" if klaar else "FAILED", None if klaar else f"agent status {status}")


if __name__ == "__main__":
    try:
        if env("RALPH_DRY_RUN"):
            print("dry run: script laadt en de omgeving is compleet")
            fire_callback("COMPLETED")
        else:
            main()
    except Exception as exc:  # noqa: BLE001 - elke fout moet de run als FAILED melden
        import traceback
        traceback.print_exc()
        fire_callback("FAILED", f"{type(exc).__name__}: {exc}")
        sys.exit(1)
