#!/bin/bash
# Script to prepare the release tarball for AUR
# Run this after `bun run build` completes successfully

set -e

VERSION="0.2.0"
RELEASE_DIR="workopilot-linux-x86_64"
TARBALL="${RELEASE_DIR}.tar.gz"

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if binary exists
if [ ! -f "src-tauri/target/release/workopilot" ]; then
    echo "Error: Binary not found. Run 'bun run build' first."
    exit 1
fi

# Create release directory
rm -rf "aur/${RELEASE_DIR}"
mkdir -p "aur/${RELEASE_DIR}/icons"

# Copy binary
cp "src-tauri/target/release/workopilot" "aur/${RELEASE_DIR}/"

# Copy desktop entry
cp "aur/workopilot.desktop" "aur/${RELEASE_DIR}/"

# Copy icons
cp "src-tauri/icons/32x32.png" "aur/${RELEASE_DIR}/icons/"
cp "src-tauri/icons/128x128.png" "aur/${RELEASE_DIR}/icons/"
cp "src-tauri/icons/128x128@2x.png" "aur/${RELEASE_DIR}/icons/"

# Create LICENSE if it doesn't exist
if [ -f "LICENSE" ]; then
    cp "LICENSE" "aur/${RELEASE_DIR}/"
else
    echo "MIT License" > "aur/${RELEASE_DIR}/LICENSE"
    echo "" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "Copyright (c) $(date +%Y) Pedro" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "Permission is hereby granted, free of charge, to any person obtaining a copy" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "of this software and associated documentation files (the \"Software\"), to deal" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "in the Software without restriction, including without limitation the rights" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "copies of the Software, and to permit persons to whom the Software is" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "furnished to do so, subject to the following conditions:" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "The above copyright notice and this permission notice shall be included in all" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "copies or substantial portions of the Software." >> "aur/${RELEASE_DIR}/LICENSE"
    echo "" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY," >> "aur/${RELEASE_DIR}/LICENSE"
    echo "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM," >> "aur/${RELEASE_DIR}/LICENSE"
    echo "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE" >> "aur/${RELEASE_DIR}/LICENSE"
    echo "SOFTWARE." >> "aur/${RELEASE_DIR}/LICENSE"
fi

# Create tarball
cd aur
tar -czvf "${TARBALL}" "${RELEASE_DIR}"

echo ""
echo "Release tarball created: aur/${TARBALL}"
echo ""
echo "Next steps:"
echo "1. Upload ${TARBALL} to GitHub releases as v${VERSION}"
echo "2. Update PKGBUILD sha256sums with: sha256sum ${TARBALL}"
echo "3. Test locally with: makepkg -si"
echo "4. Push to AUR"
