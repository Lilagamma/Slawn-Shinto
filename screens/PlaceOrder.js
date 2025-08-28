// screens/PlaceOrder.js
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Modal,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseconfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Comprehensive list of countries with phone codes
const COUNTRIES = [
  { code: 'GH', name: 'Ghana', currency: 'GHS', phoneCode: '+233' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', phoneCode: '+234' },
  { code: 'KE', name: 'Kenya', currency: 'KES', phoneCode: '+254' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', phoneCode: '+27' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', phoneCode: '+20' },
  { code: 'US', name: 'United States', currency: 'USD', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', phoneCode: '+44' },
  { code: 'CA', name: 'Canada', currency: 'CAD', phoneCode: '+1' },
  { code: 'AU', name: 'Australia', currency: 'AUD', phoneCode: '+61' },
  { code: 'DE', name: 'Germany', currency: 'EUR', phoneCode: '+49' },
  { code: 'FR', name: 'France', currency: 'EUR', phoneCode: '+33' },
  { code: 'IT', name: 'Italy', currency: 'EUR', phoneCode: '+39' },
  { code: 'ES', name: 'Spain', currency: 'EUR', phoneCode: '+34' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', phoneCode: '+31' },
  { code: 'IN', name: 'India', currency: 'INR', phoneCode: '+91' },
  { code: 'CN', name: 'China', currency: 'CNY', phoneCode: '+86' },
  { code: 'JP', name: 'Japan', currency: 'JPY', phoneCode: '+81' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', phoneCode: '+55' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', phoneCode: '+52' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', phoneCode: '+971' },
].sort((a, b) => a.name.localeCompare(b.name));

const PlaceOrder = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params || {};

  // Initialize with Ghana as default
  const defaultCountry = COUNTRIES.find(c => c.code === 'GH') || COUNTRIES[0];

  // Form states
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(defaultCountry.phoneCode + ' ');
  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // UI states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    // Update phone number with new country code
    const currentPhoneWithoutCode = phone.replace(/^\+\d+\s/, '');
    setPhone(country.phoneCode + ' ' + currentPhoneWithoutCode);
    setShowCountryModal(false);
  };

  // Handle phone number input
  const handlePhoneChange = (text) => {
    // Ensure the country code stays at the beginning
    const countryCodeWithSpace = selectedCountry.phoneCode + ' ';
    
    if (!text.startsWith(countryCodeWithSpace)) {
      // If user tries to delete the country code, restore it
      const numberPart = text.replace(/^\+?\d*\s?/, '');
      setPhone(countryCodeWithSpace + numberPart);
    } else {
      setPhone(text);
    }
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};
    
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    
    const phoneNumber = phone.replace(selectedCountry.phoneCode + ' ', '').trim();
    if (!phoneNumber) newErrors.phone = 'Phone number is required';
    
    if (!streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!stateProvince.trim()) newErrors.stateProvince = 'State/Province is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!postalCode.trim()) newErrors.postalCode = 'Postal code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onPlaceOrder = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in to place an order.');
        setIsLoading(false);
        return;
      }

      const orderData = {
        userId: user.uid,
        buyerEmail: email,
        productId: product?.id || product?._id || null,
        productTitle: product?.title || '',
        amount: parseFloat(product?.price) || 0,
        currency: selectedCountry.currency,
        shippingAddress: {
          fullName,
          email,
          phone,
          streetAddress,
          apartment,
          stateProvince,
          city,
          postalCode,
          country: selectedCountry.name,
          countryCode: selectedCountry.code,
        },
        status: 'pending',
        orderNumber: `ORD-${Date.now()}`,
        createdAt: serverTimestamp(),
      };

      // Save order in Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      Alert.alert(
        'Order Placed Successfully!',
        `Order #${orderData.orderNumber} has been created.`,
        [
          {
            text: 'Continue to Payment',
            onPress: () => navigation.navigate('PaymentWebView', {
              product,
              orderId: docRef.id,
              orderData,
            })
          }
        ]
      );

    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountrySelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryDetails}>{item.phoneCode} • {item.currency}</Text>
      </View>
      {selectedCountry.code === item.code && (
        <Text style={styles.selectedIcon}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Back Button */}
<View style={styles.backButtonContainer}>
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}
    activeOpacity={0.7}
  >
    <Ionicons name="arrow-back" size={24} color="#212529" />
  </TouchableOpacity>
</View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Shipping Information</Text>
            <Text style={styles.headerSubtitle}>Please provide your delivery details</Text>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityText}>🔒 Your information is encrypted and secure</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Country Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Country / Region *</Text>
              <TouchableOpacity
                style={[styles.countrySelector, errors.country && styles.inputError]}
                onPress={() => setShowCountryModal(true)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.countrySelectorText}>{selectedCountry.name}</Text>
                  <Text style={styles.countrySelectorSubtext}>
                    {selectedCountry.phoneCode} • {selectedCountry.currency}
                  </Text>
                </View>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone Number with Country Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={`${selectedCountry.phoneCode} Enter your phone number`}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Street Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={[styles.input, errors.streetAddress && styles.inputError]}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="Enter your street address"
                placeholderTextColor="#999"
              />
              {errors.streetAddress && <Text style={styles.errorText}>{errors.streetAddress}</Text>}
            </View>

            {/* Apartment (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apartment, Suite, etc. (Optional)</Text>
              <TextInput
                style={styles.input}
                value={apartment}
                onChangeText={setApartment}
                placeholder="Apartment, suite, unit, building, floor, etc."
                placeholderTextColor="#999"
              />
            </View>

            {/* State/Province and City Row */}
            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>State / Province *</Text>
                <TextInput
                  style={[styles.input, errors.stateProvince && styles.inputError]}
                  value={stateProvince}
                  onChangeText={setStateProvince}
                  placeholder="State/Province"
                  placeholderTextColor="#999"
                />
                {errors.stateProvince && <Text style={styles.errorText}>{errors.stateProvince}</Text>}
              </View>

              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#999"
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
            </View>

            {/* Postal Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Postal Code *</Text>
              <TextInput
                style={[styles.input, errors.postalCode && styles.inputError]}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Enter postal code"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
              {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
            </View>
          </View>

          {/* Place Order Button */}
          <TouchableOpacity
            style={[styles.placeOrderButton, isLoading && styles.buttonDisabled]}
            onPress={onPlaceOrder}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.placeOrderButtonText}>
              {isLoading ? 'Placing Order...' : 'Place Order'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Country Selection Modal */}
        <Modal
          visible={showCountryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCountryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowCountryModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={COUNTRIES}
                renderItem={renderCountryItem}
                keyExtractor={(item) => item.code}
                style={styles.countryList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PlaceOrder;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  securityNotice: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
  },
  securityText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  halfInputGroup: {
    flex: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#212529',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  countrySelector: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countrySelectorText: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  countrySelectorSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6c757d',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  placeOrderButton: {
    backgroundColor: '#007bff',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6c757d',
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  countryDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  selectedIcon: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  backButtonContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
});