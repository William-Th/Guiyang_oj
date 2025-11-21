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

export interface District {
  id: number;
  code: string;
  name: string;
}

export const DISTRICT_CODES: Record<string, District> = {
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
 * @returns Array of district objects
 */
export function getAllDistricts(): District[] {
  return Object.values(DISTRICT_CODES);
}

/**
 * Get district by code
 * @param code - District code (e.g., 'YY', 'NM')
 * @returns District object or null if not found
 */
export function getDistrictByCode(code: string): District | null {
  return DISTRICT_CODES[code] || null;
}

/**
 * Get district by ID
 * @param id - District ID
 * @returns District object or null if not found
 */
export function getDistrictById(id: number): District | null {
  return Object.values(DISTRICT_CODES).find(d => d.id === id) || null;
}

/**
 * Validate if a district code exists
 * @param code - District code
 * @returns True if valid
 */
export function isValidDistrictCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(DISTRICT_CODES, code);
}

/**
 * Extract district code from scope string
 * @param scope - Scope string (e.g., 'practice_district_YY')
 * @returns District code or null if not found
 *
 * Examples:
 * - 'practice_district_YY' -> 'YY'
 * - 'practice_district_GSH' -> 'GSH'
 * - 'practice_municipal' -> null
 */
export function extractDistrictCodeFromScope(scope: string): string | null {
  if (!scope || typeof scope !== 'string') {
    return null;
  }

  const match = scope.match(/^practice_district_(.+)$/);
  return match ? match[1] : null;
}

/**
 * Build scope string from district code
 * @param districtCode - District code
 * @returns Scope string (e.g., 'practice_district_YY')
 */
export function buildDistrictScope(districtCode: string): string {
  if (!isValidDistrictCode(districtCode)) {
    throw new Error(`Invalid district code: ${districtCode}`);
  }
  return `practice_district_${districtCode}`;
}

/**
 * Parse district name from scope string
 * @param scope - Scope string
 * @returns District name or original scope if not a district scope
 *
 * Examples:
 * - 'practice_district_YY' -> '云岩区'
 * - 'practice_municipal' -> 'practice_municipal'
 */
export function getDistrictNameFromScope(scope: string): string {
  const code = extractDistrictCodeFromScope(scope);
  if (!code) {
    return scope;
  }

  const district = getDistrictByCode(code);
  return district ? district.name : scope;
}
