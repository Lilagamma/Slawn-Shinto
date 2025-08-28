import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth } from '../firebaseconfig';

export default function SettingsScreen({ navigation }) {
  const { isDark, colors, toggleTheme } = useTheme();

  const handleLogout = () => {
    auth.signOut().catch((err) => console.error('Logout error:', err));
    // AppContent's onAuthStateChanged handles redirect
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

      {/* Theme Toggle */}
      <View style={[styles.option, { backgroundColor: colors.card }]}>
        <Icon name="moon-outline" size={22} color={colors.text} style={styles.icon} />
        <Text style={[styles.optionText, { color: colors.text }]}>Dark Mode</Text>
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>

      {/* Navigation Options */}
      <TouchableOpacity
        style={[styles.option, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('PrivacyPolicy')}
      >
        <Icon name="lock-closed-outline" size={22} color={colors.text} style={styles.icon} />
        <Text style={[styles.optionText, { color: colors.text }]}>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('HelpSupport')}
      >
        <Icon name="help-circle-outline" size={22} color={colors.text} style={styles.icon} />
        <Text style={[styles.optionText, { color: colors.text }]}>Help & Support</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('EditProfile')}
      >
        <Icon name="person-outline" size={22} color={colors.text} style={styles.icon} />
        <Text style={[styles.optionText, { color: colors.text }]}>Edit Profile</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.option, { backgroundColor: colors.card }]}
        onPress={handleLogout}
      >
        <Icon name="log-out-outline" size={22} color={colors.text} style={styles.icon} />
        <Text style={[styles.optionText, { color: colors.text }]}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  icon: {
    marginRight: 15,
  },
});
