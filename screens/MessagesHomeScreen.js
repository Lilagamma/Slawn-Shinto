import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebaseconfig';

const MessagesHomeScreen = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          // Try to find the other participant
          let otherUserId = data.participants.find((id) => id !== currentUser.uid);

          // If both IDs are the same (self-chat or bad data), fallback
          if (!otherUserId && data.participants.length > 0) {
            otherUserId = data.participants[0];
          }

          const otherUserDetails = data.participantDetails?.[otherUserId] || {};
          const unreadCount = data.unreadCount?.[currentUser.uid] || 0;

          return {
            chatId: docSnap.id,
            recipientId: otherUserId,
            recipientName: otherUserDetails.name || 'Unknown User',
            recipientAvatar: otherUserDetails.avatar || '',
            lastMessage: data.lastMessage || 'No messages yet',
            lastMessageTime: data.lastMessageTime,
            lastMessageSender: data.lastMessageSender,
            unreadCount,
            isLastMessageFromMe: data.lastMessageSender === currentUser.uid,
          };
        });

        console.log('Chat data loaded:', chatData); // Debug log
        setChats(chatData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error loading chats:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = loadChats();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) {
        handleRefresh();
      }
    }, [loading])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const handlePress = (recipientId, recipientName) => {
    console.log('Navigating to chat with:', { recipientId, recipientName });

    if (!recipientId) {
      Alert.alert('Error', 'Cannot open chat: Invalid recipient ID');
      return;
    }

    navigation.navigate('ChatScreen', {
      recipientId: recipientId,
      recipientName: recipientName,
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const messageTime = timestamp.toDate();
    const now = new Date();
    const diffInMs = now - messageTime;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes <= 0 ? 'Just now' : `${minutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d`;
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!currentUser) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.infoText}>Please log in to view messages</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.chatId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#facc15']}
            tintColor="#facc15"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.chatItem,
              item.unreadCount > 0 && styles.unreadChatItem
            ]}
            onPress={() => handlePress(item.recipientId, item.recipientName)}
          >
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={[
                  styles.chatName,
                  item.unreadCount > 0 && styles.unreadText
                ]}>
                  {item.recipientName}
                </Text>
                <View style={styles.timeContainer}>
                  <Text style={styles.chatTime}>
                    {formatTime(item.lastMessageTime)}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.messagePreviewContainer}>
                <Text style={[
                  styles.chatPreview,
                  item.unreadCount > 0 && styles.unreadText
                ]} numberOfLines={1}>
                  {item.isLastMessageFromMe ? 'You: ' : ''}{item.lastMessage}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Messages from buyers will appear here
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ccc', marginTop: 10, fontSize: 16 },
  infoText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 50, paddingHorizontal: 20 },
  chatItem: { backgroundColor: '#1a2332', marginHorizontal: 10, marginBottom: 1, borderRadius: 12, overflow: 'hidden' },
  unreadChatItem: { backgroundColor: '#1f2937', borderLeftWidth: 4, borderLeftColor: '#facc15' },
  chatContent: { padding: 16 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chatName: { color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1 },
  unreadText: { color: '#facc15' },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  chatTime: { color: '#888', fontSize: 12, marginRight: 8 },
  unreadBadge: { backgroundColor: '#facc15', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  messagePreviewContainer: { flexDirection: 'row', alignItems: 'center' },
  chatPreview: { color: '#ccc', fontSize: 14, lineHeight: 18, flex: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyText: { color: '#888', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 8 },
});

export default MessagesHomeScreen;
