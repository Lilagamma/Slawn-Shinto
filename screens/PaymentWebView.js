import React from 'react';
import { Alert, StyleSheet, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseconfig';
import { addDoc, collection, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const PaymentWebView = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { product, orderId } = route.params || {};

  if (!product) {
    Alert.alert('Error', 'No product provided for payment.');
    navigation.goBack();
    return null;
  }

  const priceNumber = parseFloat(product.price) || 0;
  const amountSmallestUnit = Math.round(priceNumber * 100);
  const buyerEmail = auth.currentUser?.email || 'customer@example.com';
  const buyerId = auth.currentUser?.uid || null;

  const paystackHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <title>Paystack Checkout</title>
        <style>
          html,body { height:100%; margin:0; }
          body { display:flex; align-items:center; justify-content:center; font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .card { width:100%; max-width:420px; box-shadow:0 6px 18px rgba(0,0,0,.08); padding:28px; border-radius:12px; }
          h3 { font-size:20px; margin-bottom:18px; color:#222; }
          p { color:#444; margin-bottom:24px; font-size:16px; }
          button { padding:16px 28px; font-size:18px; background:#0b85e6; color:#fff; border:none; border-radius:10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>You're about to pay for</h3>
          <p><strong>${escapeHtml(product.title)}</strong></p>
          <p>Amount: ${priceNumber} GHS</p>
          <button onclick="payWithPaystack()">💳 Pay Now</button>
        </div>

        <script src="https://js.paystack.co/v1/inline.js"></script>
        <script>
          function payWithPaystack() {
            var handler = PaystackPop.setup({
              key: 'pk_test_b301ab50bff36c2b9eb6d59dbbf5c357ad023b45',
              email: '${escapeJsString(buyerEmail)}',
              amount: ${amountSmallestUnit},
              currency: 'GHS',
              ref: 'slawn-' + Date.now(),
              callback: function(response){
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', reference: response.reference }));
              },
              onClose: function(){
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
              }
            });
            handler.openIframe();
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = async (event) => {
    let payload;
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch (err) {
      console.error('Invalid message from webview', err);
      Alert.alert('Payment Error', 'Unexpected response from payment window.');
      navigation.goBack();
      return;
    }

    if (payload.status === 'cancelled') {
      Alert.alert('Payment Cancelled', 'You closed the payment window.');
      navigation.goBack();
      return;
    }

    if (payload.status === 'success') {
      const reference = payload.reference;
      try {
        // Save transaction
        await addDoc(collection(db, 'transactions'), {
          productId: product.id || product._id || null,
          productTitle: product.title || null,
          buyerId,
          buyerEmail,
          amount: priceNumber,
          currency: 'GHS',
          reference,
          createdAt: serverTimestamp(),
        });

        // Increment product buys
        if (product.id) {
          const productRef = doc(db, 'items', product.id);
          await updateDoc(productRef, { buys: increment(1) });
        }

        // Update order if exists
        if (orderId) {
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            status: 'paid',
            note: 'Payment successful',
            paymentReference: reference,
            updatedAt: serverTimestamp(),
          });
        }

        Alert.alert('Payment Successful', `Reference: ${reference}`);

        // ✅ Conditional navigation
        if (product.deliveryType === 'download') {
          navigation.reset({ index: 0, routes: [{ name: 'MyItemsBought' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MyOrders' }] });
        }
      } catch (err) {
        console.error('Error saving transaction or updating item/order:', err);
        Alert.alert('Warning', 'Payment was successful but recording transaction or updating order failed.');
        navigation.goBack();
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#000" />
      </TouchableOpacity>

      <WebView
        originWhitelist={['*']}
        source={{ html: paystackHTML }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0b85e6" />
          </View>
        )}
      />
    </View>
  );
};

export default PaymentWebView;

// Escape helpers
function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeJsString(str = '') {
  return String(str).replace(/['"\\\n\r]/g, (c) => {
    if (c === '\n') return '\\n';
    if (c === '\r') return '\\r';
    if (c === "'") return "\\'";
    if (c === '"') return '\\"';
    if (c === '\\') return '\\\\';
    return c;
  });
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
});
