import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { db, auth } from '../firebaseconfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

// Enhanced upload function with better error handling
export const uploadToCloudinaryWithProgress = (fileUri, type = 'image', onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const data = new FormData();

    let fileType;
    let fileName;
    
    if (type === 'image') {
      fileType = 'image/jpeg';
      fileName = `image_${Date.now()}.jpg`;
    } else if (type === 'audio') {
      fileType = 'audio/mpeg';
      fileName = `audio_${Date.now()}.mp3`;
    } else if (type === 'pdf') {
      fileType = 'application/pdf';
      fileName = `document_${Date.now()}.pdf`;
    }

    data.append('file', {
      uri: fileUri,
      type: fileType,
      name: fileName,
    });
    data.append('upload_preset', 'shinto');
    data.append('resource_type', type === 'image' ? 'image' : 'raw');

    const cloudUrl = `https://api.cloudinary.com/v1_1/dizilnbsh/${
      type === 'image' ? 'image' : 'raw'
    }/upload`;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          console.log('Cloudinary upload success:', result);
          resolve(result.secure_url);
        } catch (parseError) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        console.error('Cloudinary upload failed:', xhr.responseText);
        reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('POST', cloudUrl);
    xhr.send(data);
  });
};

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [deliveryType, setDeliveryType] = useState('download');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Audio preview states
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(null);
  const [position, setPosition] = useState(null);

  const handleReset = async () => {
    // Stop and unload audio if playing
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
    
    setTitle('');
    setDescription('');
    setPrice('');
    setCategory('');
    setImageUri(null);
    setFileUri(null);
    setFileName('');
    setFileType('');
    setDeliveryType('download');
    setProgress(0);
    setUploading(false);
    setDuration(null);
    setPosition(null);
    Alert.alert('Form Reset', 'All fields have been cleared.');
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant photo library permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setFileUri(null);
      setFileName('');
      setFileType('image');
      
      // Unload audio if switching from audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }
    }
  };

  const handleAudioPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const audioFile = result.assets[0];
        setFileUri(audioFile.uri);
        setFileName(audioFile.name);
        setFileType('audio');
        setImageUri(null);
        
        // Load audio for preview
        await loadAudio(audioFile.uri);
      }
    } catch (error) {
      console.error('Audio pick error:', error);
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  const handlePdfPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pdfFile = result.assets[0];
        setFileUri(pdfFile.uri);
        setFileName(pdfFile.name);
        setFileType('pdf');
        setImageUri(null);
        
        // Unload audio if switching from audio
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('PDF pick error:', error);
      Alert.alert('Error', 'Failed to pick PDF file. Please try again.');
    }
  };

  const loadAudio = async (uri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
    } catch (error) {
      console.error('Audio load error:', error);
      Alert.alert('Audio Error', 'Could not load audio file for preview.');
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
    }
  };

  const playPauseAudio = async () => {
    if (!sound) return;
    
    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Audio play/pause error:', error);
      Alert.alert('Audio Error', 'Could not play/pause audio.');
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!title || !description || (!imageUri && !fileUri) || !category) {
      Alert.alert('Error', 'Please fill all fields and select a file!');
      return;
    }

    if (!price || isNaN(parseFloat(price))) {
      Alert.alert('Error', 'Please enter a valid price!');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      let uploadType = fileType;
      if (!uploadType) {
        uploadType = imageUri ? 'image' : 'unknown';
      }

      const fileToUpload = imageUri || fileUri;
      if (!fileToUpload) {
        throw new Error('No file selected for upload');
      }

      console.log('Starting upload:', { uploadType, fileToUpload, fileName });

      const uploadedUrl = await uploadToCloudinaryWithProgress(
        fileToUpload, 
        uploadType, 
        setProgress
      );
      
      if (!uploadedUrl) {
        throw new Error('Upload failed - no URL returned');
      }

      console.log('Upload successful:', uploadedUrl);

      const itemData = {
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price),
        fileType: uploadType,
        fileName: fileName || `${uploadType}_file`,
        fileURL: uploadedUrl,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        deliveryType,
      };

      console.log('Saving to Firestore:', itemData);

      await addDoc(collection(db, 'items'), itemData);

      Alert.alert('Success! 🎉', 'Your item has been uploaded successfully!');
      await handleReset();
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Upload Failed ❌', err.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  React.useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>✨ Upload Your Creative Work ✨</Text>

      {uploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Uploading... {progress}%</Text>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Enter item title..."
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#999"
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={(itemValue) => setCategory(itemValue)}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Select Category" value="" />
            <Picker.Item label="Study Materials" value="Study Materials" />
            <Picker.Item label="Music & Beats" value="Music & Beats" />
            <Picker.Item label="Paintings" value="Paintings" />
            <Picker.Item label="Digital Art" value="Digital Art" />
            <Picker.Item label="Academic Notes" value="Academic Notes" />
            <Picker.Item label="Lectures" value="Lectures" />
            <Picker.Item label="Novels & Writing" value="Novels & Writing" />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={deliveryType}
            onValueChange={(itemValue) => setDeliveryType(itemValue)}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Instant Download" value="download" />
            <Picker.Item label="Physical Delivery" value="delivery" />
          </Picker>
        </View>

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Describe your item..."
          value={description}
          onChangeText={setDescription}
          multiline
          placeholderTextColor="#999"
          textAlignVertical="top"
        />

        <TextInput
          style={styles.input}
          placeholder="Price (GH₵)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.mediaButtonsContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={handleImagePick}>
          <Text style={styles.buttonText}>📸 Pick Image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaButton} onPress={handleAudioPick}>
          <Text style={styles.buttonText}>🎵 Pick Music</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaButton} onPress={handlePdfPick}>
          <Text style={styles.buttonText}>📄 Pick PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      {imageUri && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>📸 Image Preview</Text>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        </View>
      )}

      {/* Audio Preview */}
      {fileUri && fileType === 'audio' && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>🎵 Audio Preview</Text>
          <View style={styles.audioPreview}>
            <Text style={styles.fileName}>📁 {fileName}</Text>
            
            <View style={styles.audioControls}>
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={playPauseAudio}
                disabled={!sound}
              >
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸️' : '▶️'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.timeInfo}>
                <Text style={styles.timeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>
            </View>
            
            {duration && (
              <View style={styles.progressBarAudio}>
                <View 
                  style={[
                    styles.progressFillAudio, 
                    { width: `${position && duration ? (position / duration) * 100 : 0}%` }
                  ]} 
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* PDF Preview */}
      {fileUri && fileType === 'pdf' && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>📄 PDF Preview</Text>
          <View style={styles.pdfPreview}>
            <View style={styles.pdfIcon}>
              <Text style={styles.pdfIconText}>📄</Text>
            </View>
            <Text style={styles.fileName}>📁 {fileName}</Text>
            <Text style={styles.fileReady}>✅ PDF file ready for upload</Text>
          </View>
        </View>
      )}

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.refreshButton]} 
          onPress={handleReset}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>🔄 Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.submitButton, uploading && styles.disabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? `Uploading... ${progress}%` : '🚀 Upload Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  input: {
    backgroundColor: '#111827',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#111827',
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    color: '#fff',
    height: 50,
    width: '100%',
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  mediaButton: {
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  previewContainer: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  previewLabel: {
    color: '#7ef29d',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  audioPreview: {
    backgroundColor: '#111827',
    padding: 15,
    borderRadius: 8,
  },
  pdfPreview: {
    backgroundColor: '#111827',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  pdfIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pdfIconText: {
    fontSize: 40,
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  fileReady: {
    color: '#7ef29d',
    fontSize: 12,
    textAlign: 'center',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  playButton: {
    backgroundColor: '#f59e0b',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  playButtonText: {
    fontSize: 20,
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
  },
  progressBarAudio: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    marginTop: 10,
  },
  progressFillAudio: {
    height: '100%',
    backgroundColor: '#7ef29d',
    borderRadius: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  refreshButton: {
    backgroundColor: '#374151',
  },
  submitButton: {
    backgroundColor: '#f59e0b',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
  },
});