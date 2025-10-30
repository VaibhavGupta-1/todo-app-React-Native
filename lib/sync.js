import NetInfo from '@react-native-community/netinfo';
import { localDB } from './database';
import { supabase } from './supabase';

class SyncManager {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.listeners = [];
  }

  async init() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      this.notifyListeners();

      if (wasOffline && this.isOnline) {
        this.sync();
      }
    });

    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    this.notifyListeners();
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
    callback(this.isOnline);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.isOnline));
  }

  getOnlineStatus() {
    return this.isOnline;
  }

  async sync(userId) {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const queue = await localDB.getSyncQueue();

      for (const item of queue) {
        try {
          if (item.entity_type === 'group') {
            await this.syncGroup(item.action, item.data);
          } else if (item.entity_type === 'todo') {
            await this.syncTodo(item.action, item.data);
          }
          await localDB.markSynced(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item, error);
        }
      }

      await localDB.clearSyncedItems();

      if (userId) {
        await this.pullFromServer(userId);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async syncGroup(action, data) {
    switch (action) {
      case 'create':
      case 'update':
        const { error: upsertError } = await supabase
          .from('groups')
          .upsert({
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            created_at: data.created_at,
          });
        if (upsertError) throw upsertError;
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  async syncTodo(action, data) {
    switch (action) {
      case 'create':
      case 'update':
        const { error: upsertError } = await supabase
          .from('todos')
          .upsert({
            id: data.id,
            user_id: data.user_id,
            group_id: data.group_id,
            title: data.title,
            description: data.description,
            is_completed: data.is_completed,
            created_at: data.created_at,
            updated_at: data.updated_at || new Date().toISOString(),
          });
        if (upsertError) throw upsertError;
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('todos')
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  async pullFromServer(userId) {
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', userId);

      if (groupsError) throw groupsError;

      if (groups) {
        for (const group of groups) {
          await localDB.insertGroup(group);
        }
      }

      const { data: todos, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId);

      if (todosError) throw todosError;

      if (todos) {
        for (const todo of todos) {
          await localDB.insertTodo(todo);
        }
      }
    } catch (error) {
      console.error('Failed to pull from server:', error);
      throw error;
    }
  }

  async createGroup(group) {
    await localDB.insertGroup(group);

    if (this.isOnline) {
      try {
        const { error } = await supabase.from('groups').insert({
          id: group.id,
          user_id: group.user_id,
          name: group.name,
          created_at: group.created_at,
        });
        if (error) throw error;
      } catch (error) {
        await localDB.addToSyncQueue({
          action: 'create',
          entity_type: 'group',
          entity_id: group.id,
          data: group,
        });
      }
    } else {
      await localDB.addToSyncQueue({
        action: 'create',
        entity_type: 'group',
        entity_id: group.id,
        data: group,
      });
    }
  }

  async updateGroup(id, name, group) {
    await localDB.updateGroup(id, name);

    const updatedGroup = { ...group, name };

    if (this.isOnline) {
      try {
        const { error } = await supabase
          .from('groups')
          .update({ name })
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        await localDB.addToSyncQueue({
          action: 'update',
          entity_type: 'group',
          entity_id: id,
          data: updatedGroup,
        });
      }
    } else {
      await localDB.addToSyncQueue({
        action: 'update',
        entity_type: 'group',
        entity_id: id,
        data: updatedGroup,
      });
    }
  }

  async deleteGroup(id) {
    await localDB.deleteGroup(id);

    if (this.isOnline) {
      try {
        const { error } = await supabase.from('groups').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        await localDB.addToSyncQueue({
          action: 'delete',
          entity_type: 'group',
          entity_id: id,
          data: { id },
        });
      }
    } else {
      await localDB.addToSyncQueue({
        action: 'delete',
        entity_type: 'group',
        entity_id: id,
        data: { id },
      });
    }
  }

  async createTodo(todo) {
    await localDB.insertTodo(todo);

    if (this.isOnline) {
      try {
        const { error } = await supabase.from('todos').insert({
          id: todo.id,
          user_id: todo.user_id,
          group_id: todo.group_id,
          title: todo.title,
          description: todo.description,
          is_completed: todo.is_completed,
          created_at: todo.created_at,
        });
        if (error) throw error;
      } catch (error) {
        await localDB.addToSyncQueue({
          action: 'create',
          entity_type: 'todo',
          entity_id: todo.id,
          data: todo,
        });
      }
    } else {
      await localDB.addToSyncQueue({
        action: 'create',
        entity_type: 'todo',
        entity_id: todo.id,
        data: todo,
      });
    }
  }

  async updateTodo(id, updates, fullTodo) {
    await localDB.updateTodo(id, updates);

    const updatedTodo = { ...fullTodo, ...updates, updated_at: new Date().toISOString() };

    if (this.isOnline) {
      try {
        const { error } = await supabase
          .from('todos')
          .update({ ...updates, updated_at: updatedTodo.updated_at })
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        await localDB.addToSyncQueue({
          action: 'update',
          entity_type: 'todo',
          entity_id: id,
          data: updatedTodo,
        });
      }
    } else {
      await localDB.addToSyncQueue({
        action: 'update',
        entity_type: 'todo',
        entity_id: id,
        data: updatedTodo,
      });
    }
  }

  async deleteTodo(id) {
    await localDB.deleteTodo(id);

    if (this.isOnline) {
      try {
        const { error } = await supabase.from('todos').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        await localDB.addToSyncQueue({
          action: 'delete',
          entity_type: 'todo',
          entity_id: id,
          data: { id },
        });
      }
    } else {
      await localDB.addToSyncQueue({
        action: 'delete',
        entity_type: 'todo',
        entity_id: id,
        data: { id },
      });
    }
  }

  async loadInitialData(userId) {
    if (this.isOnline) {
      await this.pullFromServer(userId);
    }
  }
}

export const syncManager = new SyncManager();
