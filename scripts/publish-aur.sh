#!/bin/bash
# =============================================================================
# WorkoPilot AUR Publisher
# Automatiza o processo de publicar nova versão no AUR
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# =============================================================================
# Helper Functions
# =============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

get_current_version() {
    grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

bump_version() {
    local current=$1
    local type=$2
    
    IFS='.' read -r major minor patch <<< "$current"
    
    case $type in
        major) echo "$((major + 1)).0.0" ;;
        minor) echo "$major.$((minor + 1)).0" ;;
        patch) echo "$major.$minor.$((patch + 1))" ;;
        *) echo "$current" ;;
    esac
}

update_version_in_files() {
    local old_version=$1
    local new_version=$2
    
    log_info "Updating version from $old_version to $new_version..."
    
    # package.json
    sed -i "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/" package.json
    
    # tauri.conf.json
    sed -i "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/" src-tauri/tauri.conf.json
    
    # Cargo.toml
    sed -i "s/^version = \"$old_version\"/version = \"$new_version\"/" src-tauri/Cargo.toml
    
    # PKGBUILD
    sed -i "s/^pkgver=$old_version/pkgver=$new_version/" aur/PKGBUILD
    
    # prepare-release.sh
    sed -i "s/VERSION=\"$old_version\"/VERSION=\"$new_version\"/" aur/prepare-release.sh
    
    log_success "Version updated in all files"
}

get_commits_since_tag() {
    local tag=$1
    if git rev-parse "$tag" >/dev/null 2>&1; then
        git log "$tag"..HEAD --pretty=format:"- %s" --no-merges 2>/dev/null || echo "- Initial release"
    else
        git log --pretty=format:"- %s" --no-merges -20 2>/dev/null || echo "- Initial release"
    fi
}

generate_changelog_entry() {
    local version=$1
    local date=$(date +%Y-%m-%d)
    local commits=$(get_commits_since_tag "v$(get_current_version)")
    
    cat << EOF

## [$version] - $date

### Changes
$commits
EOF
}

update_changelog() {
    local version=$1
    local entry=$(generate_changelog_entry "$version")
    
    if [ ! -f "CHANGELOG.md" ]; then
        cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to WorkoPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
EOF
    fi
    
    # Insert new entry after the header (line 6)
    local temp_file=$(mktemp)
    head -6 CHANGELOG.md > "$temp_file"
    echo "$entry" >> "$temp_file"
    tail -n +7 CHANGELOG.md >> "$temp_file"
    mv "$temp_file" CHANGELOG.md
    
    log_success "CHANGELOG.md updated"
}

# =============================================================================
# Main Script
# =============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           WorkoPilot AUR Publisher                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(get_current_version)
log_info "Current version: $CURRENT_VERSION"

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "  1) patch  (bug fixes)           - $CURRENT_VERSION -> $(bump_version $CURRENT_VERSION patch)"
echo "  2) minor  (new features)        - $CURRENT_VERSION -> $(bump_version $CURRENT_VERSION minor)"
echo "  3) major  (breaking changes)    - $CURRENT_VERSION -> $(bump_version $CURRENT_VERSION major)"
echo "  4) custom (enter manually)"
echo "  5) skip   (keep current version)"
echo ""
read -p "Choice [1-5]: " choice

case $choice in
    1) NEW_VERSION=$(bump_version $CURRENT_VERSION patch) ;;
    2) NEW_VERSION=$(bump_version $CURRENT_VERSION minor) ;;
    3) NEW_VERSION=$(bump_version $CURRENT_VERSION major) ;;
    4) read -p "Enter new version: " NEW_VERSION ;;
    5) NEW_VERSION=$CURRENT_VERSION ;;
    *) log_error "Invalid choice" ;;
esac

log_info "New version will be: $NEW_VERSION"

# Confirm
echo ""
read -p "Continue with v$NEW_VERSION? [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    log_warn "Aborted by user"
    exit 0
fi

# Step 1: Update versions
if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
    update_version_in_files "$CURRENT_VERSION" "$NEW_VERSION"
    update_changelog "$NEW_VERSION"
fi

# Step 2: Build Tauri app
echo ""
log_info "Building release binary..."
if ! bun run build 2>&1 | tee /tmp/build.log; then
    # Check if it's just the AppImage bundling issue
    if grep -q "failed to run linuxdeploy" /tmp/build.log; then
        log_warn "AppImage bundling failed (known issue), but binary was built successfully"
    else
        log_error "Build failed"
    fi
fi

# Verify binary exists
if [ ! -f "src-tauri/target/release/workopilot" ]; then
    log_error "Binary not found at src-tauri/target/release/workopilot"
fi
log_success "Tauri binary built successfully"

# Step 2.5: Build sidecar (Bun TypeScript server)
echo ""
log_info "Building sidecar binary..."
cd "$PROJECT_ROOT/packages/sidecar"

# Compile TypeScript sidecar to standalone executable
if ! bun build --compile --target=bun-linux-x64 src/index.ts --outfile "$PROJECT_ROOT/src-tauri/target/release/workopilot-sidecar" 2>&1; then
    log_error "Sidecar build failed"
