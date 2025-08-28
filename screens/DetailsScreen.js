  import React, { useEffect, useState } from 'react';
  import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Dimensions,
    StatusBar,
    Share,
  } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { Ionicons } from '@expo/vector-icons';
  import { collection, getDocs, query, where } from 'firebase/firestore';
  import { db } from '../firebaseconfig';

  const { width } = Dimensions.get('window');

  export default function DetailsScreen({ route }) {
    const navigation = useNavigation();
    const { item } = route.params || {};

    const [characterData, setCharacterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imageLoading, setImageLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
      const fetchCharacter = async () => {
        if (!item?.userId) return setLoading(false);

        try {
          const q = query(collection(db, 'characters'), where('userId', '==', item.userId));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setCharacterData(snapshot.docs[0].data());
          }
        } catch (err) {
          console.error('Error fetching character:', err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchCharacter();
    }, [item?.userId]);

    const handleAvatarPress = () => {
      if (characterData) {
        navigation.navigate('PublicStore', { userId: item.userId });
      } else {
        alert('Author profile not found.');
      }
    };

    // ✅ Fixed Buy Now routing
    const handleBuyNow = () => {
      if (item?.deliveryType === 'download') {
        navigation.navigate('CheckoutScreen', { product: item });
      } else {
        navigation.navigate('PlaceOrder', { product: item });
      }
    };

    const handleShare = async () => {
      try {
        await Share.share({
          message: `Check out "${item?.title}" by ${characterData?.author || item?.author || 'Unknown'} on Slawn Shinto for GH₵${Number(item?.price || 0).toFixed(2)}`,
          title: item?.title || 'Amazing Digital Content',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    };

    const toggleFavorite = () => {
      setIsFavorite(!isFavorite);
    };

    if (!item) {
      return (
        <SafeAreaView style={styles.screen}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>No item data found. Please go back and try again.</Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#ff6b6b" : "white"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Image */}
          <View style={styles.imageContainer}>
            {item.imageURL ? (
              <>
                {imageLoading && (
                  <View style={styles.imagePlaceholder}>
                    <ActivityIndicator size="large" color="#007AFF" />
                  </View>
                )}
                <Image
                  source={{ uri: item.imageURL }}
                  style={styles.productImage}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  resizeMode="cover"
                />
              </>
            ) : (
              <View style={styles.emojiContainer}>
                <Text style={styles.emoji}>{item.emoji || '📦'}</Text>
              </View>
            )}

            {/* Price Badge */}
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>GH₵{Number(item?.price || 0).toFixed(2)}</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            {/* Title */}
            <Text style={styles.productTitle}>{item?.title || 'Untitled Item'}</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.statText}>{item?.rating || 'N/A'}</Text>
              </View>

              {/* ✅ Dynamic orders/downloads */}
              <View style={styles.statItem}>
                <Ionicons
                  name={item?.deliveryType === 'download' ? 'download' : 'cube'}
                  size={16}
                  color={item?.deliveryType === 'download' ? '#007AFF' : '#FF9800'}
                />
                <Text style={styles.statText}>
                  {item?.deliveryType === 'download'
                    ? `${item?.buys || 0} downloads`
                    : `${item?.orders || 0} orders`}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.statText}>{item?.location?.trim() || 'Ghana'}</Text>
              </View>
            </View>

            {/* ✅ Smaller, blended avatar */}
            <TouchableOpacity style={styles.authorSection} onPress={handleAvatarPress}>
              <View style={styles.authorInfo}>
                {loading ? (
                  <View style={styles.avatarPlaceholder}>
                    <ActivityIndicator size="small" color="#007AFF" />
                  </View>
                ) : (
                  <Image
                    source={
                      characterData?.avatar
                        ? { uri: characterData.avatar }
                        : require('../assets/avatar.png')
                    }
                    style={styles.authorAvatarSmall}
                  />
                )}
                <View style={styles.authorDetails}>
                  <Text style={styles.authorName}>
                    {characterData?.author || item?.author || 'Unknown Creator'}
                  </Text>
                  <Text style={styles.authorLabel}>Creator</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About This Item</Text>
              <Text style={styles.description}>
                {item?.description ||
                  'This is a premium digital content created with care and attention to detail.'}
              </Text>
            </View>

            {/* ✅ Dynamic Features */}
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.tagsContainer}>
                <View style={styles.tag}>
                  <Ionicons name="shield-checkmark" size={14} color="#28a745" />
                  <Text style={styles.tagText}>Verified</Text>
                </View>
                {item?.deliveryType === 'download' ? (
                  <View style={styles.tag}>
                    <Ionicons name="download" size={14} color="#007AFF" />
                    <Text style={styles.tagText}>Instant Download</Text>
                  </View>
                ) : (
                  <View style={styles.tag}>
                    <Ionicons name="cube" size={14} color="#FF9800" />
                    <Text style={styles.tagText}>Physical Item</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.priceSection}>
            <Text style={styles.bottomPriceLabel}>Total Price</Text>
            <Text style={styles.bottomPrice}>GH₵{Number(item?.price || 0).toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.buyButton} onPress={handleBuyNow}>
            <Ionicons name="card" size={20} color="white" />
            <Text style={styles.buyButtonText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#1a1a2e' },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: StatusBar.currentHeight || 44, paddingBottom: 16,
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      backgroundColor: 'transparent',
    },
    headerButton: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
    },
    headerActions: { flexDirection: 'row', gap: 12 },
    scrollContent: { paddingBottom: 20 },
    imageContainer: { position: 'relative', height: 300, backgroundColor: '#111' },
    productImage: { width: '100%', height: '100%' },
    imagePlaceholder: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center', backgroundColor: '#111',
    },
    emojiContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
    emoji: { fontSize: 80, textAlign: 'center' },
    priceBadge: {
      position: 'absolute', bottom: 16, right: 16,
      backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    },
    priceText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    infoCard: {
      backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
      marginTop: -24, paddingHorizontal: 20, paddingTop: 24, minHeight: 400,
    },
    productTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statText: { color: '#999', fontSize: 14, fontWeight: '500' },
    authorSection: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    authorInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    authorAvatarSmall: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
    avatarPlaceholder: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: '#222',
      justifyContent: 'center', alignItems: 'center', marginRight: 8,
    },
    authorDetails: { flex: 1 },
    authorName: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 2 },
    authorLabel: { color: '#666', fontSize: 12 },
    descriptionSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: 'white', marginBottom: 12 },
    description: { fontSize: 15, color: '#ccc', lineHeight: 22 },
    tagsSection: { marginBottom: 24 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
    },
    tagText: { color: '#ccc', fontSize: 12, fontWeight: '500' },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 30, backgroundColor: '#1a1a2e',
    },
    priceSection: { flex: 1 },
    bottomPriceLabel: { color: '#666', fontSize: 12, marginBottom: 2 },
    bottomPrice: { color: '#28a745', fontSize: 20, fontWeight: 'bold' },
    buyButton: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#28a745',
      paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, gap: 8,
    },
    buyButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    errorTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 20, marginBottom: 12, textAlign: 'center' },
    errorText: { fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    errorButton: { backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
    errorButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  });
