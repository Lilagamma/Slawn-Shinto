import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HelpSupportScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Help & Support</Text>
        <Text style={styles.text}>
          If you experience issues, contact our support at support@example.com.
        </Text>
        <Text style={styles.text}>
          Frequently asked questions:
        </Text>
        <Text style={styles.text}>1. How to edit profile?</Text>
        <Text style={styles.text}>2. How to reset password?</Text>
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
