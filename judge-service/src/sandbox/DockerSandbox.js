/**
 * Docker Sandbox - Secure code execution environment
 */

const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const config = require('../config');
const logger = require('../utils/logger');

class DockerSandbox {
  constructor() {
    this.docker = new Docker();
    // Use configured temp dir (important for Docker-in-Docker scenarios)
    this.tempDir = config.sandbox.tempDir || path.join(os.tmpdir(), 'judge-sandbox');
    // Host mount path for DinD - will be resolved during init
    this.hostMountPath = null;
  }

  /**
   * Initialize sandbox environment
   */
  async init() {
    // Create temp directory if not exists
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info('Sandbox temp directory created', { path: this.tempDir });
    } catch (err) {
      logger.error('Failed to create temp directory', { error: err.message });
      throw err;
    }

    // For Docker-in-Docker: resolve the host mount path
    // Check if we're running inside a container and get the volume mount path
    try {
      // Try to get the volume info for judge_sandbox
      const volumes = await this.docker.listVolumes();
      const judgeVolume = volumes.Volumes?.find(v => v.Name.includes('judge_sandbox'));
      if (judgeVolume) {
        this.hostMountPath = judgeVolume.Mountpoint;
        logger.info('Docker volume mount path resolved', {
          volumeName: judgeVolume.Name,
          mountpoint: this.hostMountPath
        });
      }
    } catch (err) {
      logger.warn('Could not resolve Docker volume mount path', { error: err.message });
    }

    // If no volume found, use the configured path directly (non-DinD scenario)
    if (!this.hostMountPath) {
      this.hostMountPath = this.tempDir;
      logger.info('Using direct path for sandbox', { path: this.hostMountPath });
    }

