import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseconfig';
import { ThemeProvider, useTheme } from './ThemeContext';

// Screens
import LoginScreen from './screens/Login';
import SignUpScreen from './screens/Signup';
import HomeScreen from './screens/Home';
import DiscoveryScreen from './screens/DiscoveryScreen';
import UploadScreen from './screens/UploadScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import DetailsScreen from './screens/DetailsScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MyStore from './screens/MyStore';
import StoreEdit from './screens/StoreEdit';
import PublicStore from './screens/PublicStore';
import MessagesHomeScreen from './screens/MessagesHomeScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import PaymentWebView from './screens/PaymentWebView';
import TransactionsScreen from './screens/TransactionsScreen';
import MyItemsBought from './screens/MyItemsBought';
import MyOrders from './screens/MyOrders';
import PlaceOrder from './screens/PlaceOrder';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import HelpSupportScreen from './screens/HelpSupportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="cloud-upload-outline" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={MessagesHomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="chatbubble-ellipses-outline" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="home-outline" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="person-outline" color={color} size={20} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="settings-outline" color={color} size={20} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="DetailsScreen" component={DetailsScreen} />
            <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="MyStore" component={MyStore} />
            <Stack.Screen name="StoreEdit" component={StoreEdit} />
            <Stack.Screen name="PublicStore" component={PublicStore} />
            <Stack.Screen 
              name="ChatScreen" 
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.recipientName || 'Chat',
                headerStyle: { backgroundColor: '#1a2332' },
                headerTintColor: '#facc15',
              })}
            />
            <Stack.Screen name="MessagesHome" component={MessagesHomeScreen} />
            <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
            <Stack.Screen name="PaymentWebView" component={PaymentWebView} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="MyItemsBought" component={MyItemsBought} />
            <Stack.Screen name="MyOrders" component={MyOrders} />
            <Stack.Screen name="PlaceOrder" component={PlaceOrder} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
