# Spot Instance Setup Scripts

## Quick Start (New Spot Instance)

```bash
# 1. Run quick setup (installs uv, Node 18, creates symlinks)
./quick-setup.sh

# 2. Reload shell
source ~/.bashrc

# 3. Navigate to workspace
cd ~/marketplace

# 4. Deploy
./deploy-full.sh
```

## Scripts Overview

### `quick-setup.sh` ⚡
**Use this first on any new spot instance**
- Installs `uv/uvx` to persistent volume (`/persistent/.local/bin`)
- Creates symlinks for workspace and AWS credentials
- Installs Node.js 18 if needed
- Updates PATH in `.bashrc`
- **Runtime:** ~2 minutes

### `setup-spot-instance.sh` 🔧
**Full setup with all features**
- Everything in quick-setup plus:
- Persistent cache directories (npm, pip, uv)
- Kiro settings symlink
- Project dependency installation
- Comprehensive verification
- **Runtime:** ~5-10 minutes

### `verify-setup.sh` ✅
**Check if everything is configured correctly**
- Verifies all symlinks
- Checks command availability
- Shows environment variables
- Displays PATH configuration

### `deploy-full.sh` 🚀
**Main deployment script**
- Auto-installs `uv` if missing
- Deploys backend (CDK)
- Builds and deploys frontend
- Seeds database
- **Runtime:** ~10-15 minutes

## Persistent Volume Structure

```
/persistent/
├── .local/
│   └── bin/
│       ├── uv          # Python package manager
│       └── uvx         # uv executor
├── .cache/
│   ├── uv/            # uv cache (survives restarts)
│   ├── pip/           # pip cache
│   └── npm/           # npm cache
├── .aws/              # AWS credentials
├── .npm/              # npm global cache
└── vscode-workspace/
    └── kiro-cloudnetsle-marketplace/  # Your project
```

## Symlinks Created

```
~/marketplace -> /persistent/vscode-workspace/kiro-cloudnetsle-marketplace
~/.local/bin/uv -> /persistent/.local/bin/uv
~/.local/bin/uvx -> /persistent/.local/bin/uvx
~/.aws -> /persistent/.aws
~/.cache/uv -> /persistent/.cache/uv
```

## Environment Variables

Added to `~/.bashrc`:
```bash
export PATH="$HOME/.local/bin:/persistent/.local/bin:$PATH"
export UV_CACHE_DIR="/persistent/.cache/uv"
export PIP_CACHE_DIR="/persistent/.cache/pip"
export NPM_CONFIG_CACHE="/persistent/.npm"
export UV_TOOL_DIR="/persistent/.local/share/uv/tools"
export UV_PYTHON_INSTALL_DIR="/persistent/.local/share/uv/python"
export PERSISTENT_VOL="/persistent"
```

## Troubleshooting

### MCP Servers Not Loading
```bash
# Check if uvx is available
which uvx

# Should show: /home/ubuntu/.local/bin/uvx or /persistent/.local/bin/uvx
# If not found, run: ./quick-setup.sh
```

### Node.js Version Issues
```bash
# Check version
node --version  # Should be v18.x.x or higher

# If v12.x.x, reinstall:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Symlinks Broken
```bash
# Verify setup
./verify-setup.sh

# Recreate symlinks
./quick-setup.sh
```

### PATH Not Updated
```bash
# Reload shell
source ~/.bashrc

# Or logout and login again
```

## What Survives Spot Instance Termination

✅ **Survives** (on persistent volume):
- uv/uvx binaries
- npm/pip/uv caches
- AWS credentials
- Project code
- Node modules (if in persistent volume)

❌ **Doesn't survive** (needs quick-setup.sh):
- Symlinks in home directory
- PATH updates in `.bashrc`
- Node.js installation (system package)

## Best Practices

1. **Always use persistent volume** for tools and caches
2. **Run quick-setup.sh** immediately on new spot instance
3. **Keep AWS credentials** in `/persistent/.aws`
4. **Use deploy-full.sh** for all deployments (auto-installs dependencies)
5. **Verify setup** with `./verify-setup.sh` before deploying
