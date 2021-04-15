#!/bin/sh

# exit when any command fails
set -e

cd react-app && npm run build && cd ..
git commit -am "Save uncommited changes (WIP)" || echo "No uncommited changes to save"
git branch --delete --force gh-pages || echo "No gh-pages branch"
git add -f react-app/dist
git commit -m "Commit dist"
git subtree split --prefix react-app/dist -b gh-pages
git push -f origin gh-pages
git reset --hard HEAD~1
