#!/bin/sh
# Builds GDE Groningen for macOS + Windows and publishes it as a GitHub release.
#
#   npm run release -- patch    0.3.1 -> 0.3.2   bug fixes only
#   npm run release -- minor    0.3.1 -> 0.4.0   new features
#   npm run release -- current  release the version in package.json as is
#
# Optional flags, after the bump:
#   --linux   also build the Linux AppImage + tar.gz (Steam Deck) and upload them
#   --web     also build the web zip (../GDE-Groningen-<version>-web.zip);
#             only made locally, never uploaded or published
#   --steam   copy the builds into ../steam/content/ for SteamPipe before dist/
#             is cleaned (nothing contacts Steam; see ../steam/README.md)
#
#   npm run release -- minor --linux --web
#
# SemVer: 0.x.y until the real launch, then 1.0.0 (npm run release -- major).
# Everything is built locally (no GitHub Actions needed).
set -e
cd "$(dirname "$0")"
USAGE="usage: npm run release -- patch|minor|major|current [--linux] [--web] [--steam]"
BUMP=""; LINUX=""; WEB=""; STEAM=""
for a in "$@"; do
  case "$a" in
    patch|minor|major|current) [ -z "$BUMP" ] || { echo "$USAGE"; exit 1; }; BUMP="$a" ;;
    --linux) LINUX=1 ;;
    --web) WEB=1 ;;
    --steam) STEAM=1 ;;
    *) echo "$USAGE"; exit 1 ;;
  esac
done
[ -n "$BUMP" ] || { echo "$USAGE"; exit 1; }

if [ -n "$(git status --porcelain -- .. ':!../.claude')" ]; then
  echo "Commit or stash your changes first - a release is built from a clean tree."
  exit 1
fi

if [ "$BUMP" != "current" ]; then
  npm version "$BUMP" --no-git-tag-version >/dev/null
fi
VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"

# every release needs a hand-written changelog entry in ../CHANGELOG.md:
# a "## [X.Y.Z]" section (move the [Unreleased] notes there first)
CHANGES="$(awk -v v="$VERSION" '
  $0 ~ "^## \\[" v "\\]" { on = 1; next }
  on && /^## \[/ { exit }
  on { print }
' ../CHANGELOG.md | sed -e '/./,$!d')"
if [ -z "$(printf '%s' "$CHANGES" | tr -d '[:space:]')" ]; then
  echo "No changelog entry for $VERSION in CHANGELOG.md - add a '## [$VERSION] - date' section first."
  if [ "$BUMP" != "current" ]; then git checkout -- package.json package-lock.json; fi
  exit 1
fi
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "Tag $TAG already exists - pick a new version."
  exit 1
fi
if [ "$BUMP" != "current" ]; then
  git add package.json package-lock.json
  git commit -q -m "Release $TAG"
fi

echo "Building GDE Groningen $VERSION ..."
rm -rf dist
npm run dist:mac
npx electron-builder --win --x64
DMG="dist/GDE-Groningen-$VERSION-mac.dmg"
EXE="dist/GDE-Groningen-$VERSION-windows-portable.exe"
[ -f "$DMG" ] && [ -f "$EXE" ] || { echo "Build output missing"; exit 1; }
UPLOADS="$DMG $EXE"

if [ -n "$LINUX" ]; then
  # builds on macOS without Docker or Rosetta: the AppImage toolset 1.0.3
  # (package.json toolsets.appimage) has native tools; the legacy 0.0.0 one
  # ships an x86_64-only mksquashfs
  npx electron-builder --linux
  APPIMAGE="dist/GDE-Groningen-$VERSION-linux.AppImage"
  TARGZ="dist/GDE-Groningen-$VERSION-linux.tar.gz"
  [ -f "$APPIMAGE" ] && [ -f "$TARGZ" ] || { echo "Linux build output missing"; exit 1; }
  UPLOADS="$UPLOADS $APPIMAGE $TARGZ"
fi

WEBZIP=""
if [ -n "$WEB" ]; then
  # stages into ../web-dist itself (build/ stays as it is)
  npm run web:zip
  WEBZIP="../GDE-Groningen-$VERSION-web.zip"
  [ -f "$WEBZIP" ] || { echo "Web zip missing"; exit 1; }
  rm -rf ../web-dist
