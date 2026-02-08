# Sandbox Docker Image for Code Execution
# Alpine-based for smaller size and faster builds

FROM alpine:3.19

# Install compilers and runtime dependencies
RUN apk add --no-cache \
    g++ \
    gcc \
    python3 \
    libgcc \
    libstdc++ \
    coreutils \
    bash \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Create workspace directory
RUN mkdir -p /workspace && chmod 777 /workspace

# Create non-root user for running code
RUN adduser -D -s /bin/bash sandbox

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
