import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Privacy Policy</Text>
        <Text style={styles.text}>
          Your privacy is important to us. This app collects minimal user data required to provide the services.
        </Text>
        <Text style={styles.text}>
          We do not share personal information with third parties without consent.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  backButton: { paddingHorizontal: 20, paddingTop: 20 },
  backText: { color: '#7ef29d', fontWeight: 'bold', fontSize: 16 },
  container: { padding: 20 },
  header: { fontSize: 24, color: '#7ef29d', fontWeight: 'bold', marginBottom: 20 },
  text: { color: '#fff', fontSize: 16, marginBottom: 10 },
});
