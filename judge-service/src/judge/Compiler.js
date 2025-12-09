/**
 * Compiler Module - Compiles source code in sandbox
 */

const config = require('../config');
const logger = require('../utils/logger');

class Compiler {
  /**
   * Compile source code
   * @param {Object} sandbox - Sandbox instance
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Compilation result
   */
  async compile(sandbox, code, language) {
    const langConfig = config.languages[language];

    if (!langConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}`
      };
    }

    // Check for dangerous patterns
    const dangerCheck = this.checkDangerousPatterns(code, language);
    if (!dangerCheck.safe) {
      logger.warn('Dangerous pattern detected', {
        sandboxId: sandbox.id,
        pattern: dangerCheck.pattern
      });
      return {
        success: false,
        error: `Security violation: ${dangerCheck.message}`
      };
    }

    // Check code length
    if (code.length > config.limits.codeMaxLength) {
      return {
        success: false,
        error: `Code too long: ${code.length} bytes (max: ${config.limits.codeMaxLength})`
      };
    }

    // Write source file
    await sandbox.writeFile(langConfig.sourceFile, code);

    logger.debug('Source code written', {
      sandboxId: sandbox.id,
      language,
      size: code.length
    });

    // Compile
    const compileResult = await sandbox.exec(langConfig.compileCommand, {
      timeout: langConfig.compileTimeout || config.limits.compileTimeout
    });

    if (compileResult.exitCode !== 0) {
      logger.debug('Compilation failed', {
        sandboxId: sandbox.id,
        exitCode: compileResult.exitCode
      });

      return {
        success: false,
        error: compileResult.stderr || compileResult.stdout || 'Compilation failed'
      };
    }

    // Make executable file have execute permission (only for compiled languages)
    // This is needed because Docker volume mounts may not preserve permissions
    if (!langConfig.interpreted) {
      await sandbox.exec(['chmod', '+x', langConfig.executableFile], {
        timeout: 5000
      });
    }

    logger.debug('Compilation successful', {
      sandboxId: sandbox.id,
      language,
      interpreted: langConfig.interpreted || false,
      time: compileResult.executionTime
    });

    return {
      success: true,
      executableFile: langConfig.executableFile,
      compileTime: compileResult.executionTime
    };
  }

  /**
   * Check for dangerous patterns in source code
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Object} Check result
   */
  checkDangerousPatterns(code, language) {
    const patterns = config.dangerousPatterns[language];

    if (!patterns) {
      return { safe: true };
    }

    for (const pattern of patterns) {
      if (pattern.test(code)) {
        return {
          safe: false,
          pattern: pattern.toString(),
          message: 'Potentially dangerous code pattern detected'
        };
      }
    }

    return { safe: true };
  }

  /**
   * Get supported languages
   * @returns {Array} List of supported languages
   */
  getSupportedLanguages() {
    return Object.keys(config.languages).map(key => ({
      id: key,
      name: config.languages[key].name,
      extension: config.languages[key].extension
    }));
  }
}

module.exports = new Compiler();