fi

if [ -n "$STEAM" ]; then
  node ../steam/copy-builds.mjs
fi

git tag -a "$TAG" -m "GDE Groningen $VERSION"
git push -q
git push -q origin "$TAG"

PRE=""
case "$VERSION" in 0.*) PRE="--prerelease" ;; esac
LINUX_NOTES=""
if [ -n "$LINUX" ]; then
  LINUX_NOTES="**Linux en Steam Deck** (x64, ook niet ondertekend): download \`GDE-Groningen-$VERSION-linux.AppImage\`,
maak hem uitvoerbaar (rechtsklik > Eigenschappen > Uitvoerbaar, of \`chmod +x\`) en start hem. Op de Steam Deck:
download hem in de bureaubladmodus en zet hem met **Aan Steam toevoegen** in de Gamemodus. Liever geen AppImage?
Pak \`GDE-Groningen-$VERSION-linux.tar.gz\` uit en start \`gde-groningen\`.

"
fi
# collaborators are mentioned only in the comment on the standing issue (not in the release notes)
REPO_SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)"
OWNER_LOGIN="${REPO_SLUG%%/*}"
MENTIONS="$(gh api "repos/$REPO_SLUG/collaborators" --jq "[.[] | select(.login != \"$OWNER_LOGIN\") | \"@\" + .login] | join(\" \")" 2>/dev/null || true)"
NOTES="$(mktemp)"
cat > "$NOTES" <<EOF
## GDE Groningen – Zomer vol misdaad $VERSION

$CHANGES

## Installeren

> **Let op: deze bestanden zijn niet ondertekend.** GDE Groningen is een gratis
> hobbyproject zonder betaalde Apple- of Microsoft-certificaten. Daarom
> waarschuwen Windows en macOS de eerste keer; de stappen hieronder laten
> zien hoe je hem toch opent.

**Windows:** download \`GDE-Groningen-$VERSION-windows-portable.exe\` en dubbelklik. Geen installatie nodig.
Zegt Windows "Windows heeft uw pc beveiligd"? Klik op **Meer info** en dan **Toch uitvoeren**.

**macOS** (Apple Silicon en Intel): open \`GDE-Groningen-$VERSION-mac.dmg\` en sleep GDE Groningen naar Programma's.
De eerste keer: open de app, klik **Gereed** bij de melding, ga naar **Systeeminstellingen > Privacy en beveiliging**
en klik onderaan op **Open toch**. Daarna start hij gewoon.

${LINUX_NOTES}Speelde je al toen de game nog GTE VI heette? Je saves en instellingen blijven gewoon staan.
Op de Mac kun je de oude app "GTE VI" daarna uit Programma's weggooien.

EOF
# create the release first, then upload each build with a few retries:
# a 300 MB upload sometimes times out on the first try
gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --title "GDE Groningen $VERSION" --notes-file "$NOTES" $PRE
for f in $UPLOADS; do
  ok=""
  for i in 1 2 3 4; do
    if gh release upload "$TAG" "$f" --clobber; then ok=1; break; fi
    echo "upload of $f failed, retry $i"; sleep 10
  done
  [ -n "$ok" ] || { echo "Upload failed: $f (builds stay in dist/)"; exit 1; }
done
rm -f "$NOTES"
# the comment on the standing issue notifies the mentioned collaborators
NOTIFY_ISSUE="${NOTIFY_ISSUE:-116}"
if [ -n "$NOTIFY_ISSUE" ] && [ -n "$MENTIONS" ]; then
  gh issue comment "$NOTIFY_ISSUE" --body "Nieuwe versie $VERSION is beschikbaar om te proberen: https://github.com/$REPO_SLUG/releases/tag/$TAG
$MENTIONS" >/dev/null 2>&1 || echo "could not notify on issue $NOTIFY_ISSUE"
fi
# keep the disk free: the builds are on GitHub now
rm -rf dist build
echo "Released $TAG"
if [ -n "$WEBZIP" ]; then
  echo "Web zip (local only, not uploaded): $(cd .. && pwd)/GDE-Groningen-$VERSION-web.zip"
fi
if [ -n "$STEAM" ]; then
  echo "Steam content ready in $(cd ../steam && pwd)/content (upload: see steam/README.md)"
fi
