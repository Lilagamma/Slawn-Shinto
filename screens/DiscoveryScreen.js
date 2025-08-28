import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const categories = [
  'Recommended',
  'Digital Art',
  'Music & Beats',
  'Academic Notes',
  'Paintings',
  'Novels & Writing',
  'Photography',
  'Designs',
];

const contentItems = [
  {
    id: '1',
    title: 'Abstract Digital Art Melissa',
    creator: 'Sarah K.',
    image: require('../assets/item1.png'), // Student digital artwork
    price: 'GH₵25.00',
    category: 'Digital Art',
  },
  
  
  {
    id: '2',
    title: ' 1 0f 1 Socks',
    creator: 'Kwame A.',
    image: require('../assets/item2.png'), // Student artwork
    price: 'GH₵80.00',
    category: 'Paintings',
  },
  
  {
    id: '3',
    title: 'Lafrance Cap',
    creator: 'Emmanuel T.',
    image: require('../assets/item3.png'), // Design portfolio
    price: 'GH₵35.00',
    category: 'Designs',
  },
];

export default function DiscoveryScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find amazing student creations</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#aaa" style={styles.searchIcon} />
        <TextInput
          placeholder="Search art, music, notes, and more..."
          placeholderTextColor="#aaa"
          style={styles.searchInput}
        />
        <TouchableOpacity style={styles.voiceButton}>
          <Icon name="mic" size={18} color="#0f7b0f" />
        </TouchableOpacity>
      </View>

      {/* Category tags */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
        {categories.map((cat, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.tag, 
              index === 0 && styles.activeTag // Highlight "Recommended"
            ]}
          >
            <Text style={[
              styles.tagText,
              index === 0 && styles.activeTagText
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product/content grid */}
      <FlatList
        data={contentItems}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image source={item.image} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardCreator}>by {item.creator}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>{item.price}</Text>
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={12} color="#ffcc00" />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
              </View>
            </View>
            
            {/* Audio indicator for music items */}
            {item.category === 'Music & Beats' && (
              <View style={styles.audioIndicator}>
                <Icon name="musical-notes" size={16} color="#0f7b0f" />
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1421',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8892b0',
    fontWeight: '400',
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e2a3a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a3f5f',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    color: '#ffffff',
    flex: 1,
    fontSize: 16,
  },
  voiceButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#0f7b0f20',
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#1e2a3a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2a3f5f',
  },
  activeTag: {
    backgroundColor: '#0f7b0f',
    borderColor: '#0f7b0f',
  },
  tagText: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTagText: {
    color: '#ffffff',
  },
  grid: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#162032',
    flex: 1,
    margin: 6,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a3f5f',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
    borderRadius: 12,
    backgroundColor: '#1e2a3a',
  },
  cardContent: {
    marginTop: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardCreator: {
    color: '#8892b0',
    fontSize: 12,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    color: '#0f7b0f',
    fontSize: 16,
    fontWeight: '700',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#8892b0',
    fontSize: 12,
    marginLeft: 4,
  },
  audioIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#0f7b0f20',
    padding: 6,
    borderRadius: 12,
  },
});