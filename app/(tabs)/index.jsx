import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { localDB } from '../../lib/database';
import { syncManager } from '../../lib/sync';

export default function TodosScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const [groups, setGroups] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      const userId = user.id;
      
      const loadedGroups = await localDB.getGroups(userId);
      const loadedTodos = await localDB.getTodos(userId);
      
      setGroups(loadedGroups);
      setTodos(loadedTodos);
      
      if (syncManager.getOnlineStatus()) {
        await syncManager.loadInitialData(userId);
        const updatedGroups = await localDB.getGroups(userId);
        const updatedTodos = await localDB.getTodos(userId);
        setGroups(updatedGroups);
        setTodos(updatedTodos);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    
    const unsubscribe = syncManager.onStatusChange((online) => {
      setIsOnline(online);
      if (online && user) {
        syncManager.sync(user.id).then(() => loadData());
      }
    });

    return unsubscribe;
  }, [user, loadData]);

  // Reload data when screen comes into focus (after returning from modals)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/sign-in');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const toggleTodo = async (todo) => {
    try {
      await syncManager.updateTodo(
        todo.id,
        { is_completed: !todo.is_completed },
        todo
      );
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update todo');
    }
  };

  const deleteTodo = async (todoId) => {
    Alert.alert(
      'Delete Todo',
      'Are you sure you want to delete this todo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await syncManager.deleteTodo(todoId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete todo');
            }
          },
        },
      ]
    );
  };

  const getTodosByGroup = (groupId) => {
    return todos
      .filter(todo => todo.group_id === groupId)
      .sort((a, b) => {
        if (a.is_completed === b.is_completed) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        return a.is_completed ? 1 : -1;
      });
  };

  const renderTodo = ({ item: todo }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={styles.todoCheckbox}
        onPress={() => toggleTodo(todo)}
      >
        <Ionicons
          name={todo.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={todo.is_completed ? '#34C759' : '#999'}
        />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.todoContent}
        onPress={() => router.push(`/edit-todo?id=${todo.id}`)}
      >
        <Text
          style={[
            styles.todoTitle,
            todo.is_completed && styles.todoTitleCompleted,
          ]}
        >
          {todo.title}
        </Text>
        {todo.description ? (
          <Text
            style={[
              styles.todoDescription,
              todo.is_completed && styles.todoDescriptionCompleted,
            ]}
            numberOfLines={2}
          >
            {todo.description}
          </Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTodo(todo.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
      </TouchableOpacity>
    </View>
  );

  const renderGroup = ({ item: group }) => {
    const groupTodos = getTodosByGroup(group.id);
    
    if (groupTodos.length === 0) return null;

    return (
      <View style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>{group.name}</Text>
          <Text style={styles.groupCount}>{groupTodos.length}</Text>
        </View>
        <FlatList
          data={groupTodos}
          renderItem={renderTodo}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const hasNoGroups = groups.length === 0;
  const hasNoTodos = todos.length === 0;

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode - Changes will sync when online</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/groups')}
        >
          <Ionicons name="folder-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {hasNoGroups ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptyText}>Create a group to organize your todos</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/groups')}
          >
            <Text style={styles.emptyButtonText}>Create Your First Group</Text>
          </TouchableOpacity>
        </View>
      ) : hasNoTodos ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Todos Yet</Text>
          <Text style={styles.emptyText}>Add your first todo to get started</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-todo')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: '#ff9500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  todoCheckbox: {
    marginRight: 12,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  todoDescription: {
    fontSize: 14,
    color: '#666',
  },
  todoDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#ccc',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
