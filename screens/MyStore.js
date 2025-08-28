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
import { auth, db } from '../firebaseconfig';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const screenHeight = Dimensions.get('window').height;

export default function MyStore() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const userId = auth.currentUser?.uid;

        // Fetch user profile
        const characterQuery = query(collection(db, 'characters'), where('userId', '==', userId));
        const characterSnapshot = await getDocs(characterQuery);
        if (!characterSnapshot.empty) {
          setUserData(characterSnapshot.docs[0].data());
        }

        // Fetch all store items
        const itemsSnapshot = await getDocs(collection(db, 'items'));
        const fetchedItems = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(fetchedItems);
      } catch (error) {
        console.error('Error loading store:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  const goToDetails = (item) => {
    navigation.navigate('DetailsScreen', { item });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f1419' }}>
      <ScrollView>
        {/* Banner Avatar Section */}
        <View style={styles.bannerTop}>
          <Image
            source={userData?.avatar ? { uri: userData.avatar } : require('../assets/avatar.png')}
            style={styles.bannerImage}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Store Header Info */}
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerName}>{userData?.author || 'Store Owner'}</Text>
          <Text style={styles.bannerBio}>{userData?.bio || 'Creative Student Seller'}</Text>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('StoreEdit')}
        >
          <Text style={styles.editButtonText}>Edit Store Info</Text>
        </TouchableOpacity>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutHeader}>About this Store</Text>
          <Text style={styles.aboutText}>
            {userData?.storeAbout ||
              'Every item in this store is uploaded by a talented student creator. Your support fuels their creativity.'}
          </Text>
        </View>

        {/* Items Section */}
        <Text style={styles.sectionTitle}>🛒 Available Items</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No items listed in the store.</Text>
        ) : (
          <View style={styles.itemGrid}>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => goToDetails(item)}
              >
                <Image
                  source={{ uri: item.imageURL }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>GH₵ {Number(item.price).toFixed(2)}</Text>
                <Text style={styles.itemStats}>
                  🪙 {item.buys || 0} buys • ⭐ {item.rating || 'not rated'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ➕ Floating Add Item Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('Main', { screen: 'Upload' })} 
      >
        <Ionicons name="add" size={24} color="#000" />
        <Text style={styles.floatingButtonText}>Add Item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerTop: {
    height: screenHeight * 0.25,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1a2332',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  editButton: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a3441',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#facc15',
    fontSize: 13,
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
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#facc15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 1, height: 2 },
    shadowRadius: 3,
  },
  floatingButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
