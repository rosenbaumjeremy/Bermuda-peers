#!/bin/sh
# Copy the latest summary data from the bma-peer-compare project into the site.
# Run bma-peer-compare/pipeline/export_share.py first, then this, then commit and push.
set -e
here=$(cd "$(dirname "$0")" && pwd)
src="$here/../bma-peer-compare/share"
cp "$src/peers.json" "$src/top_issuers.json" "$src/ratings.json" "$here/site/data/"
echo "Copied peers.json, top_issuers.json and ratings.json into site/data/"
