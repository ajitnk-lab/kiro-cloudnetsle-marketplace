#!/bin/bash
# ONE-LINE SETUP FOR NEW SPOT INSTANCE
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/bootstrap.sh | bash
# Or: Save this file and run: bash bootstrap.sh

set -e

echo "🚀 Bootstrapping spot instance..."

# Configuration
PERSISTENT_VOL="/persistent"
WORKSPACE="$PERSISTENT_VOL/vscode-workspace/kiro-cloudnetsle-marketplace"
UV_HOME="$PERSISTENT_VOL/.local"

# 1. Install uv to persistent volume
echo "📦 Installing uv..."
mkdir -p "$UV_HOME/bin" "$HOME/.local/bin"
if [ ! -f "$UV_HOME/bin/uv" ]; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    [ -f "$HOME/.local/bin/uv" ] && mv "$HOME/.local/bin/uv" "$UV_HOME/bin/"
    [ -f "$HOME/.local/bin/uvx" ] && mv "$HOME/.local/bin/uvx" "$UV_HOME/bin/"
fi
ln -sf "$UV_HOME/bin/uv" "$HOME/.local/bin/uv"
ln -sf "$UV_HOME/bin/uvx" "$HOME/.local/bin/uvx"

# 2. Create persistent cache directories
echo "📦 Setting up caches..."
mkdir -p "$PERSISTENT_VOL/.cache/uv" "$PERSISTENT_VOL/.cache/pip" "$PERSISTENT_VOL/.npm"

# 3. Update shell configuration
echo "🔧 Configuring shell..."
cat >> "$HOME/.bashrc" << 'BASHRC_EOF'

# === PERSISTENT VOLUME SETUP (Auto-generated) ===
export PERSISTENT_VOL="/persistent"
export PATH="$HOME/.local/bin:$PERSISTENT_VOL/.local/bin:$PATH"
export UV_CACHE_DIR="$PERSISTENT_VOL/.cache/uv"
export PIP_CACHE_DIR="$PERSISTENT_VOL/.cache/pip"
export NPM_CONFIG_CACHE="$PERSISTENT_VOL/.npm"
export UV_TOOL_DIR="$PERSISTENT_VOL/.local/share/uv/tools"
export UV_PYTHON_INSTALL_DIR="$PERSISTENT_VOL/.local/share/uv/python"
# === END PERSISTENT VOLUME SETUP ===
BASHRC_EOF

# 4. Create symlinks
echo "🔗 Creating symlinks..."
[ -d "$WORKSPACE" ] && ln -sf "$WORKSPACE" "$HOME/marketplace"
[ -d "$PERSISTENT_VOL/.aws" ] && ln -sf "$PERSISTENT_VOL/.aws" "$HOME/.aws"

# 5. Install Node.js 18
NODE_VER=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VER" -lt 18 ]; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - >/dev/null 2>&1
    sudo apt-get install -y nodejs >/dev/null 2>&1
fi

# 6. Apply environment for current session
export PATH="$HOME/.local/bin:$PERSISTENT_VOL/.local/bin:$PATH"
export UV_CACHE_DIR="$PERSISTENT_VOL/.cache/uv"
export NPM_CONFIG_CACHE="$PERSISTENT_VOL/.npm"

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "📝 Next steps:"
echo "   1. source ~/.bashrc"
echo "   2. cd ~/marketplace"
echo "   3. ./deploy-full.sh"
echo ""
echo "🔧 Installed:"
echo "   - uv: $(uv --version 2>/dev/null || echo 'not in PATH yet')"
echo "   - Node: $(node --version 2>/dev/null || echo 'not found')"
echo "   - npm: $(npm --version 2>/dev/null || echo 'not found')"
echo ""
