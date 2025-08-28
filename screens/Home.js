// screens/Home.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import axios from 'axios';

// IMPORTANT: Do NOT hardcode API keys in source. Load from env/config.
const GEMINI_API_KEY = "AIzaSyAElo5pSQsviixI2_y5Hfx-OSq0RILKC9A";

const offlineResponses = [
  "I'm currently offline, but I can still help! Here are our main categories: Digital Art, Study Materials, Music & Beats, Paintings, Novels & Writing, and Academic Notes.",
  "While I'm having connection issues, feel free to browse our trending items or search for specific content using the search bar above.",
  "I'm temporarily unable to connect to my AI brain, but you can still use the app to buy and sell digital content. Try searching for what you need!",
  "Connection issues on my end! In the meantime, check out the categories section to find what you're looking for.",
  "I'm having trouble connecting right now, but Slawn Shinto has amazing digital content from students and creators. Browse around and see what catches your eye!",
];

// Fixed categories with better, more realistic images
const categories = [
  {
    label: 'Digital Art',
    // Professional digital art workspace with tablet and stylus
    image: 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
  },
  {
    label: 'Study Materials',
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
  },
  {
    label: 'Music & Beats',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
  },
  {
    label: 'Paintings',
    // Realistic artist's palette with brushes and paint
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
  },
  {
    label: 'Novels & Writing',
    // Stack of classic books including fantasy novels
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
  },
  {
    label: 'Academic Notes',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Author cache to avoid repeated Firestore queries
  const [authorCache, setAuthorCache] = useState(new Map());

  // Chat-related state
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState([
    { id: 0, text: 'Hi! I am Slawn Shinto AI Assistant 🤖. I can help you find items, answer questions about our marketplace, or just chat!', from: 'bot' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [rateLimitCount, setRateLimitCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  const chatScrollViewRef = useRef();
  const fabScale = useRef(new Animated.Value(1)).current;

  /**
   * Fetches author display name from the 'characters' collection
   * FIXED: Now queries by userId field instead of using userId as document ID
   */
  const getAuthorDisplayName = useCallback(async (userId) => {
    if (!userId || typeof userId !== 'string') {
      return 'Unknown';
    }

    // Check cache first
    if (authorCache.has(userId)) {
      return authorCache.get(userId);
    }

    try {
      // FIX: Query by userId instead of assuming it's the doc ID
      const q = query(collection(db, 'characters'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      let displayName = 'Unknown';
      if (!querySnapshot.empty) {
        const authorData = querySnapshot.docs[0].data();
        displayName = authorData?.author || authorData?.displayName || authorData?.name || 'Unknown';
      }
      
      // Cache the result
      setAuthorCache(prev => new Map(prev).set(userId, displayName));
      return displayName;
    } catch (error) {
      console.error('Error fetching author:', error);
      // Cache the failure to avoid repeated attempts
      setAuthorCache(prev => new Map(prev).set(userId, 'Unknown'));
      return 'Unknown';
    }
  }, [authorCache]);

  /**
   * OPTIMIZED: Batch fetch all authors to reduce Firestore queries
   */
  const fetchAllAuthors = useCallback(async (userIds) => {
    const uniqueUserIds = [...new Set(userIds.filter(id => id && !authorCache.has(id)))];
    
    if (uniqueUserIds.length === 0) return;

    try {
      // Firestore 'in' queries are limited to 10 items, so we batch them
      const batches = [];
      for (let i = 0; i < uniqueUserIds.length; i += 10) {
        batches.push(uniqueUserIds.slice(i, i + 10));
      }

      const allResults = [];
      for (const batch of batches) {
        const q = query(collection(db, 'characters'), where('userId', 'in', batch));
        const querySnapshot = await getDocs(q);
        allResults.push(...querySnapshot.docs);
      }

      // Build author map
      const newAuthors = new Map(authorCache);
      
      // Add found authors
      allResults.forEach(doc => {
        const data = doc.data();
        const displayName = data?.author || data?.displayName || data?.name || 'Unknown';
        newAuthors.set(data.userId, displayName);
      });

      // Add 'Unknown' for any userIds that weren't found
      uniqueUserIds.forEach(userId => {
        if (!newAuthors.has(userId)) {
          newAuthors.set(userId, 'Unknown');
        }
      });

      setAuthorCache(newAuthors);
    } catch (error) {
      console.error('Error batch fetching authors:', error);
      // Fallback: mark all as Unknown
      const newAuthors = new Map(authorCache);
      uniqueUserIds.forEach(userId => {
        newAuthors.set(userId, 'Unknown');
      });
      setAuthorCache(newAuthors);
    }
  }, [authorCache]);

  /**
   * Enhanced item fetching with optimized author resolution
   */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'items'));
      const fetchedItems = [];
      const userIds = [];
      
      // First, collect all items and their userIds
      querySnapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        fetchedItems.push(item);
        if (item.userId) {
          userIds.push(item.userId);
        }
      });

      // Batch fetch all authors
      await fetchAllAuthors(userIds);

      // Then, assign resolved authors to items
      const itemsWithAuthors = fetchedItems.map(item => {
        if (item.userId && authorCache.has(item.userId)) {
          return { ...item, resolvedAuthor: authorCache.get(item.userId) };
        }
        return { ...item, resolvedAuthor: item.author || 'Unknown' };
      });

      setItems(itemsWithAuthors);
      setFilteredItems(itemsWithAuthors);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchAllAuthors, authorCache]);

  /**
   * Smart navigation based on deliveryType
   * - download: Direct to CheckoutScreen
   * - physical/other: Goes to PlaceOrder screen
   */
  const handlePurchase = useCallback((item) => {
    if (!item) {
      console.warn('No item provided for purchase');
      return;
    }

    // Use deliveryType as single source of truth
    const isDownloadable = item.deliveryType === 'download';
    
    if (isDownloadable) {
      // Direct checkout for downloadable items
      navigation.navigate('CheckoutScreen', { 
        product: item,
        skipOrderForm: true // Flag to indicate we're skipping the order form
      });
    } else {
      // Physical delivery requires order details
      navigation.navigate('PlaceOrder', { 
        product: item 
      });
    }
  }, [navigation]);

  // Navigate to details screen
  const goToDetails = (item) => {
    navigation.navigate('DetailsScreen', { item });
  };

  const filterItems = (query, category) => {
    let results = [...items];
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
          (item.resolvedAuthor && item.resolvedAuthor.toLowerCase().includes(lowerQuery)) ||
          (item.author && item.author.toLowerCase().includes(lowerQuery))
      );
    }
    if (category) {
      results = results.filter(
        (item) => item.category && item.category.toLowerCase() === category.toLowerCase()
      );
    }
    setFilteredItems(results);
  };

  const getOfflineResponse = (userMessage) => {
    const message = String(userMessage || '').toLowerCase();
    if (message.includes('category') || message.includes('categories')) {
      return "Our categories include: Digital Art, Study Materials, Music & Beats, Paintings, Novels & Writing, and Academic Notes. You can filter by these using the category section!";
    }
    if (message.includes('price') || message.includes('cost')) {
      return "Prices vary by item and creator. You can see the price for each item on their card - look for the green GH₵ price tag!";
    }
    if (message.includes('buy') || message.includes('purchase')) {
      return "To buy an item, tap it to view details, then hit the yellow 'Buy Now' button. Digital items go straight to checkout, while physical items need delivery details!";
    }
    if (message.includes('search') || message.includes('find')) {
      return "Use the search bar at the top to find specific items. You can search by title, author, or content type!";
    }
    if (message.includes('help') || message.includes('how')) {
      return "I'm here to help! You can browse categories, search for items, view details, and purchase digital content.";
    }
    return offlineResponses[Math.floor(Math.random() * offlineResponses.length)];
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { id: Date.now(), text: chatInput.trim(), from: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    // rate limit: 20s between requests
    const now = Date.now();
    if (now - lastRequestTime < 20000) {
      const offlineResponse = getOfflineResponse(userMessage.text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: `${offlineResponse}\n\n⏱️ (Rate limited - please wait 20 seconds between messages)`,
        from: 'bot'
      }]);
      setChatLoading(false);
      return;
    }

    if (!GEMINI_API_KEY) {
      const offlineResponse = getOfflineResponse(userMessage.text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: `${offlineResponse}\n\n🔑 (API key not configured - using offline mode)`,
        from: 'bot'
      }]);
      setChatLoading(false);
      return;
    }

    if (rateLimitCount >= 3) {
      const offlineResponse = getOfflineResponse(userMessage.text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: `${offlineResponse}\n\n🚫 (Rate limit reached - using offline mode)`,
        from: 'bot'
      }]);
      setChatLoading(false);
      return;
    }

    try {
      setLastRequestTime(now);
      const marketplaceContext = `You are an AI assistant for Slawn Shinto, a marketplace app where students and creators can buy and sell digital content like study materials, digital art, music, novels, and academic notes. Current available categories: Digital Art, Study Materials, Music & Beats, Paintings, Novels & Writing, Academic Notes. Keep responses concise and helpful.`;

      // Build conversation history for Gemini
      const conversationHistory = messages
        .filter(m => m.from === 'user' || m.from === 'bot')
        .slice(-6)
        .map(m => `${m.from === 'user' ? 'User' : 'Assistant'}: ${m.text.replace(/\n\n[⏱️🔑🚫].*/, '')}`)
        .join('\n');

      const prompt = `${marketplaceContext}\n\nConversation history:\n${conversationHistory}\n\nUser: ${userMessage.text}\n\nAssistant:`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 150,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const botText = response.data.candidates[0].content.parts[0].text.trim();
      setMessages(prev => [...prev, { id: Date.now() + 1, text: botText, from: 'bot' }]);
      setRateLimitCount(0);
    } catch (error) {
      console.error('Chat error:', error);
      let errorMessage = getOfflineResponse(userMessage.text);

      if (error.response?.status === 401) {
        errorMessage += '\n\n🔑 (API key invalid - check your Gemini key)';
      } else if (error.response?.status === 429) {
        setRateLimitCount(prev => prev + 1);
        errorMessage += '\n\n⏱️ (Rate limited - too many requests)';
      } else if (error.response?.status === 403) {
        errorMessage += '\n\n🚫 (Access forbidden - check API key permissions)';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage += '\n\n⏰ (Request timeout - please try again)';
      } else if (error.response?.data?.error?.message) {
        errorMessage += `\n\n❌ (${error.response.data.error.message})`;
      } else {
        errorMessage += '\n\n📶 (Connection issue - using offline mode)';
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, text: errorMessage, from: 'bot' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const toggleChat = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setChatVisible(prev => !prev);
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    filterItems(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory, items]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Clear author cache on refresh to get updated data
    setAuthorCache(new Map());
    fetchItems();
  }, [fetchItems]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search lectures, notes, music..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryCard,
                selectedCategory === item.label && { borderColor: '#facc15', borderWidth: 2 },
              ]}
              onPress={() => setSelectedCategory((prev) => (prev === item.label ? null : item.label))}
              accessible
              accessibilityLabel={`Category ${item.label}`}
            >
              <Image source={{ uri: item.image }} style={styles.categoryImage} />
              <View style={styles.categoryOverlay} />
              <Text style={styles.categoryLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trending Items */}
        <Text style={styles.sectionTitle}>Trending This Week</Text>
        {loading ? (
          <ActivityIndicator color="white" size="large" />
        ) : filteredItems.length === 0 ? (
          <Text style={{ color: 'white', marginTop: 10 }}>No items available yet.</Text>
        ) : (
          <View style={styles.cardWrapper}>
            {filteredItems.map((item) => {
              // Use resolved author name with fallback
              const displayAuthor = item.resolvedAuthor || item.author || 'Unknown';
              const isDownloadable = item.deliveryType === 'download';
              
              return (
                <View key={item.id} style={styles.trendCard}>
                  <TouchableOpacity onPress={() => goToDetails(item)}>
                    <View style={styles.cardBanner}>
                      {item.imageURL ? (
                        <Image source={{ uri: item.imageURL }} style={styles.bannerImage} />
                      ) : (
                        <Text style={styles.bannerEmoji}>📦</Text>
                      )}
                      {/* Delivery type indicator */}
                      <View style={[styles.deliveryBadge, { backgroundColor: isDownloadable ? '#10b981' : '#f59e0b' }]}>
                        <Ionicons 
                          name={isDownloadable ? 'download' : 'cube'} 
                          size={12} 
                          color="white" 
                        />
                        <Text style={styles.deliveryText}>
                          {isDownloadable ? 'Download' : 'Physical'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
                      <Text style={styles.cardAuthor}>
                        {displayAuthor} • {(typeof item.location === 'string' && item.location.trim()) ? item.location.trim() : 'Unspecified'} 📍
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={styles.cardPrice}>
                          GH₵ {item.price !== undefined ? Number(item.price).toFixed(2) : '0.00'}
                        </Text>
                        <View style={styles.cardStats}>
                          <Text style={styles.cardDownloads}>buys: {item.buys || 0}</Text>
                          <Text style={styles.cardRating}>⭐ {item.rating || 'not rated'}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => handlePurchase(item)}
                  >
                    <Text style={styles.buyButtonText}>
                      {isDownloadable ? 'Buy & Download' : 'Order Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity onPress={toggleChat} style={styles.fabButton} accessibilityLabel="Open chat">
          <Ionicons name={chatVisible ? 'close' : 'chatbubble-ellipses'} size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal visible={chatVisible} animationType="slide" transparent onRequestClose={() => setChatVisible(false)}>
        <View style={styles.chatOverlay}>
          <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarText}>🤖</Text>
                </View>
                <View>
                  <Text style={styles.chatHeaderTitle}>Slawn Shinto AI</Text>
                  <Text style={styles.chatHeaderSubtitle}>Powered by Gemini AI</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChat}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.messagesContainer}
              ref={chatScrollViewRef}
              onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map(msg => (
                <View key={msg.id} style={[styles.messageBubble, msg.from === 'user' ? styles.userBubble : styles.botBubble]}>
                  <Text style={msg.from === 'user' ? styles.userText : styles.botText}>{msg.text}</Text>
                </View>
              ))}
              {chatLoading && (
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <ActivityIndicator color="#666" size="small" />
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask me anything..."
                placeholderTextColor="#999"
                style={styles.chatInput}
                editable={!chatLoading}
                onSubmitEditing={sendChatMessage}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity onPress={sendChatMessage} style={[styles.sendButton, { opacity: chatLoading ? 0.5 : 1 }]} disabled={chatLoading}>
                {chatLoading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="white" />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scrollContainer: { flex: 1, padding: 20 },
  searchWrapper: {
    backgroundColor: '#2e2e4d',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 15,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: 'white', height: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: 'white', marginTop: 10, marginBottom: 10 },
  categoryScroll: { flexDirection: 'row', marginBottom: 10 },
  categoryCard: { width: 140, height: 80, borderRadius: 12, marginRight: 12, overflow: 'hidden', position: 'relative' },
  categoryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  categoryOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  categoryLabel: { position: 'absolute', bottom: 8, left: 8, color: 'white', fontWeight: '600', fontSize: 14 },
  cardWrapper: { marginTop: 10, paddingBottom: 80 },
  trendCard: { backgroundColor: '#2e2e4d', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  cardBanner: { backgroundColor: '#4e4e6d', height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerEmoji: { fontSize: 36, color: 'white' },
  deliveryBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    elevation: 2,
  },
  deliveryText: { color: 'white', fontSize: 10, fontWeight: '600', marginLeft: 4 },
  cardBody: { padding: 16 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  cardAuthor: { color: '#ccc', fontSize: 13, marginVertical: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { color: '#7ef29d', fontWeight: '600' },
  cardStats: { flexDirection: 'row', alignItems: 'center' },
  cardDownloads: { color: '#facc15', fontSize: 12, marginRight: 8 },
  cardRating: { color: '#ffd700', fontSize: 12 },
  buyButton: { backgroundColor: '#facc15', paddingVertical: 10, alignItems: 'center' },
  buyButtonText: { fontWeight: 'bold', color: '#000', fontSize: 16 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabButton: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: '#facc15', alignItems: 'center', justifyContent: 'center' },

  // Chat
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatContainer: { backgroundColor: '#1a1a2e', height: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  chatHeader: { backgroundColor: '#2e2e4d', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#4e4e6d' },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  botAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#facc15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  botAvatarText: { fontSize: 20 },
  chatHeaderTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  chatHeaderSubtitle: { color: '#ccc', fontSize: 12 },
  messagesContainer: { flex: 1, padding: 16 },
  messageBubble: { marginVertical: 4, padding: 12, borderRadius: 18, maxWidth: '80%' },
  userBubble: { backgroundColor: '#facc15', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#2e2e4d', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userText: { color: '#000', fontWeight: '500' },
  botText: { color: '#fff' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: '#4e4e6d', backgroundColor: '#2e2e4d' },
  chatInput: { flex: 1, borderColor: '#4e4e6d', borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, color: 'white', maxHeight: 100 },
  sendButton: { backgroundColor: '#facc15', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});