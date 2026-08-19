const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'migrations', '0001_initial_schema.sql');
let content = fs.readFileSync(schemaPath, 'utf-8');

// Replace timestamp columns
content = content.replace(/created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/g, 'created_at_ms INTEGER NOT NULL');
content = content.replace(/updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/g, 'updated_at_ms INTEGER NOT NULL');
content = content.replace(/due_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/g, 'due_at_ms INTEGER NOT NULL');
content = content.replace(/issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/g, 'issued_at_ms INTEGER NOT NULL');
content = content.replace(/started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/g, 'started_at_ms INTEGER NOT NULL');

// Replace other TEXT timestamps
content = content.replace(/([a-z_]+)_at TEXT/g, '$1_at_ms INTEGER');

// Remove remaining CURRENT_TIMESTAMP defaults just in case
content = content.replace(/DEFAULT CURRENT_TIMESTAMP/g, '');

// Prepend DROP TABLE statements in reverse order of creation to handle foreign keys
const dropStatements = `
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS user_blocks;
DROP TABLE IF EXISTS content_reports;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS daily_streaks;
DROP TABLE IF EXISTS answer_events;
DROP TABLE IF EXISTS game_questions;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS user_character_progress;
DROP TABLE IF EXISTS character_images;
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

`;

const outPath = path.join(__dirname, 'migrations', '0002_update_timestamps.sql');
fs.writeFileSync(outPath, dropStatements + content);
console.log('Migration 0002 generated.');
