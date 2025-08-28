
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

const MessageSellerButton = ({ sellerId, sellerName, style, textStyle }) => {
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handlePress = () => {
    if (!currentUser) {
      // Handle not logged in case - maybe show login prompt
      alert('Please log in to send messages');
      return;
    }

    if (currentUser.uid === sellerId) {
      // Can't message yourself
      return;
    }

    navigation.navigate('ChatScreen', {
      recipientId: sellerId,
      recipientName: sellerName,
    });
  };

  // Don't show button if trying to message yourself
  if (currentUser?.uid === sellerId) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.messageButton, style]}
      onPress={handlePress}
    >
      <Text style={[styles.messageButtonText, textStyle]}>
        Message Seller
      </Text>
    </TouchableOpacity>
  );
};

export default MessageSellerButton;

// =====================================
// 4. Styles for all components
// =====================================

const styles = StyleSheet.create({
  // ChatScreen Styles
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

  // MessagesHomeScreen Styles
  chatItem: {
    backgroundColor: '#1a2332',
    marginHorizontal: 10,
    marginBottom: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unreadChatItem: {
    backgroundColor: '#1f2937',
    borderLeftWidth: 4,
    borderLeftColor: '#facc15',
  },
  chatContent: {
    padding: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  unreadText: {
    color: '#facc15',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    color: '#888',
    fontSize: 12,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#facc15',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatPreview: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  // MessageSellerButton Styles
  messageButton: {
    backgroundColor: '#facc15',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  messageButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});