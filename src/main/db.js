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

    db.exec(t_project);
    db.exec(t_sub_project);
    db.exec(t_commit);
    db.exec(t_commit_detail);
    db.exec(t_user_credentials);
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

function insertSubProject(subProjectName, projectName) {
    db.prepare(`
        INSERT INTO t_sub_project (sub_project_name, project_name) VALUES (?, ?)
    `).run(subProjectName, projectName);
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
  getUserCredentials
}
