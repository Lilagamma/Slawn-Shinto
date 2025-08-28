import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebaseconfig';
import { useNavigation } from '@react-navigation/native';

const COMPANY_EMAIL = 'georgeannann461@gmail.com';

export default function MyOrders() {
  const navigation = useNavigation(); // Move inside component
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // Fetch orders - ONLY PHYSICAL ITEMS
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const q = query(
      collection(db, 'transactions'),
      where('buyerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const orderList = [];
  
      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();
  
        // --- Fetch product details ---
        let productInfo = {};
        if (orderData.productId) {
          try {
            const productDoc = await getDoc(doc(db, 'items', orderData.productId));
            if (productDoc.exists()) {
              productInfo = productDoc.data();
            }
          } catch (error) {
            console.error('Error fetching product info:', error);
          }
        }
  
        // --- Filter: Only physical items ---
        if (productInfo.deliveryType !== 'delivery') continue;
  
        // --- Fetch author info ---
        let authorInfo = {};
        if (productInfo.userId) {
          try {
            const authorQuery = query(
              collection(db, 'characters'),
              where('userId', '==', productInfo.userId)
            );
            const authorSnapshot = await getDocs(authorQuery);
            if (!authorSnapshot.empty) {
              authorInfo = authorSnapshot.docs[0].data();
            }
          } catch (error) {
            console.error('Error fetching author info:', error);
          }
        }
  
        orderList.push({
          id: orderDoc.id,
          ...orderData,
          productInfo,
          authorInfo,
        });
      }
  
      setOrders(orderList);
      setLoading(false);
    });
  
    return () => unsubscribe(); // Clean up on unmount
  }, []);
  

  // Force re-render every minute for timers
  useEffect(() => {
    const timer = setInterval(() => setOrders(prev => [...prev]), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Helper functions ---
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'done':
        return '#10b981';
      case 'shipped':
      case 'delivery':
        return '#8b5cf6';
      case 'processing':
      case 'started':
        return '#f59e0b';
      case 'pending':
        return '#6b7280';
      case 'cancelled':
      case 'rejected':
        return '#ef4444';
      case 'refunded':
        return '#f97316';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'done':
        return 'checkmark-circle';
      case 'shipped':
      case 'delivery':
        return 'car';
      case 'processing':
      case 'started':
        return 'time';
      case 'pending':
        return 'hourglass';
      case 'cancelled':
      case 'rejected':
        return 'close-circle';
      case 'refunded':
        return 'card';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayStatus = (order) => {
    if (order.adminStage) {
      switch (order.adminStage) {
        case 'started': return 'Processing';
        case 'delivery': return 'Out for Delivery';
        case 'done': return 'Delivered';
        case 'rejected': return 'Cancelled';
        default: return order.adminStage;
      }
    }
    return order.status || 'Pending';
  };

  const getRemainingTime = (order) => {
    if (order.adminStage === 'started' && (order.adminStageStartedAt || order.processingAt || order.waitingPeriodStart)) {
      const startTime = order.adminStageStartedAt || order.processingAt || order.waitingPeriodStart;
      const startDate = startTime.seconds ? new Date(startTime.seconds * 1000) : new Date(startTime);
      const now = new Date();
      const durationMs = 4 * 60 * 60 * 1000;
      const remaining = durationMs - (now - startDate);
      if (remaining <= 0) return null;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    return null;
  };

  const hasProcessingExpired = (order) => {
    if (order.adminStage === 'started' && (order.adminStageStartedAt || order.processingAt || order.waitingPeriodStart)) {
      const startTime = order.adminStageStartedAt || order.processingAt || order.waitingPeriodStart;
      const startDate = startTime.seconds ? new Date(startTime.seconds * 1000) : new Date(startTime);
      const now = new Date();
      const durationMs = 4 * 60 * 60 * 1000;
      return (now - startDate) > durationMs;
    }
    return false;
  };

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? No refund will be provided once cancelled.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'transactions', orderId), {
                adminStage: 'rejected',
                status: 'cancelled',
                cancelledByBuyer: true,
                cancelledAt: new Date(),
              });
              setOrders(orders.map(o =>
                o.id === orderId
                  ? { ...o, adminStage: 'rejected', status: 'cancelled' }
                  : o
              ));
              Alert.alert('Order Cancelled', 'You have cancelled this order. No refund will be provided.');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      `Need help with your order? Contact our support team at ${COMPANY_EMAIL}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => {
            const emailUrl = `mailto:${COMPANY_EMAIL}?subject=Order Support Request`;
            Linking.openURL(emailUrl).catch(() => {
              Alert.alert('Error', 'Could not open email app');
            });
          },
        },
      ]
    );
  };

  const handleMarkDelivered = async (orderId) => {
    Alert.alert(
      'Confirm Delivery',
      'Have you received your physical item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delivered',
          onPress: async () => {
            try {
              setUpdatingOrder(orderId);
              await updateDoc(doc(db, 'transactions', orderId), {
                status: 'delivered',
                adminStage: 'done',
                deliveredAt: new Date(),
                deliveryConfirmedByBuyer: true,
              });
              setOrders(orders.map(o =>
                o.id === orderId
                  ? { ...o, status: 'delivered', adminStage: 'done' }
                  : o
              ));
              Alert.alert('Success', 'Order marked as delivered!');
            } catch (error) {
              console.error('Error updating order:', error);
              Alert.alert('Error', 'Failed to update order status');
            } finally {
              setUpdatingOrder(null);
            }
          },
        },
      ]
    );
  };

  const handleRateOrder = (orderId) => {
    Alert.alert('Rate Order', 'Rating feature coming soon!');
  };

  const handleViewDetails = (order) => {
    const authorName = order.authorInfo?.author || 'Unknown Seller';
    Alert.alert(
      'Order Details',
      `Order ID: ${order.reference || order.id}
Product: ${order.productTitle || 'N/A'}
Amount: ${order.currency} ${order.amount}
Seller: ${authorName}
Type: Physical Item (Delivery Required)
Date: ${formatDate(order.createdAt)}
Status: ${getDisplayStatus(order)}`,
      [{ text: 'OK' }]
    );
  };

  const renderOrderActions = (order) => {
    const currentStatus = order.adminStage || order.status;
    const displayStatus = currentStatus?.toLowerCase();
    const isExpired = hasProcessingExpired(order);
    const remainingTime = getRemainingTime(order);

    return (
      <View style={styles.actionsContainer}>
        {order.adminStage === 'started' && (
          <View style={[styles.waitingNotice, isExpired && styles.expiredNotice]}>
            <Ionicons
              name={isExpired ? "warning-outline" : "time-outline"}
              size={16}
              color={isExpired ? "#dc2626" : "#f59e0b"}
            />
            <Text style={[styles.waitingText, isExpired && styles.expiredText]}>
              {isExpired
                ? 'Processing time expired - Contact support if needed'
                : `Processing - Time remaining: ${remainingTime || 'Calculating...'}`}
            </Text>
          </View>
        )}

        {order.adminStage === 'delivery' && (
          <View style={styles.deliveryContainer}>
            <View style={styles.waitingNotice}>
              <Ionicons name="car-outline" size={16} color="#8b5cf6" />
              <Text style={styles.waitingText}>Your item is out for delivery!</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleMarkDelivered(order.id)}
              disabled={updatingOrder === order.id}
            >
              {updatingOrder === order.id ? (
                <ActivityIndicator size="small" color="#0f1419" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color="#0f1419" />
                  <Text style={styles.primaryButtonText}>Confirm Received</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {(displayStatus === 'delivered' || displayStatus === 'done') && (
          <View style={styles.deliveredContainer}>
            <View style={styles.successNotice}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
              <Text style={styles.successText}>Item successfully delivered!</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.rateButton]}
              onPress={() => handleRateOrder(order.id)}
            >
              <Ionicons name="star-outline" size={14} color="#f59e0b" />
              <Text style={styles.rateButtonText}>Rate Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {(displayStatus === 'cancelled' || displayStatus === 'rejected') && (
          <View style={styles.cancelledNotice}>
            <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
            <Text style={styles.cancelledText}>
              Order was cancelled {order.cancelledByBuyer ? 'by you' : ''}
            </Text>
          </View>
        )}

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail-outline" size={14} color="#3b82f6" />
            <Text style={styles.contactButtonText}>Support</Text>
          </TouchableOpacity>

          {displayStatus !== 'delivered' &&
            displayStatus !== 'done' &&
            displayStatus !== 'cancelled' &&
            displayStatus !== 'rejected' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelOrder(order.id)}
              >
                <Ionicons name="close-circle-outline" size={14} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            style={[styles.actionButton, styles.detailsButton]}
            onPress={() => handleViewDetails(order)}
          >
            <Ionicons name="information-circle-outline" size={14} color="#9ca3af" />
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderItem = ({ item }) => {
    const displayStatus = getDisplayStatus(item);
    const statusColor = getStatusColor(item.adminStage || item.status);
    const authorName = item.authorInfo?.author || 'Unknown Seller';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {item.productTitle || 'Physical Item'}
            </Text>
            <Text style={styles.sellerName}>by {authorName}</Text>
            <Text style={styles.deliveryType}>📦 Physical Delivery</Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>
              {item.currency || 'GHS'} {item.amount || '0'}
            </Text>
          </View>
        </View>

        <View style={styles.orderMeta}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <View style={styles.statusContainer}>
            <Ionicons
              name={getStatusIcon(item.adminStage || item.status)}
              size={14}
              color={statusColor}
            />
            <Text style={[styles.status, { color: statusColor }]}>
              {displayStatus}
            </Text>
          </View>
        </View>

        {renderOrderActions(item)}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#4b5563" />
          <Text style={styles.emptyTitle}>No Physical Orders</Text>
          <Text style={styles.emptyText}>
            Your physical item orders will appear here.{'\n'}
            Digital downloads are handled separately.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.header}>
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}
  >
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>
  <View style={{ marginLeft: 8 }}>
    <Text style={styles.headerTitle}>My Physical Orders</Text>
    <Text style={styles.headerSubtitle}>{orders.length} physical items</Text>
  </View>
</View>


      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1419' },
  loadingText: { color: '#9ca3af', marginTop: 12, fontSize: 14 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  listContainer: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  productInfo: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  sellerName: { fontSize: 13, color: '#9ca3af', marginBottom: 2 },
  deliveryType: { fontSize: 12, color: '#f59e0b', fontWeight: '500' },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#facc15' },
  orderMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#374151' 
  },
  orderDate: { fontSize: 12, color: '#9ca3af' },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  status: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  
  // Actions Container
  actionsContainer: { flexDirection: 'column', gap: 8 },
  deliveryContainer: { marginBottom: 8 },
  deliveredContainer: { marginBottom: 8 },
  
  // Notice Styles
  waitingNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#374151', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  expiredNotice: { backgroundColor: '#fef2f2' },
  successNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#d1fae5', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  cancelledNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fee2e2', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  
  // Text Styles
  waitingText: { color: '#d1d5db', fontSize: 13, fontWeight: '500', marginLeft: 8, flex: 1 },
  expiredText: { color: '#dc2626', fontSize: 13, fontWeight: '500', marginLeft: 8, flex: 1 },
  successText: { color: '#065f46', fontSize: 13, fontWeight: '500', marginLeft: 8, flex: 1 },
  cancelledText: { color: '#991b1b', fontSize: 13, fontWeight: '500', marginLeft: 8, flex: 1 },
  
  // Action Buttons
  actionButtonsRow: { 
    flexDirection: 'row', 
    gap: 8, 
    flexWrap: 'wrap' 
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    minHeight: 36,
    flex: 1,
    minWidth: 80
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1f2937' 
  },
  backButton: { 
    padding: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  
  contactButton: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#3b82f6' },
  contactButtonText: { color: '#3b82f6', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  primaryButton: { backgroundColor: '#facc15' },
  primaryButtonText: { color: '#0f1419', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  cancelButton: { backgroundColor: '#ef4444' },
  cancelButtonText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  rateButton: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' },
  rateButtonText: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  detailsButton: { backgroundColor: '#374151' },
  detailsButtonText: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginLeft: 4 },
});