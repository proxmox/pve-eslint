#!/bin/bash

set -eu -o pipefail

arg="${1:-}"
if [[ $arg =~ ^-(h|-help)$ ]]; then
    echo "usage: $0 [<FROM-VERSION>]"
    echo ""
    echo "Filter out irrelevant entries (sponsors, chore, docs) from the upstream changelog."
    exit 0
fi

repo="$(git rev-parse --show-toplevel)"

cfn="$repo/changes.new.tmp"

cp "$repo/eslint/CHANGELOG.md" "$cfn"

sed -ri 's/^\* \S+ /+ /g' "$cfn"

sed -i '/ Sponsors: /Id' "$cfn"
sed -i '/ Chore: /Id' "$cfn"
sed -i '/ Docs: /Id' "$cfn"
sed -i '/ ci: /Id' "$cfn"
sed -i '/ build: /Id' "$cfn"
sed -i '/ESLint Jenkins/Id' "$cfn"

if [[ $arg ]]; then
   version="$arg"
   sed -i "/^$version -/Q" "$cfn"
   sed -i '/^\+ /!d' "$cfn"
fi

mv "$cfn" "$repo/changes"

echo "trimmed changes available at '$repo/changes'"
