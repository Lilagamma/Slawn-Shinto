import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { doc, getDocs, query, where, updateDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebaseconfig';
import { useNavigation } from '@react-navigation/native';

const StoreEdit = () => {
  const [aboutText, setAboutText] = useState('');
  const [docId, setDocId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const userId = auth.currentUser.uid;
        const q = query(collection(db, 'characters'), where('userId', '==', userId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docRef = snapshot.docs[0];
          setDocId(docRef.id);
          const data = docRef.data();
          setAboutText(data.storeAbout || '');
        }
      } catch (err) {
        console.error('Failed to fetch store info:', err);
      }
    };

    fetchAbout();
  }, []);

  const handleSave = async () => {
    if (!docId) return;

    try {
      const ref = doc(db, 'characters', docId);
      await updateDoc(ref, {
        storeAbout: aboutText,
      });
      Alert.alert('Success', 'Store info updated!');
      navigation.goBack();
    } catch (err) {
      console.error('Failed to update store info:', err);
      Alert.alert('Error', 'Could not update store info.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Edit "About this Store"</Text>
      <TextInput
        value={aboutText}
        onChangeText={setAboutText}
        multiline
        style={styles.textarea}
        placeholder="Tell people about your store..."
        placeholderTextColor="#999"
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

export default StoreEdit;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
    padding: 20,
  },
  label: {
    color: '#facc15',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: '600',
  },
  textarea: {
    backgroundColor: '#1a2332',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    height: 150,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#facc15',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});
