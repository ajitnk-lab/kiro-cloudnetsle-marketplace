#!/bin/bash

# Usage: ./commit-feature.sh "feature description"
if [ -z "$1" ]; then
    echo "Usage: ./commit-feature.sh 'feature description'"
    exit 1
fi

git add .
git commit -m "feat: $1"
echo "✅ Feature committed and auto-pushed to GitHub"
