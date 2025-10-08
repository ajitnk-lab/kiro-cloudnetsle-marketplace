#!/bin/bash
# Setup Git hooks for auto-push

cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
commit_msg=$(git log -1 --pretty=%B)
if [[ $commit_msg =~ (feat:|fix:|complete|implement|finish|done) ]]; then
    echo "🚀 Auto-pushing completed work to GitHub..."
    git push origin main
    echo "✅ Pushed to GitHub successfully"
fi
EOF

chmod +x .git/hooks/post-commit
echo "✅ Git hooks setup complete"
