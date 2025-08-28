import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { db } from '../firebaseconfig';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const navigation = useNavigation();

  const [userData, setUserData] = useState(null);
  const [itemsSold, setItemsSold] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const fetchData = async () => {
    try {
      const charQuery = query(
        collection(db, 'characters'),
        where('userId', '==', userId)
      );
      const charSnapshot = await getDocs(charQuery);
      if (!charSnapshot.empty) {
        const data = charSnapshot.docs[0].data();
        setUserData(data);
        setPhone(data.phone || '');
      }

      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', userId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);

      const itemIds = [];
      let totalRating = 0;
      let ratingCount = 0;

      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        itemIds.push(doc.id);
        if (data.rating && !isNaN(parseFloat(data.rating))) {
          totalRating += parseFloat(data.rating);
          ratingCount++;
        }
      });

      setItemsSold(itemIds.length);
      setRating(ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0);

      if (itemIds.length > 0) {
        const txQuery = query(
          collection(db, 'transactions'),
          where('productId', 'in', itemIds)
        );
        const txSnapshot = await getDocs(txQuery);
        let totalEarnings = 0;
        txSnapshot.forEach((doc) => {
          const tx = doc.data();
          totalEarnings += tx.amount || 0;
        });
        setEarnings(totalEarnings);
      } else {
        setEarnings(0);
      }
    } catch (err) {
      console.error('Error fetching profile stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        setLoading(true);
        fetchData();
      }
    }, [userId])
  );

  async function savePhone() {
    if (!phone.trim()) {
      Alert.alert('Phone number required', 'Please enter your WhatsApp phone number.');
      return;
    }
    if (!phone.startsWith('+') || phone.length < 8) {
      Alert.alert('Invalid phone number', 'Phone number should start with + and be valid.');
      return;
    }

    try {
      setSavingPhone(true);

      const charQuery = query(
        collection(db, 'characters'),
        where('userId', '==', userId)
      );
      const charSnapshot = await getDocs(charQuery);
      if (!charSnapshot.empty) {
        const docId = charSnapshot.docs[0].id;
        await setDoc(doc(db, 'characters', docId), { phone: phone.trim() }, { merge: true });
        Alert.alert('Success', 'Phone number saved');
        setUserData((prev) => ({ ...prev, phone: phone.trim() }));
      } else {
        Alert.alert('Error', 'User profile not found.');
      }
    } catch (error) {
      console.error('Error saving phone:', error);
      Alert.alert('Error', 'Failed to save phone number.');
    } finally {
      setSavingPhone(false);
    }
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>
          ⚠️ You must be logged in to view your profile.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#facc15" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1419" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('EditProfile')}
              style={styles.profileImageContainer}
            >
              <Image
                source={
                  userData?.avatar
                    ? { uri: userData.avatar }
                    : require('../assets/avatar.png')
                }
                style={styles.profileImage}
              />
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="#0f1419" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{userData?.author || 'User'}</Text>
              <Text style={styles.userEmail}>{auth.currentUser.email}</Text>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceAmount}>6666 twam</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={18} color="#0f1419" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="cube-outline" size={24} color="#facc15" />
              </View>
              <Text style={styles.statValue}>{itemsSold}</Text>
              <Text style={styles.statLabel}>Items Sold</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={24} color="#facc15" />
              </View>
              <Text style={styles.statValue}>{rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trending-up" size={24} color="#facc15" />
              </View>
              <Text style={styles.statValue}>GH₵{earnings}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        </View>

        {/* WhatsApp Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.sectionTitle}>WhatsApp Contact</Text>
          </View>
          <TextInput
            placeholder="+233501234567"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.phoneInput}
            editable={!savingPhone}
          />
          <TouchableOpacity
            style={[styles.savePhoneButton, savingPhone && styles.buttonDisabled]}
            onPress={savePhone}
            disabled={savingPhone}
          >
            {savingPhone ? (
              <ActivityIndicator size="small" color="#0f1419" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#0f1419" />
                <Text style={styles.savePhoneText}>Save Phone Number</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.mainActionsGrid}>
            {mainActions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.mainActionItem}
                onPress={() => {
                  switch (item.label) {
                    case 'My Orders':
                      navigation.navigate('MyOrders');
                      break;
                    case 'Items Bought':
                      navigation.navigate('MyItemsBought');
                      break;
                    case 'Transactions':
                      navigation.navigate('Transactions');
                      break;
                    case 'My Store':
                      navigation.navigate('MyStore');
                      break;
                  }
                }}
              >
                <View style={styles.mainActionIconContainer}>
                  <Ionicons name={item.icon} size={24} color="#facc15" />
                </View>
                <Text style={styles.mainActionText}>{item.label}</Text>
                <Text style={styles.mainActionSubtext}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Options</Text>
          <View style={styles.additionalActions}>
            {additionalActions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.additionalActionItem}
                onPress={() => {
                  switch (item.label) {
                    case 'Settings':
                      navigation.navigate('Settings');
                      break;
                    case 'Help & Support':
                      navigation.navigate('HelpSupport');
                      break;
                    case 'Privacy Policy':
                      navigation.navigate('PrivacyPolicy');
                      break;
                  }
                }}
              >
                <View style={[styles.additionalActionIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={20} color="#fff" />
                </View>
                <View style={styles.additionalActionContent}>
                  <Text style={styles.additionalActionTitle}>{item.label}</Text>
                  <Text style={styles.additionalActionSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const mainActions = [
  { label: 'My Orders', subtitle: 'Track purchases', icon: 'receipt-outline' },
  { label: 'Items Bought', subtitle: 'View items', icon: 'bag-outline' },
  { label: 'Transactions', subtitle: 'Payment history', icon: 'card-outline' },
  { label: 'My Store', subtitle: 'Manage listings', icon: 'storefront-outline' },
];

const additionalActions = [
  { label: 'Settings', subtitle: 'App preferences', icon: 'settings-outline', color: '#6366f1' },
  { label: 'Help & Support', subtitle: 'Get assistance', icon: 'help-circle-outline', color: '#10b981' },
  { label: 'Privacy Policy', subtitle: 'Terms & conditions', icon: 'shield-checkmark-outline', color: '#f59e0b' },
];

// ...Styles remain the same (reuse your styles object)


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1419',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#1f2937',
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#facc15',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#facc15',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  balanceContainer: {
    backgroundColor: '#facc15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1419',
    textAlign: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#facc15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: '#0f1419',
    fontWeight: '600',
    marginLeft: 6,
  },
  statsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  phoneInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  savePhoneButton: {
    backgroundColor: '#facc15',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  savePhoneText: {
    color: '#0f1419',
    fontWeight: '600',
    marginLeft: 6,
  },
  mainActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  mainActionItem: {
    width: '48%',
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  mainActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  mainActionSubtext: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
  },
  additionalActions: {
    marginTop: 8,
  },
  additionalActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  additionalActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  additionalActionContent: {
    flex: 1,
  },
  additionalActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  additionalActionSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
});