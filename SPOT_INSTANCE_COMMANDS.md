# Spot Instance Setup - Complete Solution

## ✅ What Was Fixed

1. **MCP Server Loading Issues**
   - Root cause: `uvx` command not found
   - Solution: Installed `uv` (Python package manager) to persistent volume
   - Location: `/persistent/.local/bin/uv` and `/persistent/.local/bin/uvx`

2. **Persistent Volume Integration**
   - All tools installed to `/persistent` (survives spot instance termination)
   - Symlinks created in home directory for easy access
   - Caches moved to persistent volume (npm, pip, uv)

3. **PATH Configuration**
   - Updated `.bashrc`, `.zshrc`, and `.profile`
   - Persistent volume bins added to PATH
   - Environment variables for cache directories

## 📋 Commands to Add to Your Deployment Script

Add this to the beginning of `deploy-full.sh`:

```bash
# Install uv if not present (required for MCP servers)
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv (Python package manager)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    echo "   ✅ uv installed"
fi
```

**Already added to:** `deploy-full.sh` ✅

## 🚀 For Next Spot Instance

### Option 1: Quick Setup (Recommended)
```bash
cd /persistent/vscode-workspace/kiro-cloudnetsle-marketplace
./quick-setup.sh
source ~/.bashrc
cd ~/marketplace
./deploy-full.sh
```

### Option 2: Full Setup
```bash
cd /persistent/vscode-workspace/kiro-cloudnetsle-marketplace
./setup-spot-instance.sh
source ~/.bashrc
cd ~/marketplace
./deploy-full.sh
```

## 📁 Files Created

1. **`quick-setup.sh`** - Fast setup for new instances (2 min)
2. **`setup-spot-instance.sh`** - Complete setup with all features (5-10 min)
3. **`verify-setup.sh`** - Verify configuration
4. **`SPOT_INSTANCE_SETUP.md`** - Complete documentation
5. **`SPOT_INSTANCE_COMMANDS.md`** - This file

## 🔗 Symlinks Created

```
~/marketplace -> /persistent/vscode-workspace/kiro-cloudnetsle-marketplace
~/.local/bin/uv -> /persistent/.local/bin/uv
~/.local/bin/uvx -> /persistent/.local/bin/uvx
~/.aws -> /persistent/.aws (if exists)
```

## 🌍 Environment Variables

```bash
export PATH="$HOME/.local/bin:/persistent/.local/bin:$PATH"
export UV_CACHE_DIR="/persistent/.cache/uv"
export PIP_CACHE_DIR="/persistent/.cache/pip"
export NPM_CONFIG_CACHE="/persistent/.npm"
export UV_TOOL_DIR="/persistent/.local/share/uv/tools"
export UV_PYTHON_INSTALL_DIR="/persistent/.local/share/uv/python"
export PERSISTENT_VOL="/persistent"
```

## ✅ Current Status

- ✅ `uv/uvx` installed to persistent volume
- ✅ Symlinks created
- ✅ PATH updated in shell profiles
- ✅ MCP servers should now load correctly
- ⚠️  Node.js 12 detected (will be upgraded to 18 on next setup)

## 🧪 Test MCP Servers

After setup, test if MCP servers work:

```bash
# Test uvx
uvx --version

# Test MCP server (example)
uvx awslabs.core-mcp-server@latest --help
```

## 📝 What to Remember

1. **Always run on new spot instance:** `./quick-setup.sh`
2. **Reload shell after setup:** `source ~/.bashrc`
3. **Verify before deploying:** `./verify-setup.sh`
4. **Use deploy-full.sh:** It auto-installs missing dependencies

## 🔧 Troubleshooting

### MCP Servers Still Not Loading
```bash
# Check uvx
which uvx
uvx --version

# Reload shell
source ~/.bashrc

# Verify PATH
echo $PATH | grep -o '/[^:]*local[^:]*'
```

### Symlinks Broken
```bash
./verify-setup.sh
./quick-setup.sh  # Recreate
```

### Node.js Too Old
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v18.x.x
```
