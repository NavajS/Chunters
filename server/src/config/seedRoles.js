const pool = require('./db');
require('dotenv').config();

/**
 * Seeds the database with admin and moderator roles for the team.
 */

const ADMIN_EMAILS = [
    'jiang.max@ufl.edu',// Max
    'n.sivakumar@ufl.edu',
];

const MODERATOR_EMAILS = [
];

async function seedRoles() {
  try {
    console.log('Seeding admin and moderator roles...');

    for (const email of ADMIN_EMAILS) {
      const result = await pool.query(
        `UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = $1 RETURNING email, role`,
        [email.toLowerCase()]
      );

      if (result.rows.length > 0) {
        console.log(`  Admin: ${result.rows[0].email}`);
      } else {
        console.log(`  Skipped (not found): ${email} — user needs to sign up first`);
      }
    }

    for (const email of MODERATOR_EMAILS) {
      const result = await pool.query(
        `UPDATE users SET role = 'moderator', updated_at = NOW() WHERE email = $1 RETURNING email, role`,
        [email.toLowerCase()]
      );

      if (result.rows.length > 0) {
        console.log(`  Moderator: ${result.rows[0].email}`);
      } else {
        console.log(`  Skipped (not found): ${email} — user needs to sign up first`);
      }
    }

    console.log('Done seeding roles.');
  } catch (error) {
    console.error('Error seeding roles:', error.message);
  } finally {
    await pool.end();
  }
}

seedRoles();