
#!/usr/bin/env bash
set -euo pipefail

read -rp "Enter release version (e.g. 1.0.0 or 1.0.0.1): " VERSION

if [[ ! "$VERSION" =~ ^[0-9]+(\.[0-9]+)*(-[a-zA-Z0-9.-]+)?$ ]]; then
  echo "Invalid version: $VERSION"
  exit 1
fi

TAG="notebook-v$VERSION"

git tag "$TAG"
git push origin "$TAG"

echo "Released tag: $TAG"
