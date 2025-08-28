import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons'; // Back button

const CheckoutScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const auth = getAuth();

  const { product } = route.params || {};

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No product data found</Text>
      </View>
    );
  }

  const handlePayNow = () => {
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please login to continue.');
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('PaymentWebView', { product });
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={{ uri: product.imageURL }} style={styles.image} />
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.price}>GHS {product.price}</Text>
      <Text style={styles.author}>By {product.userEmail}</Text>
      <Text style={styles.description}>{product.description}</Text>

      <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
        <Text style={styles.payText}>Pay with Paystack</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
    padding: 20,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 18,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginVertical: 20,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  author: {
    color: '#ccc',
    fontSize: 14,
    marginVertical: 4,
  },
  price: {
    color: '#facc15',
    fontSize: 18,
    marginVertical: 10,
  },
  description: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  payButton: {
    marginTop: 30,
    backgroundColor: '#facc15',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
  },
  payText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
});
