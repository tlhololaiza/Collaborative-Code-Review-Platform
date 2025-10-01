import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    console.log('Reading schema from:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await client.query(schema);
    
    console.log('Database migration completed successfully!');
    console.log('Tables created:');
    console.log('   - users');
    console.log('   - projects');
    console.log('   - project_members');
    console.log('   - submissions');
    console.log('   - comments');
    console.log('   - reviews');
    console.log('   - notifications');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});