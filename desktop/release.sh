#!/bin/sh
# Builds GDE Groningen for macOS + Windows and publishes it as a GitHub release.
#
#   npm run release -- patch    0.3.1 -> 0.3.2   bug fixes only
#   npm run release -- minor    0.3.1 -> 0.4.0   new features
#   npm run release -- current  release the version in package.json as is
#
# SemVer: 0.x.y until the real launch, then 1.0.0 (npm run release -- major).
# Everything is built locally (no GitHub Actions needed).
set -e
cd "$(dirname "$0")"
BUMP="${1:-}"
case "$BUMP" in
  patch|minor|major|current) ;;
  *) echo "usage: npm run release -- patch|minor|major|current"; exit 1 ;;
esac

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

git tag -a "$TAG" -m "GDE Groningen $VERSION"
git push -q
git push -q origin "$TAG"

PRE=""
case "$VERSION" in 0.*) PRE="--prerelease" ;; esac
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

Speelde je al toen de game nog GTE VI heette? Je saves en instellingen blijven gewoon staan.
Op de Mac kun je de oude app "GTE VI" daarna uit Programma's weggooien.

EOF
# create the release first, then upload each build with a few retries:
# a 300 MB upload sometimes times out on the first try
gh release view "$TAG" >/dev/null 2>&1 || gh release create "$TAG" --title "GDE Groningen $VERSION" --notes-file "$NOTES" $PRE
for f in "$DMG" "$EXE"; do
  ok=""
  for i in 1 2 3 4; do
    if gh release upload "$TAG" "$f" --clobber; then ok=1; break; fi
    echo "upload of $f failed, retry $i"; sleep 10
  done
  [ -n "$ok" ] || { echo "Upload failed: $f (builds stay in dist/)"; exit 1; }
done
rm -f "$NOTES"
# keep the disk free: the builds are on GitHub now
rm -rf dist build
echo "Released $TAG"
