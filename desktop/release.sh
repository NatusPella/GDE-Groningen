#!/bin/sh
# Builds GTE VI for macOS + Windows and publishes it as a GitHub release.
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
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "Tag $TAG already exists - pick a new version."
  exit 1
fi
if [ "$BUMP" != "current" ]; then
  git add package.json package-lock.json
  git commit -q -m "Release $TAG"
fi

echo "Building GTE VI $VERSION ..."
rm -rf dist
npm run dist:mac
npx electron-builder --win --x64

DMG="dist/GTE-VI-$VERSION-mac.dmg"
EXE="dist/GTE-VI-$VERSION-windows-portable.exe"
[ -f "$DMG" ] && [ -f "$EXE" ] || { echo "Build output missing"; exit 1; }

git tag -a "$TAG" -m "GTE VI $VERSION"
git push -q
git push -q origin "$TAG"

PRE=""
case "$VERSION" in 0.*) PRE="--prerelease" ;; esac
NOTES="$(mktemp)"
cat > "$NOTES" <<EOF
## GTE VI $VERSION

**Windows:** download \`GTE-VI-$VERSION-windows-portable.exe\` en dubbelklik. Geen installatie nodig.
Zegt Windows "Windows heeft uw pc beveiligd"? Klik op **Meer info** en dan **Toch uitvoeren**.

**macOS** (Apple Silicon en Intel): open \`GTE-VI-$VERSION-mac.dmg\` en sleep GTE VI naar Programma's.
De eerste keer: open de app, klik **Gereed** bij de melding, ga naar **Systeeminstellingen > Privacy en beveiliging**
en klik onderaan op **Open toch**. Daarna start hij gewoon.

EOF
gh release create "$TAG" "$DMG" "$EXE" --title "GTE VI $VERSION" --notes-file "$NOTES" --generate-notes $PRE
rm -f "$NOTES"
echo "Released $TAG"
