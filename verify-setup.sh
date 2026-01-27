#!/bin/bash

# Verify persistent volume setup
# Run this to check if everything is properly configured

PERSISTENT_VOL="${PERSISTENT_VOL:-/persistent}"

echo "🔍 Checking persistent volume setup..."
echo ""

echo "📁 Directories:"
echo "   Persistent volume: $PERSISTENT_VOL $([ -d "$PERSISTENT_VOL" ] && echo '✅' || echo '❌')"
echo "   Workspace: $PERSISTENT_VOL/vscode-workspace/kiro-cloudnetsle-marketplace $([ -d "$PERSISTENT_VOL/vscode-workspace/kiro-cloudnetsle-marketplace" ] && echo '✅' || echo '❌')"
echo ""

echo "🔗 Symlinks:"
[ -L "$HOME/marketplace" ] && echo "   ✅ ~/marketplace -> $(readlink $HOME/marketplace)" || echo "   ❌ ~/marketplace (missing)"
[ -L "$HOME/.local/bin/uv" ] && echo "   ✅ ~/.local/bin/uv -> $(readlink $HOME/.local/bin/uv)" || echo "   ❌ ~/.local/bin/uv (missing)"
[ -L "$HOME/.local/bin/uvx" ] && echo "   ✅ ~/.local/bin/uvx -> $(readlink $HOME/.local/bin/uvx)" || echo "   ❌ ~/.local/bin/uvx (missing)"
[ -L "$HOME/.aws" ] && echo "   ✅ ~/.aws -> $(readlink $HOME/.aws)" || echo "   ⚠️  ~/.aws (not symlinked)"
echo ""

echo "🔧 Commands available:"
command -v uv &>/dev/null && echo "   ✅ uv: $(which uv)" || echo "   ❌ uv not found"
command -v uvx &>/dev/null && echo "   ✅ uvx: $(which uvx)" || echo "   ❌ uvx not found"
command -v node &>/dev/null && echo "   ✅ node: $(which node) ($(node --version))" || echo "   ❌ node not found"
command -v npm &>/dev/null && echo "   ✅ npm: $(which npm) ($(npm --version))" || echo "   ❌ npm not found"
command -v aws &>/dev/null && echo "   ✅ aws: $(which aws)" || echo "   ❌ aws not found"
echo ""

echo "🌍 Environment variables:"
echo "   PERSISTENT_VOL: ${PERSISTENT_VOL:-not set}"
echo "   UV_CACHE_DIR: ${UV_CACHE_DIR:-not set}"
echo "   NPM_CONFIG_CACHE: ${NPM_CONFIG_CACHE:-not set}"
echo ""

echo "📝 PATH:"
echo "$PATH" | tr ':' '\n' | grep -E "(local|persistent)" | sed 's/^/   /'
echo ""

if command -v uv &>/dev/null && command -v node &>/dev/null; then
    echo "✅ All critical tools available!"
else
    echo "❌ Some tools missing. Run ./setup-spot-instance.sh"
fi
