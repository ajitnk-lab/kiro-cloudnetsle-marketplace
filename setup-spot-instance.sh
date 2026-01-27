#!/bin/bash

# Setup script for new spot instances with persistent volume
# Run this once when launching a new spot instance

set -e

PERSISTENT_VOL="${PERSISTENT_VOL:-/persistent}"
WORKSPACE_DIR="$PERSISTENT_VOL/vscode-workspace/kiro-cloudnetsle-marketplace"

echo "🚀 Setting up spot instance environment..."
echo "📁 Persistent volume: $PERSISTENT_VOL"
echo "📁 Workspace: $WORKSPACE_DIR"

# 1. Create symlink to workspace in home directory
if [ -d "$WORKSPACE_DIR" ]; then
    echo "🔗 Creating workspace symlink..."
    ln -sf "$WORKSPACE_DIR" "$HOME/marketplace"
    echo "   ✅ Symlink: ~/marketplace -> $WORKSPACE_DIR"
else
    echo "   ⚠️  Workspace not found at $WORKSPACE_DIR"
fi

# 2. Install uv to persistent volume (survives instance termination)
UV_HOME="$PERSISTENT_VOL/.local"
mkdir -p "$UV_HOME/bin"

if [ ! -f "$UV_HOME/bin/uv" ]; then
    echo "📦 Installing uv to persistent volume..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Move to persistent volume
    if [ -f "$HOME/.local/bin/uv" ]; then
        mv "$HOME/.local/bin/uv" "$UV_HOME/bin/"
        mv "$HOME/.local/bin/uvx" "$UV_HOME/bin/"
    fi
    
    echo "   ✅ uv installed to $UV_HOME/bin"
else
    echo "   ✅ uv already in persistent volume"
fi

# 3. Create symlinks for uv binaries
ln -sf "$UV_HOME/bin/uv" "$HOME/.local/bin/uv" 2>/dev/null || true
ln -sf "$UV_HOME/bin/uvx" "$HOME/.local/bin/uvx" 2>/dev/null || true
mkdir -p "$HOME/.local/bin"
ln -sf "$UV_HOME/bin/uv" "$HOME/.local/bin/uv"
ln -sf "$UV_HOME/bin/uvx" "$HOME/.local/bin/uvx"

# 4. Update PATH in all shell profiles
PATHS_TO_ADD=(
    "$HOME/.local/bin"
    "$UV_HOME/bin"
    "$PERSISTENT_VOL/bin"
)

for SHELL_RC in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    if [ -f "$SHELL_RC" ]; then
        # Remove old PATH entries to avoid duplicates
        sed -i '/# PERSISTENT_VOLUME_PATHS/d' "$SHELL_RC"
        sed -i '/export PATH.*\.local\/bin/d' "$SHELL_RC"
        
        # Add new PATH entries
        echo "" >> "$SHELL_RC"
        echo "# PERSISTENT_VOLUME_PATHS" >> "$SHELL_RC"
        for P in "${PATHS_TO_ADD[@]}"; do
            echo "export PATH=\"$P:\$PATH\"" >> "$SHELL_RC"
        done
        echo "   ✅ Updated $SHELL_RC"
    fi
done

# Apply PATH for current session
for P in "${PATHS_TO_ADD[@]}"; do
    export PATH="$P:$PATH"
done

# 5. Create persistent directories for caches
echo "📦 Setting up persistent cache directories..."
CACHE_DIRS=(
    "$PERSISTENT_VOL/.cache/uv"
    "$PERSISTENT_VOL/.cache/pip"
    "$PERSISTENT_VOL/.npm"
    "$PERSISTENT_VOL/.kiro"
)

for DIR in "${CACHE_DIRS[@]}"; do
    mkdir -p "$DIR"
    # Create symlinks from home
    LINK_NAME="$HOME/$(basename $DIR)"
    ln -sf "$DIR" "$LINK_NAME"
done

# Set environment variables for caches
cat >> "$HOME/.bashrc" << 'ENVEOF'
# Cache directories on persistent volume
export UV_CACHE_DIR="$PERSISTENT_VOL/.cache/uv"
export PIP_CACHE_DIR="$PERSISTENT_VOL/.cache/pip"
export NPM_CONFIG_CACHE="$PERSISTENT_VOL/.npm"
export UV_TOOL_DIR="$PERSISTENT_VOL/.local/share/uv/tools"
export UV_PYTHON_INSTALL_DIR="$PERSISTENT_VOL/.local/share/uv/python"
ENVEOF

# Apply for current session
export UV_CACHE_DIR="$PERSISTENT_VOL/.cache/uv"
export PIP_CACHE_DIR="$PERSISTENT_VOL/.cache/pip"
export NPM_CONFIG_CACHE="$PERSISTENT_VOL/.npm"
export UV_TOOL_DIR="$PERSISTENT_VOL/.local/share/uv/tools"
export UV_PYTHON_INSTALL_DIR="$PERSISTENT_VOL/.local/share/uv/python"

echo "   ✅ Cache directories configured"

# 6. Symlink AWS credentials if on persistent volume
if [ -d "$PERSISTENT_VOL/.aws" ]; then
    echo "🔐 Linking AWS credentials..."
    ln -sf "$PERSISTENT_VOL/.aws" "$HOME/.aws"
    echo "   ✅ AWS credentials linked"
fi

# 7. Symlink Kiro settings if on persistent volume
if [ -d "$WORKSPACE_DIR/.kiro" ]; then
    echo "🤖 Linking Kiro settings..."
    mkdir -p "$HOME/.config"
    ln -sf "$WORKSPACE_DIR/.kiro" "$HOME/.config/kiro"
    echo "   ✅ Kiro settings linked"
fi

# 8. Install/Upgrade Node.js 18
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "   ✅ Node.js $(node --version)"
else
    echo "   ✅ Node.js $(node --version)"
fi

# 9. Verify AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it manually."
else
    echo "   ✅ AWS CLI $(aws --version)"
fi

# 10. Install project dependencies (use persistent npm cache)
if [ -d "$WORKSPACE_DIR" ]; then
    cd "$WORKSPACE_DIR"
    if [ -f "package.json" ]; then
        echo "📦 Installing project dependencies..."
        npm install
        echo "   ✅ Dependencies installed"
    fi
fi

echo ""
echo "✅ Spot instance setup complete!"
echo ""
echo "🔧 Installed tools:"
echo "   - uv/uvx: $(uv --version 2>/dev/null || echo 'not found')"
echo "   - Node.js: $(node --version 2>/dev/null || echo 'not found')"
echo "   - npm: $(npm --version 2>/dev/null || echo 'not found')"
echo "   - AWS CLI: $(aws --version 2>/dev/null || echo 'not found')"
echo ""
echo "🔗 Symlinks created:"
echo "   - ~/marketplace -> $WORKSPACE_DIR"
echo "   - ~/.local/bin/uv -> $UV_HOME/bin/uv"
echo "   - ~/.local/bin/uvx -> $UV_HOME/bin/uvx"
echo "   - ~/.aws -> $PERSISTENT_VOL/.aws"
echo "   - ~/.cache/uv -> $PERSISTENT_VOL/.cache/uv"
echo ""
echo "📝 Environment variables set:"
echo "   - UV_CACHE_DIR=$UV_CACHE_DIR"
echo "   - NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE"
echo ""
echo "📝 Next steps:"
echo "   1. Source your shell: source ~/.bashrc"
echo "   2. Navigate to workspace: cd ~/marketplace"
echo "   3. Run deployment: ./deploy-full.sh"
echo ""
