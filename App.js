import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, ScrollView } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import * as Location from 'expo-location';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import Toast from 'toastify-react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const App = () => {
  const [wifiDetails, setWifiDetails] = useState({});
  const [signalStrength, setSignalStrength] = useState(null);
  const [location, setLocation] = useState(null);
  const [savedData, setSavedData] = useState([]);
  const [availableNetworks, setAvailableNetworks] = useState([]);

  useEffect(() => {
    requestPermissions();
    fetchSavedData();
    fetchAvailableNetworks();
  }, []);

  // Request permissions for location
  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Toast.show('Location permission is required to collect data.');
      return;
    }
    fetchNetworkInfo();
  };

  // Fetch network info (SSID and signal strength)
  const fetchNetworkInfo = async () => {
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      setWifiDetails(prev => ({ ...prev, ssid }));
      const isConnected = await WifiManager.connectionStatus();
      if (isConnected) {
        const level = await WifiManager.getCurrentSignalStrength();
        setSignalStrength(level);
      }
    } catch (error) {
      console.error("Error fetching network info:", error);
      Toast.show("Error fetching network info");
    }
    fetchLocation();
  };

  // Fetch user location
  const fetchLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (error) {
      console.error("Error fetching location:", error);
      Toast.show("Error fetching location");
    }
  };

  // Save collected data to Firebase
  const saveData = async () => {
    if (!wifiDetails.ssid || !signalStrength || !location) {
      Toast.show("Please ensure all data (Wi-Fi, Signal Strength, Location) is available.");
      return;
    }
    const data = {
      wifiDetails,
      signalStrength,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      },
      timestamp: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "networkDetails"), data);
      Toast.show("Data saved successfully!");
      fetchSavedData(); // Refresh the saved data list
    } catch (error) {
      console.error("Error saving data to Firebase:", error);
      Toast.show("Error saving data to Firebase");

    }
  };

  // Fetch saved data from Firebase
  const fetchSavedData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "networkDetails"));
      const data = querySnapshot.docs.map(doc => doc.data());
      setSavedData(data);
    } catch (error) {
      console.error("Error fetching saved data:", error);
      Toast.show("Error fetching saved data");
    }
  };

  // Fetch available Wi-Fi networks
  const fetchAvailableNetworks = async () => {
    try {
      const networks = await WifiManager.loadWifiList();
      setAvailableNetworks(networks);
    } catch (error) {
      console.error("Error fetching available networks:", error);
      Toast.show("Error fetching available networks");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Wi-Fi Signal Strength and Location</Text>
      <Text style={styles.info}>SSID: {wifiDetails.ssid || "Fetching..."}</Text>
      <Text style={styles.info}>Signal Strength: {signalStrength ? `${signalStrength} dBm` : "Fetching..."}</Text>
      {location && (
        <Text style={styles.info}>
          Location: {location.coords.latitude}, {location.coords.longitude}
        </Text>
      )}
      <Button title="Save Data" onPress={saveData} />
      <Text style={styles.subHeader}>Available Networks:</Text>
      <ScrollView>
        {availableNetworks.map((network, index) => (
          <View key={index} style={styles.item}>
            <Text>SSID: {network.SSID}</Text>
            <Text>Signal Strength: {network.level} dBm</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.subHeader}>Saved Data:</Text>
      <FlatList
        data={savedData}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>SSID: {item.wifiDetails.ssid}</Text>
            <Text>Signal: {item.signalStrength} dBm</Text>
            <Text>Location: {item.location.latitude}, {item.location.longitude}</Text>
            <Text>Timestamp: {item.timestamp}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  info: {
    fontSize: 16,
    marginVertical: 5,
  },
  item: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default App;
