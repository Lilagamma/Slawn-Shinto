import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { db } from '../firebaseconfig';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRoute, useNavigation } from '@react-navigation/native';

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const recipientId = route?.params?.recipientId;
  const recipientName = route?.params?.recipientName || 'User';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const flatListRef = useRef();

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          You must be logged in to view or send messages.
        </Text>
      </View>
    );
  }

  if (!recipientId) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          Select a seller from their profile or store to start chatting.
        </Text>
      </View>
    );
  }

  const chatId =
    currentUser.uid < recipientId
      ? `${currentUser.uid}_${recipientId}`
      : `${recipientId}_${currentUser.uid}`;

  // Fetch recipient info
  useEffect(() => {
    const fetchRecipientInfo = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'characters', recipientId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRecipientInfo({
            name: userData.author || recipientName,
            avatar: userData.avatar || '',
            bio: userData.bio || '',
            storeAbout: userData.storeAbout || '',
          });
          // Update navigation title
          navigation.setOptions({
            title: userData.author || recipientName,
          });
        }
      } catch (error) {
        console.error('Error fetching recipient info:', error);
      }
    };

    fetchRecipientInfo();
  }, [recipientId, recipientName, navigation]);

  // Listen to messages
  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      setLoading(false);
      
      // Mark messages as read
      markMessagesAsRead();
    });

    return () => unsubscribe();
  }, [chatId]);

  const markMessagesAsRead = async () => {
    try {
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const unreadField = `unreadCount.${currentUser.uid}`;
        
        if (data.unreadCount && data.unreadCount[currentUser.uid] > 0) {
          await updateDoc(chatDocRef, {
            [unreadField]: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    const messageText = input.trim();
    setInput(''); // Clear input immediately for better UX

    const messageData = {
      text: messageText,
      senderId: currentUser.uid,
      recipientId,
      createdAt: serverTimestamp(),
      read: false,
    };

    try {
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      // Create or update chat document
      const chatData = {
        participants: [currentUser.uid, recipientId],
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (!chatDocSnap.exists()) {
        await setDoc(chatDocRef, {
          ...chatData,
          createdAt: serverTimestamp(),
          unreadCount: {
            [currentUser.uid]: 0,
            [recipientId]: 1,
          },
          participantDetails: {
            [currentUser.uid]: {
              name: currentUser.displayName || 'User',
              avatar: currentUser.photoURL || '',
            },
            [recipientId]: {
              name: recipientInfo?.name || recipientName,
              avatar: recipientInfo?.avatar || '',
            },
          },
        });
      } else {
        const updateData = {
          ...chatData,
          [`unreadCount.${recipientId}`]: increment(1),
        };

        // Update participant details if we have new info
        if (recipientInfo) {
          updateData[`participantDetails.${recipientId}`] = {
            name: recipientInfo.name,
            avatar: recipientInfo.avatar,
          };
        }

        await updateDoc(chatDocRef, updateData);
      }

      // Add the message
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInput(messageText); // Restore input on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageTime = timestamp.toDate();
    const now = new Date();
    const diffInMs = now - messageTime;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes <= 0 ? 'Just now' : `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays < 7) {
      return messageTime.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderItem = ({ item, index }) => {
    const isOwnMessage = item.senderId === currentUser.uid;
    const showSender = index === 0 || messages[index - 1].senderId !== item.senderId;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.rightMessage : styles.leftMessage,
        ]}
      >
        {showSender && (
          <Text style={styles.senderLabel}>
            {isOwnMessage ? 'You' : (recipientInfo?.name || recipientName)}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.myBubble : styles.theirBubble,
          ]}
        >
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timeText,
            isOwnMessage ? styles.myTimeText : styles.theirTimeText
          ]}>
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Recipient info header */}
      {recipientInfo && (
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{recipientInfo.name}</Text>
          {recipientInfo.storeAbout && (
            <Text style={styles.headerBio} numberOfLines={1}>
              {recipientInfo.storeAbout}
            </Text>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          style={styles.input}
          placeholderTextColor="#888"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[
            styles.sendButton,
            (!input.trim() || sending) && styles.sendButtonDisabled
          ]}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 10,
    fontSize: 16,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  headerInfo: {
    backgroundColor: '#1a2332',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3441',
  },
  headerName: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerBio: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
  },
  rightMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  leftMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#7ef29d',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#1a2332',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#000',
  },
  theirMessageText: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: '#333',
  },
  theirTimeText: {
    color: '#888',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderColor: '#2a3441',
    backgroundColor: '#1a2332',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a3441',
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#facc15',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  sendButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ChatScreen;