fi

cd "$PROJECT_ROOT"

# Verify sidecar binary exists
if [ ! -f "src-tauri/target/release/workopilot-sidecar" ]; then
    log_error "Sidecar binary not found at src-tauri/target/release/workopilot-sidecar"
fi
log_success "Sidecar binary built successfully"

# Step 3: Prepare release tarball
echo ""
log_info "Preparing release tarball..."

RELEASE_DIR="workopilot-linux-x86_64"
cd aur
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/icons"

cp "$PROJECT_ROOT/src-tauri/target/release/workopilot" "$RELEASE_DIR/"
cp "$PROJECT_ROOT/src-tauri/target/release/workopilot-sidecar" "$RELEASE_DIR/"
cp workopilot.desktop "$RELEASE_DIR/"
cp "$PROJECT_ROOT/src-tauri/icons/32x32.png" "$RELEASE_DIR/icons/"
cp "$PROJECT_ROOT/src-tauri/icons/128x128.png" "$RELEASE_DIR/icons/"
cp "$PROJECT_ROOT/src-tauri/icons/128x128@2x.png" "$RELEASE_DIR/icons/"

if [ -f "$PROJECT_ROOT/LICENSE" ]; then
    cp "$PROJECT_ROOT/LICENSE" "$RELEASE_DIR/"
else
    cat > "$RELEASE_DIR/LICENSE" << EOF
MIT License

Copyright (c) $(date +%Y) Pedro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
fi

TARBALL="${RELEASE_DIR}.tar.gz"
tar -czvf "$TARBALL" "$RELEASE_DIR"
log_success "Tarball created: aur/$TARBALL"

# Step 4: Calculate SHA256
NEW_SHA256=$(sha256sum "$TARBALL" | cut -d' ' -f1)
log_info "SHA256: $NEW_SHA256"

# Update PKGBUILD with new sha256
sed -i "s/sha256sums=('.*')/sha256sums=('$NEW_SHA256')/" PKGBUILD

# Step 5: Generate .SRCINFO
log_info "Generating .SRCINFO..."
makepkg --printsrcinfo > .SRCINFO
log_success ".SRCINFO generated"

cd "$PROJECT_ROOT"

# Step 6: Commit changes
echo ""
log_info "Committing version bump..."
git add -A
git commit -m "chore: bump version to v$NEW_VERSION

Changes:
$(get_commits_since_tag "v$CURRENT_VERSION" | head -10)"

# Step 7: Create GitHub release
echo ""
log_info "Creating GitHub release..."

RELEASE_NOTES=$(cat << EOF
## WorkoPilot v$NEW_VERSION

### Changes
$(get_commits_since_tag "v$CURRENT_VERSION")

### Installation (Arch Linux)
\`\`\`bash
yay -S workopilot-bin
\`\`\`

### Manual Installation
Download the tarball and extract:
\`\`\`bash
tar -xzf workopilot-linux-x86_64.tar.gz
cd workopilot-linux-x86_64
sudo install -Dm755 workopilot /usr/bin/workopilot
\`\`\`
EOF
)

git push origin HEAD
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "v$NEW_VERSION"

gh release create "v$NEW_VERSION" "aur/$TARBALL" \
    --title "v$NEW_VERSION" \
    --notes "$RELEASE_NOTES"

log_success "GitHub release created: v$NEW_VERSION"

# Step 8: Push to AUR
echo ""
log_info "Pushing to AUR..."

AUR_REPO_DIR="/tmp/workopilot-aur"
rm -rf "$AUR_REPO_DIR"

if ! git clone ssh://aur@aur.archlinux.org/workopilot-bin.git "$AUR_REPO_DIR" 2>/dev/null; then
    log_warn "Could not clone AUR repo. You may need to:"
    echo "  1. Create the package on AUR first: https://aur.archlinux.org/pkgbase/workopilot-bin/submit/"
    echo "  2. Add your SSH key to AUR: https://aur.archlinux.org/account/"
    echo ""
    echo "Manual steps to push to AUR:"
    echo "  cd aur"
    echo "  git clone ssh://aur@aur.archlinux.org/workopilot-bin.git aur-repo"
    echo "  cp PKGBUILD .SRCINFO workopilot-bin.install aur-repo/"
    echo "  cd aur-repo && git add -A && git commit -m 'Update to v$NEW_VERSION' && git push"
    exit 0
fi

cp aur/PKGBUILD "$AUR_REPO_DIR/"
cp aur/.SRCINFO "$AUR_REPO_DIR/"
cp aur/workopilot-bin.install "$AUR_REPO_DIR/"

cd "$AUR_REPO_DIR"
git add -A
git commit -m "Update to v$NEW_VERSION"
git push

log_success "Pushed to AUR!"

# Done!
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    RELEASE COMPLETE!                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Version: v$NEW_VERSION"
echo "  GitHub:  https://github.com/pedrinhopagan/workopilot/releases/tag/v$NEW_VERSION"
echo "  AUR:     https://aur.archlinux.org/packages/workopilot-bin"
echo ""
echo "Users can now update with: yay -S workopilot-bin"
echo ""
