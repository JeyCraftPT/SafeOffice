import json
import paho.mqtt.client as mqtt
import firebase_admin
from firebase_admin import credentials, db
import time

# -------------------------------------------------------------------------
# 1. CONFIGURATION
# -------------------------------------------------------------------------
# Your exact Firebase host from the ESP32 sketch
FIREBASE_HOST = "iot1-46d86-default-rtdb.europe-west1.firebasedatabase.app"
DATABASE_URL = f"https://{FIREBASE_HOST}/"

# MQTT Broker Details
# If this script runs on the same PC as your broker, "127.0.0.1" works perfectly.
MQTT_BROKER = "127.0.0.1" 
MQTT_PORT = 1883
MQTT_TOPIC = "esp32/telemetry"

# -------------------------------------------------------------------------
# 2. FIREBASE INITIALIZATION
# -------------------------------------------------------------------------
print("Initializing Firebase Admin SDK...")
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': DATABASE_URL
    })
    print("Firebase initialized successfully!")
except Exception as e:
    print(f"Error initializing Firebase. Check your serviceAccountKey.json file. Dev error: {e}")
    exit(1)

# -------------------------------------------------------------------------
# 3. MQTT CALLBACKS
# -------------------------------------------------------------------------
# Handles modern paho-mqtt v2.x and legacy v1.x callback arguments automatically
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"Successfully connected to MQTT Broker ({MQTT_BROKER})!")
        print(f"Subscribing to topic: {MQTT_TOPIC}...")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"Connection failed with code {rc}")

def on_message(client, userdata, msg):
    try:
        # Decode the raw byte payload to a string
        payload_str = msg.payload.decode('utf-8')
        print(f"\n[MQTT] Received payload: {payload_str}")
        
        # Parse into a Python dictionary to validate it's proper JSON
        data = json.loads(payload_str)
        
        # Point to the '/Telemetry' path in your database
        ref = db.reference('/Telemetry')
        data["timestamp"] = int(time.time() * 1000)
        data["zona_id"] = "Sala 01"
        
        # .push() replicates the 'pushJSON' history behavior by creating a unique timestamped ID
        new_node_ref = ref.push(data)
        
        print(f"[CLOUD] Successfully pushed to Firebase! Node ID: {new_node_ref.key}")
        
    except json.JSONDecodeError:
        print("[ERROR] Received payload is not a valid JSON string. Ignoring.")
    except Exception as e:
        print(f"[ERROR] Failed to push data to Firebase: {e}")

# -------------------------------------------------------------------------
# 4. START THE GATEWAY
# -------------------------------------------------------------------------
# Using CallbackAPIVersion to ensure compatibility with latest paho-mqtt versions
try:
    mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
except AttributeError:
    # Fallback for older paho-mqtt versions
    mqtt_client = mqtt.Client()

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

print(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)

# Keeps the script alive, processing incoming network loops
try:
    print("Gateway is live and listening for ESP32 data. Press Ctrl+C to stop.")
    mqtt_client.loop_forever()
except KeyboardInterrupt:
    print("\nGateway shutting down gracefully.")
    mqtt_client.disconnect()