const { query } = require('../database/connection');

class School {
  // Get all schools
  static async findAll() {
    const queryStr = `
      SELECT
        id,
        name,
        code,
        district_id,
        district,
        address,
        contact_person,
        contact_phone,
        type
      FROM schools
      ORDER BY district, name
    `;

    const result = await query(queryStr);
    return result.rows;
  }

  // Get school by ID
  static async findById(id) {
    const queryStr = `
      SELECT
        id,
        name,
        code,
        district_id,
        district,
        address,
        contact_person,
        contact_phone,
        type
      FROM schools
      WHERE id = $1
    `;

    const result = await query(queryStr, [id]);
    return result.rows[0];
  }

  // Get schools by district
  static async findByDistrict(district) {
    const queryStr = `
      SELECT
        id,
        name,
        code,
        district_id,
        district,
        address,
        contact_person,
        contact_phone,
        type
      FROM schools
      WHERE district = $1
      ORDER BY name
    `;

    const result = await query(queryStr, [district]);
    return result.rows;
  }

  // Get base schools
  static async findBaseSchools() {
    const queryStr = `
      SELECT
        id,
        name,
        code,
        district_id,
        district,
        address,
        contact_person,
        contact_phone,
        type
      FROM schools
      WHERE type = 'base'
      ORDER BY district, name
    `;

    const result = await query(queryStr);
    return result.rows;
  }

  // Get municipal schools
  static async findMunicipalSchools() {
    const queryStr = `
      SELECT
        id,
        name,
        code,
        district_id,
        district,
        address,
        contact_person,
        contact_phone,
        type
      FROM schools
      WHERE type = 'municipal'
      ORDER BY district, name
    `;

    const result = await query(queryStr);
    return result.rows;
  }
}

module.exports = School;
