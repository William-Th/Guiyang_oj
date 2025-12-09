/**
 * Judge Service Configuration
 */

module.exports = {
  // Server
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'guiyang_oj',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123'
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },

  // Docker Sandbox
  sandbox: {
    image: process.env.SANDBOX_IMAGE || 'guiyang_oj_sandbox:latest',
    networkMode: 'none',  // Disable network for security
    memoryLimit: parseInt(process.env.MEMORY_LIMIT) || 256 * 1024 * 1024,  // 256MB
    cpuQuota: 100000,     // 100% of one CPU
    cpuPeriod: 100000,
    pidsLimit: 64,        // Max processes
    workDir: '/workspace',
    tempDir: process.env.SANDBOX_TEMP_DIR || '/tmp/judge-sandbox'  // Host path for DinD
  },

  // Judge Limits
  limits: {
    compileTimeout: parseInt(process.env.COMPILE_TIMEOUT) || 10000,  // 10 seconds
    runTimeout: parseInt(process.env.RUN_TIMEOUT) || 2000,           // 2 seconds (default)
    maxRunTimeout: 10000,   // 10 seconds max
    outputLimit: 64 * 1024, // 64KB output limit
    codeMaxLength: 65536    // 64KB code limit
  },

  // Worker
  worker: {
    id: process.env.WORKER_ID || `worker_${process.pid}`,
    pollInterval: 1000,     // Poll queue every 1 second
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 2
  },

  // Language configurations
  languages: {
    cpp: {
      name: 'C++',
      extension: '.cpp',
      sourceFile: 'main.cpp',
      executableFile: 'main',
      compileCommand: ['g++', '-O2', '-std=c++17', '-o', 'main', 'main.cpp', '-lm'],
      runCommand: ['./main'],
      compileTimeout: 10000
    },
    c: {
      name: 'C',
      extension: '.c',
      sourceFile: 'main.c',
      executableFile: 'main',
      compileCommand: ['gcc', '-O2', '-std=c11', '-o', 'main', 'main.c', '-lm'],
      runCommand: ['./main'],
      compileTimeout: 10000
    },
    python: {
      name: 'Python 3',
      extension: '.py',
      sourceFile: 'main.py',
      executableFile: 'main.py',  // Python is interpreted, no separate executable
      // Use py_compile to check syntax without running
      compileCommand: ['python3', '-m', 'py_compile', 'main.py'],
      runCommand: ['python3', 'main.py'],
      compileTimeout: 5000,
      interpreted: true  // Flag for interpreted languages
    }
  },

  // Dangerous patterns to check in source code
  dangerousPatterns: {
    cpp: [
      /system\s*\(/,
      /execl?\s*\(/,
      /fork\s*\(/,
      /popen\s*\(/,
      /__asm__/,
      /\basm\b/,
      /#include\s*<unistd\.h>/,
      /#include\s*<sys\//,
      /socket\s*\(/,
      /connect\s*\(/,
      /bind\s*\(/,
      /listen\s*\(/,
      /accept\s*\(/
    ],
    python: [
      /\bos\.system\s*\(/,
      /\bsubprocess\b/,
      /\beval\s*\(/,
      /\bexec\s*\(/,
      /\b__import__\s*\(/,
      /\bopen\s*\([^)]*,\s*['"]w/,  // Writing files
      /import\s+socket\b/,
      /from\s+socket\b/,
      /import\s+os\b/,
      /from\s+os\b/,
      /import\s+sys\b.*\bsys\.exit\b/,
      /\bctypes\b/,
      /\bpickle\b/
    ]
  }
};
