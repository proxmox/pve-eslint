#!/bin/bash

set -eu -o pipefail

if [[ $1 =~ ^-(h|-help)$ ]]; then
    echo "usage: $0 [<FROM-VERSION>]"
    echo ""
    echo "Filter out irrelevant entries (sponsors, chore, docs) from the upstream changelog."
    exit 0
fi

repo="$(git rev-parse --show-toplevel)"

cfn="$repo/changes.new.tmp"

cp "$repo/eslint/CHANGELOG.md" "$cfn"

sed -ri 's/^\* \S+ /+ /g' "$cfn"

sed -i '/ Sponsors: /d' "$cfn"
sed -i '/ Chore: /d' "$cfn"
sed -i '/ Docs: /d' "$cfn"

if [[ $1 ]]; then
   version="$1"
   sed -i "/^$version -/Q" "$cfn"
   sed -i '/^\+ /!d' "$cfn"
fi

mv "$cfn" "$repo/changes"

echo "trimmed changes available at '$repo/changes'"
