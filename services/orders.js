// services/orders.js
import { db } from '../firebaseconfig';
import { collection, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';

// Create order
export const createOrder = async (buyerId, sellerId, items) => {
  const ordersRef = collection(db, 'orders');
  const newOrder = {
    buyerId,
    sellerId,
    items,
    status: 'pending',
    trackingNumber: '',
    updates: [
      {
        status: 'pending',
        message: 'Order placed successfully',
        timestamp: serverTimestamp()
      }
    ],
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(ordersRef, newOrder);
  return docRef.id;
};

// Update order status
export const updateOrderStatus = async (orderId, newStatus, message, trackingNumber = '') => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: newStatus,
    trackingNumber: trackingNumber || '',
    updates: arrayUnion({
      status: newStatus,
      message,
      timestamp: serverTimestamp()
    })
  });
};
