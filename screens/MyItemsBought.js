import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseconfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

export default function MyItemsBought() {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [itemsBought, setItemsBought] = useState([]);
  const [downloadingItemId, setDownloadingItemId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (!userId) return;

        const txQuery = query(
          collection(db, 'transactions'),
          where('buyerId', '==', userId)
        );
        const txSnapshot = await getDocs(txQuery);

        const fetchedItems = [];

        for (const txDoc of txSnapshot.docs) {
          const txData = txDoc.data();
          const productId = txData.productId;

          if (productId) {
            const productRef = doc(db, 'items', productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const productData = productSnap.data();
              fetchedItems.push({
                id: `${productSnap.id}-${txDoc.id}`,
                title: productData.title || txData.productTitle || 'Untitled Item',
                price: productData.price || 0,
                purchaseDate: txData.createdAt?.toDate ? txData.createdAt.toDate() : null,
                imageURL: productData.imageURL || null,
                deliveryType: productData.deliveryType || 'physical',
                fileURL: productData.fileURL || null,
                fileType: productData.fileType || null,
                description: productData.description || '',
              });
            }
          }
        }

        setItemsBought(fetchedItems);
      } catch (error) {
        console.error('Error fetching bought items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [userId]);

  // Universal download handler
  const handleDownload = async (fileUrl, title, itemId) => {
    if (!fileUrl) {
      Alert.alert('Not Available', 'This file is not available for download.');
      return;
    }
  
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Storage permission is required to download.');
        return;
      }
  
      setDownloadingItemId(itemId);
      setDownloadProgress(0);
  
      const timestamp = new Date().getTime();
      const extension = fileUrl.split('.').pop();
      const fileUri = FileSystem.documentDirectory + `${title || 'download'}-${timestamp}.${extension}`;
  
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        fileUri,
        {},
        (progressData) => {
          const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );
  
      // Wrap in timeout
      const downloadPromise = downloadResumable.downloadAsync();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timed out')), 60000) // 60s timeout
      );
  
      const { uri } = await Promise.race([downloadPromise, timeoutPromise]);
  
      // Media files
      if (['mp3', 'wav', 'jpg', 'jpeg', 'png', 'mp4', 'mov'].includes(extension.toLowerCase())) {
        await MediaLibrary.createAssetAsync(uri);
        Alert.alert('Downloaded', 'File saved to your device library.');
      }
      // PDFs
      else if (extension.toLowerCase() === 'pdf') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Downloaded', `PDF saved to app storage: ${uri}`);
        }
      } else {
        Alert.alert('Downloaded', `File saved to app storage: ${uri}`);
      }
  
      setDownloadingItemId(null);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadingItemId(null);
      Alert.alert(
        'Download Failed',
        `${error.message}\nPlease check your network and try again.`,
        [
          { text: 'Retry', onPress: () => handleDownload(fileUrl, title, itemId) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };
  const openDetailsModal = (item) => {
    setSelectedItem(item);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setSelectedItem(null);
    setDetailsModalVisible(false);
  };

  const handleBack = () => navigation.goBack();

  if (!userId)
    return (
      <View style={styles.centered}>
        <Text style={styles.warningText}>⚠️ Please log in to view your bought items.</Text>
      </View>
    );

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#facc15" />
      </View>
    );

  if (itemsBought.length === 0)
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>🛒 You haven't bought anything yet.</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1419" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>My Items Bought</Text>
      </View>

      <FlatList
        data={itemsBought}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <TouchableOpacity
              style={{ flexDirection: 'row', flex: 1 }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
            >
              {item.imageURL && <Image source={{ uri: item.imageURL }} style={styles.itemImage} />}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>GH₵{item.price}</Text>
                {item.purchaseDate && (
                  <Text style={styles.itemDate}>
                    Bought on {item.purchaseDate.toLocaleDateString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {item.deliveryType === 'download' && item.fileURL ? (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownload(item.fileURL, item.title, item.id)}
              >
                {downloadingItemId === item.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={{ marginLeft: 6, color: '#000', fontWeight: 'bold' }}>
                      {Math.round(downloadProgress * 100)}%
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.downloadText}>Download</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => openDetailsModal(item)}
              >
                <Text style={styles.detailsText}>Details</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedItem?.title}</Text>
            <Text style={styles.modalDescription}>
              {selectedItem?.description || 'No description available.'}
            </Text>
            {selectedItem?.purchaseDate && (
              <Text style={styles.modalDate}>
                Delivered on: {selectedItem.purchaseDate.toLocaleDateString()}
              </Text>
            )}
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeDetailsModal}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419', paddingHorizontal: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1419' },
  warningText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 16, textAlign: 'center' },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemImage: { width: 65, height: 65, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemPrice: { color: '#facc15', fontSize: 14, marginBottom: 2 },
  itemDate: { color: '#9ca3af', fontSize: 12 },
  downloadButton: { backgroundColor: '#facc15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  downloadText: { color: '#000', fontWeight: 'bold' },
  detailsButton: { backgroundColor: '#4b5563', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  detailsText: { color: '#fff', fontWeight: 'bold' },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { backgroundColor: '#1f2937', padding: 20, borderRadius: 12, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  modalDescription: { fontSize: 14, color: '#d1d5db', marginBottom: 10 },
  modalDate: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },
  modalCloseButton: { backgroundColor: '#facc15', padding: 10, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#000', fontWeight: 'bold' },
});
