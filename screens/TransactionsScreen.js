import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseconfig";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation(); // Back button support

  const fetchTransactions = async () => {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(transactionsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setTransactions([]);
      } else {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.row}>
        <Ionicons name="receipt-outline" size={18} color="#FFD700" />
        <Text style={styles.text}>
          <Text style={styles.label}>Reference:</Text> {item.reference}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="mail-outline" size={18} color="#FFD700" />
        <Text style={styles.text}>
          <Text style={styles.label}>Buyer Email:</Text> {item.buyerEmail}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="cube-outline" size={18} color="#FFD700" />
        <Text style={styles.text}>
          <Text style={styles.label}>Product:</Text> {item.productTitle}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="cash-outline" size={18} color="#FFD700" />
        <Text style={styles.text}>
          <Text style={styles.label}>Amount:</Text> ${item.amount.toFixed(2)}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="card-outline" size={18} color="#FFD700" />
        <Text style={styles.text}>
          <Text style={styles.label}>Currency:</Text> {item.currency}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="time-outline" size={18} color="#FFD700" />
        <Text style={styles.text}>
          <Text style={styles.label}>Date:</Text>{" "}
          {item.createdAt?.toDate
            ? item.createdAt.toDate().toLocaleString()
            : "N/A"}
        </Text>
      </View>

      {/* Action Buttons */}
      {item.productType === "digital" && item.downloadURL ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Linking.openURL(item.downloadURL)}
        >
          <Ionicons name="download-outline" size={18} color="#000" />
          <Text style={styles.actionText}>Download</Text>
        </TouchableOpacity>
      ) : item.productType === "physical" && item.trackingURL ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Linking.openURL(item.trackingURL)}
        >
          <Ionicons name="locate-outline" size={18} color="#000" />
          <Text style={styles.actionText}>Track Order</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {transactions.length === 0 ? (
        <Text style={styles.noDataText}>No transactions found.</Text>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#FFD700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFD700",
  },
  noDataText: {
    fontSize: 18,
    color: "#777",
    textAlign: "center",
    marginTop: 40,
  },
  transactionCard: {
    backgroundColor: "#121212",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontWeight: "600",
    color: "#FFD700",
  },
  text: {
    fontSize: 15,
    color: "#FFFFFF",
    marginLeft: 6,
  },
  actionBtn: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  actionText: {
    color: "#000",
    fontWeight: "600",
    marginLeft: 6,
  },
});

export default Transactions;
