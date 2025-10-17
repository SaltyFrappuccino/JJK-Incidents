import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function initializeDatabase(dbPath: string): Promise<sqlite3.Database> {
  console.log('Initializing database at:', dbPath);
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
      
      // Read and execute schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      // Split by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
      
      let completed = 0;
      const total = statements.length;
      
      if (total === 0) {
        console.log('Database initialized successfully');
        resolve(db);
        return;
      }
      
      statements.forEach((statement, index) => {
        if (statement.trim()) {
          db.exec(statement, (err) => {
            if (err) {
              console.error(`Error executing statement ${index + 1}:`, statement);
              console.error(err);
            }
            
            completed++;
            if (completed === total) {
              console.log('Database initialized successfully');
              resolve(db);
            }
          });
        }
      });
    });
  });
}

export function closeDatabase(db: sqlite3.Database): void {
  db.close();
}
