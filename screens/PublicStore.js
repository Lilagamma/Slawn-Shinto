import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseconfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const screenHeight = Dimensions.get('window').height;

const PublicStore = () => {
  const [items, setItems] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();
  const route = useRoute();
  const auth = getAuth();

  const userId = route?.params?.userId || auth.currentUser?.uid;

  useEffect(() => {
    const fetchPublicStore = async () => {
      if (!userId) {
        console.warn('No userId available in PublicStore.');
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile
        const characterQuery = query(
          collection(db, 'characters'),
          where('userId', '==', userId)
        );
        const characterSnapshot = await getDocs(characterQuery);
        if (!characterSnapshot.empty) {
          setUserData(characterSnapshot.docs[0].data());
        }

        // Fetch items
        const itemsQuery = query(
          collection(db, 'items'),
          where('userId', '==', userId)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        const fetchedItems = itemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(fetchedItems);
      } catch (err) {
        console.error('Error fetching public store:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStore();
  }, [userId]);

  const goToDetails = (item) => {
    navigation.navigate('DetailsScreen', { item });
  };

  if (!userId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f1419', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>
          ⚠️ No user ID found. Please log in or try again.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#facc15', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f1419' }}>
      <ScrollView>
        {/* Banner Avatar */}
        <View style={styles.bannerTop}>
          <Image
            source={userData?.avatar ? { uri: userData.avatar } : require('../assets/avatar.png')}
            style={styles.bannerImage}
          />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Name & Bio */}
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerName}>{userData?.author || 'Store Owner'}</Text>
          <Text style={styles.bannerBio}>{userData?.bio || 'Creative Student Seller'}</Text>
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutHeader}>About this Store</Text>
          <Text style={styles.aboutText}>
            {userData?.storeAbout ||
              'Every item in this store is uploaded by a talented student creator. Your support fuels their creativity.'}
          </Text>
        </View>

        {/* 💬 Minimalistic Message Button */}
        {userData ? (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() =>
              navigation.navigate('ChatScreen', {
                recipientId: userId,
                recipientName: userData?.author || 'Store Owner',
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={18} color="#facc15" style={{ marginRight: 6 }} />
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.messageLoading}>
            <Text style={{ color: '#666' }}>Loading store owner info...</Text>
          </View>
        )}

        {/* Item Listings */}
        <Text style={styles.sectionTitle}>🛒 Store Items</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>This store has no listed items.</Text>
        ) : (
          <View style={styles.itemGrid}>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => goToDetails(item)}
              >
                <Image source={{ uri: item.imageURL }} style={styles.itemImage} />
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>GH₵ {Number(item.price).toFixed(2)}</Text>
                <Text style={styles.itemStats}>🪙 {item.buys || 0} buys • ⭐ {item.rating || 'not rated'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default PublicStore;

const styles = StyleSheet.create({
  bannerTop: {
    height: screenHeight * 0.25,
    width: '100%',
    backgroundColor: '#1a2332',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  bannerInfo: {
    padding: 20,
    backgroundColor: '#1a2332',
    borderBottomWidth: 1,
    borderColor: '#2a3441',
  },
  bannerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerBio: {
    color: '#ccc',
    fontSize: 14,
  },
  aboutSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  aboutHeader: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  aboutText: {
    color: '#b8c5d1',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#facc15',
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 13,
  },
  itemStats: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 40,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#facc15',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignSelf: 'center',
    marginVertical: 16,
  },
  messageText: {
    color: '#facc15',
    fontSize: 15,
    fontWeight: '500',
  },
  messageLoading: {
    alignSelf: 'center',
    marginTop: 20,
    backgroundColor: '#ccc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
