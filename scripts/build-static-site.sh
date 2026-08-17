#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="$project_dir/dist"

rm -rf "$build_dir"
mkdir -p "$build_dir/client" "$build_dir/server"

cp "$project_dir/index.html" "$build_dir/client/index.html"
cp "$project_dir/welcome-lottie.json" "$build_dir/client/welcome-lottie.json"
cp "$project_dir/wallpaper.jpg" "$build_dir/client/wallpaper.jpg"
cp "$project_dir/wallpaper.png" "$build_dir/client/wallpaper.png"
cp "$project_dir/wallpaper-bigsur-backup.jpg" "$build_dir/client/wallpaper-bigsur-backup.jpg"
cp -R "$project_dir/icons" "$build_dir/client/icons"
cp -R "$project_dir/images" "$build_dir/client/images"
cp -R "$project_dir/screens" "$build_dir/client/screens"

cp "$project_dir/worker/index.js" "$build_dir/server/index.js"
cp "$project_dir/worker/wrangler.json" "$build_dir/server/wrangler.json"

printf 'Built Roman portfolio for Sites.\n'
