import Database from 'better-sqlite3';
const path = require('path');
const { app } = require('electron');

const db = new Database('./database.db');
db.pragma('journal_mode = WAL');

function init() {
    const t_project = `
      CREATE TABLE IF NOT EXISTS t_project (
          project_name TEXT PRIMARY KEY
      );
    `;

    const t_sub_project = `
      CREATE TABLE IF NOT EXISTS t_sub_project(
          sub_project_id INTEGER PRIMARY KEY AUTOINCREMENT,
          sub_project_name TEXT,
          sub_project_uuid TEXT UNIQUE,
          project_name TEXT,
          FOREIGN KEY (project_name) REFERENCES t_project(project_name)
      );
    `;

    const t_commit = `
      CREATE TABLE IF NOT EXISTS t_commit(
          commit_id TEXT PRIMARY KEY,
          sub_project_id INTEGER,
          committer TEXT,
          commit_msg TEXT,
          FOREIGN KEY (sub_project_id) REFERENCES t_sub_project(sub_project_id)
      )
    `;

    const t_commit_detail = `
      CREATE TABLE IF NOT EXISTS t_commit_detail(
          commit_id TEXT,
          commit_file TEXT,
          commit_content TEXT,
          FOREIGN KEY (commit_id) REFERENCES t_commit(commit_id)
      );
    `;

    const t_user_credentials = `
      CREATE TABLE IF NOT EXISTS t_user_credentials(
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const t_metadata = `
      CREATE TABLE IF NOT EXISTS t_metadata(
          key TEXT PRIMARY KEY,
          value TEXT
      );
    `;

    db.exec(t_project);
    db.exec(t_sub_project);
    db.exec(t_commit);
    db.exec(t_commit_detail);
    db.exec(t_user_credentials);
    db.exec(t_metadata);

    // 마이그레이션: 기존 테이블에 sub_project_uuid 컬럼 추가
    try {
        // 컬럼이 이미 있는지 확인
        const columns = db.prepare("PRAGMA table_info(t_sub_project)").all();
        const hasUuidColumn = columns.some(col => col.name === 'sub_project_uuid');

        if (!hasUuidColumn) {
            console.log('Adding sub_project_uuid column to t_sub_project table...');
            db.exec('ALTER TABLE t_sub_project ADD COLUMN sub_project_uuid TEXT UNIQUE');
            console.log('Column added successfully');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call init() first.');
    }
    return db;
}

function getProjectList() {
  const result = db.prepare(`
    SELECT *
    FROM t_project p
  `).all();
    return result;
}

function insertProject(projectName) {
    db.prepare(`
        INSERT INTO t_project (project_name) VALUES (?)
    `).run(projectName);
}

function getSubProjectList(projectName) {
    const result = db.prepare(`
        SELECT *
        FROM t_sub_project sp
        WHERE sp.project_name = ?
    `).all(projectName);
    console.log(result)
    return result;
}

function insertSubProject(subProjectName, subProjectUuid, projectName) {
    db.prepare(`
        INSERT OR IGNORE INTO t_sub_project (sub_project_name, sub_project_uuid, project_name) VALUES (?, ?, ?)
    `).run(subProjectName, subProjectUuid, projectName);
}

function clearAllData() {
    db.exec('DELETE FROM t_commit_detail');
    db.exec('DELETE FROM t_commit');
    db.exec('DELETE FROM t_sub_project');
    db.exec('DELETE FROM t_project');
}

function saveProjectsData(projects) {
    // 트랜잭션으로 처리
    const insertProjectStmt = db.prepare('INSERT OR IGNORE INTO t_project (project_name) VALUES (?)');
    const insertSubProjectStmt = db.prepare('INSERT OR IGNORE INTO t_sub_project (sub_project_name, sub_project_uuid, project_name) VALUES (?, ?, ?)');

    const transaction = db.transaction((projectsData) => {
        for (const project of projectsData) {
            // 프로젝트 삽입
            insertProjectStmt.run(project.name);

            // 서브프로젝트 삽입
            for (const subProject of project.subProjects) {
                insertSubProjectStmt.run(subProject.name, subProject.uuid, project.name);
            }
        }
    });

    transaction(projects);

    // 갱신 일자 저장
    saveLastUpdateTime();
}

function saveLastUpdateTime() {
    const now = new Date().toISOString();
    db.prepare(`
        INSERT OR REPLACE INTO t_metadata (key, value) VALUES ('last_crawl_time', ?)
    `).run(now);
}

function getLastUpdateTime() {
    const result = db.prepare(`
        SELECT value FROM t_metadata WHERE key = 'last_crawl_time'
    `).get();
    return result ? result.value : null;
}

function getCommitList(subProjectId) {
    const result = db.prepare(`
        SELECT *
        FROM t_commit c
        WHERE c.sub_project_id = ?
    `).all(subProjectId);
    return result;
}

function insertCommit(commitId, subProjectId, committer, commitMsg) {
  db.prepare(`
    INSERT INTO t_commit (commit_id, sub_project_id, committer, commit_msg) VALUES (?, ?, ?, ?)
  `).run(commitId, subProjectId, committer, commitMsg);
}

function getCommitDetail(commitId) {
  const result = db.prepare(`
    SELECT *
    FROM t_commit_detail cd
    WHERE cd.commit_id = ?
  `).all(commitId);
  return result;
}

function insertCommitDetail(commitId, commitFile, commitContent) {
  db.prepare(`
    INSERT INTO t_commit_detail (commit_id, commit_file, commit_content) VALUES (?, ?, ?)
  `).run(commitId, commitFile, commitContent);
}

function saveUserCredentials(username, password) {
  // REPLACE를 사용하여 username이 존재하면 업데이트, 없으면 삽입
  db.prepare(`
    INSERT OR REPLACE INTO t_user_credentials (username, password) VALUES (?, ?)
  `).run(username, password);
}

function getUserCredentials() {
  const result = db.prepare(`
    SELECT username, password
    FROM t_user_credentials
    LIMIT 1
  `).get();
  return result;
}

export {
  init,
  getProjectList,
  getSubProjectList,
  insertProject,
  insertSubProject,
  getCommitList,
  insertCommit,
  getCommitDetail,
  insertCommitDetail,
  saveUserCredentials,
  getUserCredentials,
  clearAllData,
  saveProjectsData,
  getLastUpdateTime
}
