#!/bin/bash
# Build the sandbox Docker image

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${SANDBOX_IMAGE:-guiyang_oj_sandbox:latest}"

echo "Building sandbox image: $IMAGE_NAME"

docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

echo "Sandbox image built successfully!"
echo "Image: $IMAGE_NAME"

# Verify the image
echo ""
echo "Verifying image..."
docker run --rm "$IMAGE_NAME" g++ --version
echo ""
echo "C++ compiler verified."