    // Check if sandbox image exists
    try {
      const images = await this.docker.listImages();
      const sandboxImage = images.find(img =>
        img.RepoTags && img.RepoTags.includes(config.sandbox.image)
      );

      if (!sandboxImage) {
        logger.warn('Sandbox image not found, please build it first', {
          image: config.sandbox.image
        });
      } else {
        logger.info('Sandbox image found', { image: config.sandbox.image });
      }
    } catch (err) {
      logger.error('Failed to connect to Docker', { error: err.message });
      throw err;
    }
  }

  /**
   * Create a sandbox container for code execution
   * @param {string} sessionId - Unique session ID
   * @returns {Object} Sandbox instance with methods
   */
  async createSandbox(sessionId = null) {
    const sandboxId = sessionId || uuidv4();
    const workDir = path.join(this.tempDir, sandboxId);
    // For Docker-in-Docker: use the host mount path for Docker volume binding
    const hostWorkDir = path.join(this.hostMountPath, sandboxId);

    // Create workspace directory
    await fs.mkdir(workDir, { recursive: true });

    logger.debug('Created sandbox workspace', { sandboxId, workDir, hostWorkDir });

    return {
      id: sandboxId,
      workDir,

      /**
       * Write a file to sandbox workspace
       */
      writeFile: async (filename, content) => {
        const filePath = path.join(workDir, filename);
        await fs.writeFile(filePath, content, 'utf8');
        logger.debug('File written to sandbox', { sandboxId, filename });
        return filePath;
      },

      /**
       * Read a file from sandbox workspace
       */
      readFile: async (filename) => {
        const filePath = path.join(workDir, filename);
        try {
          return await fs.readFile(filePath, 'utf8');
        } catch (err) {
          if (err.code === 'ENOENT') {
            return null;
          }
          throw err;
        }
      },

      /**
       * Execute a command in sandbox container
       */
      exec: async (command, options = {}) => {
        const {
          timeout = config.limits.runTimeout,
          memoryLimit = config.sandbox.memoryLimit,
          stdin = null
        } = options;

        // Write stdin to file if provided (avoids race condition with Docker stdin)
        let actualCommand = command;
        if (stdin !== null && stdin !== '') {
          const inputFilePath = path.join(workDir, 'input.txt');
          await fs.writeFile(inputFilePath, stdin, 'utf8');
          // Modify command to read from input file
          // e.g., ['./main'] becomes ['sh', '-c', './main < input.txt']
          const cmdStr = Array.isArray(command) ? command.join(' ') : command;
          actualCommand = ['sh', '-c', `${cmdStr} < input.txt`];
        }

        const containerConfig = {
          Image: config.sandbox.image,
          Cmd: actualCommand,
          WorkingDir: config.sandbox.workDir,
          HostConfig: {
            // Use hostWorkDir for binding - this is the path as seen by Docker daemon
            Binds: [`${hostWorkDir}:${config.sandbox.workDir}:rw`],
            Memory: memoryLimit,
            MemorySwap: memoryLimit, // Disable swap
            CpuQuota: config.sandbox.cpuQuota,
            CpuPeriod: config.sandbox.cpuPeriod,
            PidsLimit: config.sandbox.pidsLimit,
            NetworkMode: config.sandbox.networkMode,
            AutoRemove: false,
            SecurityOpt: ['no-new-privileges'],
            ReadonlyRootfs: false,
            CapDrop: ['ALL'],
            CapAdd: ['SETUID', 'SETGID'] // Needed for compilation
          },
          NetworkDisabled: true,
          Tty: false,
          OpenStdin: false,
          StdinOnce: false
        };

        let container = null;
        let result = {
          exitCode: -1,
          stdout: '',
          stderr: '',
          timeout: false,
          memoryExceeded: false,
          executionTime: 0
        };

        try {
          // Create container
          container = await this.docker.createContainer(containerConfig);
          logger.debug('Container created', { sandboxId, containerId: container.id });

          // Start container
          const startTime = Date.now();
          await container.start();

          // Wait for container with timeout
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve({ timeout: true }), timeout);
          });

          const waitPromise = container.wait().then(data => ({
            timeout: false,
            exitCode: data.StatusCode
          }));

          const raceResult = await Promise.race([waitPromise, timeoutPromise]);

          result.executionTime = Date.now() - startTime;

          if (raceResult.timeout) {
            result.timeout = true;
            result.exitCode = -1;
            logger.debug('Container execution timeout', { sandboxId, timeout });

            // Force stop container
            try {
              await container.stop({ t: 0 });
            } catch (err) {
              // Container might already be stopped
            }
          } else {
            result.exitCode = raceResult.exitCode;
          }

          // Get output using logs (simpler and more reliable than attach)
          const logsOptions = {
            stdout: true,
            stderr: true,
            follow: false
          };

          const logStream = await container.logs(logsOptions);

          // Parse Docker log format - demultiplex stdout and stderr
          let stdoutBuffer = Buffer.alloc(0);
          let stderrBuffer = Buffer.alloc(0);
          let offset = 0;

          while (offset < logStream.length) {
            if (offset + 8 > logStream.length) break;

            const streamType = logStream[offset]; // 1 = stdout, 2 = stderr
            const size = logStream.readUInt32BE(offset + 4);

            if (offset + 8 + size > logStream.length) break;

            const payload = logStream.slice(offset + 8, offset + 8 + size);

            if (streamType === 1) {
              stdoutBuffer = Buffer.concat([stdoutBuffer, payload]);
            } else if (streamType === 2) {
              stderrBuffer = Buffer.concat([stderrBuffer, payload]);
            }

            offset += 8 + size;
          }

          result.stdout = stdoutBuffer.toString('utf8');
          result.stderr = stderrBuffer.toString('utf8');

          // Truncate if too long
          if (result.stdout.length > config.limits.outputLimit) {
            result.stdout = result.stdout.substring(0, config.limits.outputLimit) + '\n[OUTPUT TRUNCATED]';
          }
          if (result.stderr.length > config.limits.outputLimit) {
            result.stderr = result.stderr.substring(0, config.limits.outputLimit) + '\n[OUTPUT TRUNCATED]';
          }

          // Check for OOM kill
          const inspection = await container.inspect();
          if (inspection.State.OOMKilled) {
            result.memoryExceeded = true;
            logger.debug('Container OOM killed', { sandboxId });
          }

        } catch (err) {
          logger.error('Container execution error', {
            sandboxId,
            error: err.message
          });
          result.stderr = err.message;
        } finally {
          // Clean up container
          if (container) {
            try {
              await container.remove({ force: true });
              logger.debug('Container removed', { sandboxId });
            } catch (err) {
              logger.warn('Failed to remove container', {
                sandboxId,
                error: err.message
              });
            }
          }
        }

        return result;
      },

      /**
       * Clean up sandbox workspace
       */
      cleanup: async () => {
        try {
          await fs.rm(workDir, { recursive: true, force: true });
          logger.debug('Sandbox workspace cleaned up', { sandboxId });
        } catch (err) {
          logger.warn('Failed to cleanup sandbox workspace', {
            sandboxId,
            error: err.message
          });
        }
      }
    };
  }

  /**
   * Check sandbox image availability
   */
  async checkImage() {
    try {
      const images = await this.docker.listImages();
      return images.some(img =>
        img.RepoTags && img.RepoTags.includes(config.sandbox.image)
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Get Docker info for health check
   */
  async getInfo() {
    try {
      const info = await this.docker.info();
      return {
        connected: true,
        containers: info.Containers,
        images: info.Images,
        driver: info.Driver
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message
      };
    }
  }
}

module.exports = new DockerSandbox();
