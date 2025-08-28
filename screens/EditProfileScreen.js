import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../firebaseconfig';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import axios from 'axios';

export default function EditProfileScreen({ navigation }) {
  const [currentAuthor, setCurrentAuthor] = useState('');
  const [currentBio, setCurrentBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [newAvatar, setNewAvatar] = useState(null);
  const [docId, setDocId] = useState(null);
  const [newAuthor, setNewAuthor] = useState('');
  const [newBio, setNewBio] = useState('');
  const [phone, setPhone] = useState('');

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const q = query(collection(db, 'characters'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          setDocId(docSnap.id);
          setCurrentAuthor(data.author || '');
          setCurrentBio(data.bio || '');
          setAvatar(data.avatar || '');
          setPhone(data.phone || '');
        } else {
          console.log('No user document found in characters.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images, // updated
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const image = result.assets[0];
        setNewAvatar(image.uri);
      }
    } catch (error) {
      console.log('Error picking avatar:', error);
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    const data = new FormData();
    data.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    data.append('upload_preset', 'shinto');
    data.append('cloud_name', 'dizilnbsh');

    try {
      const res = await axios.post(
        'https://api.cloudinary.com/v1_1/dizilnbsh/image/upload',
        data
      );
      return res.data.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err.response?.data || err.message);
      return null;
    }
  };

  const handleSave = async () => {
    let avatarUrl = avatar;

    if (newAvatar) {
      const uploadedUrl = await uploadImageToCloudinary(newAvatar);
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      } else {
        Alert.alert('Upload failed', 'Could not upload image.');
        return;
      }
    }

    if (phone && (!phone.startsWith('+') || phone.length < 8)) {
      Alert.alert('Invalid phone number', 'Phone number should start with + and be valid.');
      return;
    }

    try {
      if (!docId) {
        Alert.alert('Error', 'User document not found.');
        return;
      }

      await updateDoc(doc(db, 'characters', docId), {
        author: newAuthor || currentAuthor,
        bio: newBio || currentBio,
        avatar: avatarUrl,
        phone: phone.trim(),
      });

      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Update failed', 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Edit Profile</Text>

        <TouchableOpacity onPress={pickImage}>
          <Image
            source={newAvatar ? { uri: newAvatar } : avatar ? { uri: avatar } : require('../assets/avatar.png')}
            style={styles.avatar}
          />
          <Text style={styles.changeAvatarText}>Change Avatar</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Current Name:</Text>
          <Text style={styles.infoText}>{currentAuthor}</Text>

          <Text style={styles.infoLabel}>Current Bio:</Text>
          <Text style={styles.infoText}>{currentBio}</Text>

          <Text style={styles.infoLabel}>Current Phone:</Text>
          <Text style={styles.infoText}>{phone || 'No phone added'}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Type a new username"
          placeholderTextColor="#888"
          value={newAuthor}
          onChangeText={setNewAuthor}
        />

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Type a new bio"
          placeholderTextColor="#888"
          multiline
          value={newBio}
          onChangeText={setNewBio}
        />

        <TextInput
          style={styles.input}
          placeholder="+233501234567"
          keyboardType="phone-pad"
          placeholderTextColor="#888"
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  backButton: { paddingHorizontal: 20, paddingTop: 20 },
  backText: { color: '#7ef29d', fontWeight: 'bold', fontSize: 16 },
  container: {
    padding: 20,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    color: '#7ef29d',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#7ef29d',
    marginBottom: 10,
  },
  changeAvatarText: {
    color: '#7ef29d',
    marginBottom: 15,
  },
  infoBox: {
    marginTop: 10,
    backgroundColor: '#2c2c3e',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  infoLabel: {
    color: '#7ef29d',
    fontWeight: 'bold',
    marginTop: 5,
  },
  infoText: {
    color: '#fff',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#292b3e',
    color: '#fff',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#7ef29d',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
