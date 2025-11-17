const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

let db = null;

function init() {
    return new Promise((resolve, reject) => {
        // 실제 파일 경로로 DB 생성
        const dbPath = path.join("./", 'database.db');
        console.log('Database path:', dbPath);
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Database initialization error:', err);
                reject(err);
                return;
            }
            console.log('Database connected successfully');

            db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS t_project (
                    project_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_name TEXT
                );`, (err) => {
                if (err) reject(err);
            });

            db.run(`
                CREATE TABLE  IF NOT EXISTS t_sub_project(
                    sub_project_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    sub_project_name TEXT,
                    FOREIGN KEY (project_id) REFERENCES t_project(project_id)
                );`, (err) => {
                if (err) reject(err);
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS t_commit(
                    commit_id TEXT PRIMARY KEY
                )`, (err) => {
                if (err) reject(err);
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS t_comit_detail(
                    commit_id TEXT,
                    commit_file,
                    commit_content,
                    FOREIGN KEY (commit_id) REFERENCES t_commit(commit_id)
                );`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            });
        });
    });
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call init() first.');
    }
    return db;
}

function getProjectList() {
    return new Promise((resolve, reject) => {
        const database = getDb();
        database.all(`
            SELECT *
            FROM t_project p
            `, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getSubProjectList(projectId) {
    return new Promise((resolve, reject) => {
        const database = getDb();
        database.all(`
            SELECT *
            FROM t_sub_project sp
            WHERE sp.project_id = ?
        `, [projectId], (err, rows) => {
          if (err) {
            reject(err);
        } else {
          console.log(rows);
            resolve(rows);
        }
        });
    });
}

function insertProject(projectName) {
    return new Promise((resolve, reject) => {
        const database = getDb();
        database.run(
            `INSERT INTO t_project (project_name) VALUES (?)`,
            [projectName],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            }
        );
    });
}

export {
    init,
    getProjectList,
    getSubProjectList,
    insertProject
}
