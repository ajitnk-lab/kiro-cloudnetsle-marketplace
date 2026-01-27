#!/bin/bash
# Quick setup for new spot instance - Run this first!
set -e

PERSISTENT_VOL="${PERSISTENT_VOL:-/persistent}"
UV_HOME="$PERSISTENT_VOL/.local"

# 1. Install uv to persistent volume
mkdir -p "$UV_HOME/bin" "$HOME/.local/bin"
if [ ! -f "$UV_HOME/bin/uv" ]; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    mv "$HOME/.local/bin/uv" "$UV_HOME/bin/" 2>/dev/null || true
    mv "$HOME/.local/bin/uvx" "$UV_HOME/bin/" 2>/dev/null || true
fi
ln -sf "$UV_HOME/bin/uv" "$HOME/.local/bin/uv"
ln -sf "$UV_HOME/bin/uvx" "$HOME/.local/bin/uvx"

# 2. Update PATH
cat >> "$HOME/.bashrc" << 'EOF'
export PATH="$HOME/.local/bin:/persistent/.local/bin:$PATH"
export UV_CACHE_DIR="/persistent/.cache/uv"
export NPM_CONFIG_CACHE="/persistent/.npm"
export PERSISTENT_VOL="/persistent"
EOF

# 3. Symlinks
ln -sf "$PERSISTENT_VOL/vscode-workspace/kiro-cloudnetsle-marketplace" "$HOME/marketplace"
ln -sf "$PERSISTENT_VOL/.aws" "$HOME/.aws" 2>/dev/null || true

# 4. Install Node 18 if needed
NODE_VER=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VER" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Setup complete! Run: source ~/.bashrc && cd ~/marketplace"
