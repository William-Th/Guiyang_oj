# Sandbox Docker Image for Code Execution
# This image provides a secure, isolated environment for compiling and running user code

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install compilers and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # C/C++ compiler
    g++ \
    gcc \
    # Python 3
    python3 \
    python3-minimal \
    # Libraries
    libc-dev \
    libstdc++6 \
    # Time and process utilities
    time \
    # Clean up to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    # Create symlink for python command
    && ln -sf /usr/bin/python3 /usr/bin/python

# Create workspace directory
RUN mkdir -p /workspace && chmod 777 /workspace

# Create non-root user for running code
RUN useradd -m -s /bin/bash sandbox

# Set resource limits in the image
# Note: Actual limits are enforced by Docker container configuration
RUN echo "* soft nproc 64" >> /etc/security/limits.conf \
    && echo "* hard nproc 64" >> /etc/security/limits.conf \
    && echo "* soft nofile 256" >> /etc/security/limits.conf \
    && echo "* hard nofile 256" >> /etc/security/limits.conf

# Set working directory
WORKDIR /workspace

# Note: Running as root for file permissions with Docker volume mounts
# Security is maintained through Docker container isolation (no network, limited resources)

# Default command (will be overridden)
CMD ["/bin/bash"]
