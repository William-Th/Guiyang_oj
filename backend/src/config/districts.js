/**
 * District Codes Configuration
 *
 * This file defines all district codes used in the system.
 * It ensures consistency between frontend and backend when constructing
 * scope values like "practice_district_YY" for district-level question banks.
 *
 * IMPORTANT: This must match the 'code' field in the districts table.
 * If you add/modify districts in the database, update this file accordingly.
 */

const DISTRICT_CODES = {
  YY: { id: 1, code: 'YY', name: '云岩区' },
  NM: { id: 2, code: 'NM', name: '南明区' },
  GSH: { id: 3, code: 'GSH', name: '观山湖区' },
  BY: { id: 4, code: 'BY', name: '白云区' },
  HX: { id: 5, code: 'HX', name: '花溪区' },
  WD: { id: 6, code: 'WD', name: '乌当区' },
  GYSJ: { id: 7, code: 'GYSJ', name: '贵阳市教育局' },
  QZ: { id: 8, code: 'QZ', name: '清镇市' },
  XW: { id: 9, code: 'XW', name: '修文县' },
  XF: { id: 10, code: 'XF', name: '息烽县' },
  KY: { id: 11, code: 'KY', name: '开阳县' },
  GAXQ: { id: 12, code: 'GAXQ', name: '贵安新区' },
  GYSZSX: { id: 13, code: 'GYSZSX', name: '贵阳市直属学校' }
};

/**
 * Get all districts as an array
 * @returns {Array} Array of district objects
 */
function getAllDistricts() {
  return Object.values(DISTRICT_CODES);
}

/**
 * Get district by code
 * @param {string} code - District code (e.g., 'YY', 'NM')
 * @returns {Object|null} District object or null if not found
 */
function getDistrictByCode(code) {
  return DISTRICT_CODES[code] || null;
}

/**
 * Get district by ID
 * @param {number} id - District ID
 * @returns {Object|null} District object or null if not found
 */
function getDistrictById(id) {
  return Object.values(DISTRICT_CODES).find(d => d.id === id) || null;
}

/**
 * Validate if a district code exists
 * @param {string} code - District code
 * @returns {boolean} True if valid
 */
function isValidDistrictCode(code) {
  return Object.prototype.hasOwnProperty.call(DISTRICT_CODES, code);
}

/**
 * Extract district code from scope string
 * @param {string} scope - Scope string (e.g., 'practice_district_YY')
 * @returns {string|null} District code or null if not found
 *
 * Examples:
 * - 'practice_district_YY' -> 'YY'
 * - 'practice_district_GSH' -> 'GSH'
 * - 'practice_municipal' -> null
 */
function extractDistrictCodeFromScope(scope) {
  if (!scope || typeof scope !== 'string') {
    return null;
  }

  const match = scope.match(/^practice_district_(.+)$/);
  return match ? match[1] : null;
}

/**
 * Build scope string from district code
 * @param {string} districtCode - District code
 * @returns {string} Scope string (e.g., 'practice_district_YY')
 */
function buildDistrictScope(districtCode) {
  if (!isValidDistrictCode(districtCode)) {
    throw new Error(`Invalid district code: ${districtCode}`);
  }
  return `practice_district_${districtCode}`;
}

module.exports = {
  DISTRICT_CODES,
  getAllDistricts,
  getDistrictByCode,
  getDistrictById,
  isValidDistrictCode,
  extractDistrictCodeFromScope,
  buildDistrictScope
};
