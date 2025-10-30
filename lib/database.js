import * as SQLite from 'expo-sqlite';
import { generateUUID } from './uuid';

/**
 * @typedef {import('../types/database').Group} Group
 * @typedef {import('../types/database').Todo} Todo
 * @typedef {import('../types/database').SyncQueueItem} SyncQueueItem
 */

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async init() {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('todos.db');
      await this.createTables();
    }
  }

  async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_todos_group_id ON todos(group_id);
      CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
      CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
    `);
  }

  async getGroups(userId) {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(
      'SELECT * FROM groups WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  async getTodos(userId) {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY is_completed ASC, created_at DESC',
      [userId]
    );
  }

  async getTodosByGroup(groupId) {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(
      'SELECT * FROM todos WHERE group_id = ? ORDER BY is_completed ASC, created_at DESC',
      [groupId]
    );
  }

  async insertGroup(group) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'INSERT INTO groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
      [group.id, group.user_id, group.name, group.created_at]
    );
  }

  async updateGroup(id, name) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE groups SET name = ? WHERE id = ?',
      [name, id]
    );
  }

  async deleteGroup(id) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM groups WHERE id = ?', [id]);
  }

  async insertTodo(todo) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'INSERT INTO todos (id, user_id, group_id, title, description, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [todo.id, todo.user_id, todo.group_id, todo.title, todo.description || '', todo.is_completed ? 1 : 0, todo.created_at]
    );
  }

  async updateTodo(id, updates) {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.is_completed !== undefined) {
      fields.push('is_completed = ?');
      values.push(updates.is_completed ? 1 : 0);
    }
    if (updates.group_id !== undefined) {
      fields.push('group_id = ?');
      values.push(updates.group_id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteTodo(id) {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
  }

  async addToSyncQueue(item) {
    if (!this.db) throw new Error('Database not initialized');
    const id = generateUUID();
    await this.db.runAsync(
      'INSERT INTO sync_queue (id, action, entity_type, entity_id, data, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, item.action, item.entity_type, item.entity_id, JSON.stringify(item.data), new Date().toISOString(), 0]
    );
  }

  async getSyncQueue() {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getAllAsync(
      'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC'
    );
    return result.map(item => ({
      ...item,
      data: JSON.parse(item.data),
      synced: Boolean(item.synced),
    }));
  }

  async markSynced(ids) {
    if (!this.db) throw new Error('Database not initialized');
    const placeholders = ids.map(() => '?').join(',');
    await this.db.runAsync(
      `UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  }

  async clearSyncedItems() {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM sync_queue WHERE synced = 1');
  }

  async clearAllSyncQueue() {
    if (!this.db) throw new Error('Database not initialized');
    console.log('🗑️ Clearing entire sync queue...');
    await this.db.runAsync('DELETE FROM sync_queue');
    console.log('✅ Sync queue cleared');
  }
}

export const localDB = new DatabaseService();
