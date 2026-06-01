#include <WiFi.h>
#include <PubSubClient.h>

// Wi-Fi Credentials
#define WIFI_SSID "Palhaco"
#define WIFI_PASSWORD "aaaaaaab"

// Firebase Credentials (FIXED: No https:// and no trailing /)
#define FIREBASE_HOST "iot1-46d86-default-rtdb.europe-west1.firebasedatabase.app"

//Broker stuff
const char* mqtt_server = "10.96.84.63";
const int mqtt_port = 1883;
WiFiClient espClient;
PubSubClient client(espClient);

// Pin Configurations
const int KY018_PIN = 32;
const int RAIN_PIN  = 34;
const int MQ135_PIN = 35;
const int DHpin     = 13;

// Calibration
const int SENSOR_LUZ_MAXIMA = 60;
const int SENSOR_ESCURO_TOTAL = 3400;

int rawGasValue = 0, rawLightValue = 0, rawRainValue = 0;
float gasPercentage = 0.0, lightPercentage = 0.0;
byte dat[5];

byte read_data() {
  byte result = 0;
  for (byte i = 0; i < 8; i++) {
    while (digitalRead(DHpin) == LOW); 
    delayMicroseconds(35);             
    if (digitalRead(DHpin) == HIGH) result |= (1 << (7 - i));        
    while (digitalRead(DHpin) == HIGH); 
  }
  return result;
}

void start_test() {
  for(int i = 0; i < 5; i++) dat[i] = 0;
  pinMode(DHpin, OUTPUT);
  digitalWrite(DHpin, LOW);  
  delay(22);                 
  digitalWrite(DHpin, HIGH);
  delayMicroseconds(30);     
  pinMode(DHpin, INPUT);
  unsigned int timeout = 0;
  while(digitalRead(DHpin) == HIGH) { if(timeout++ > 50000) return; }
  timeout = 0;
  while(digitalRead(DHpin) == LOW)  { if(timeout++ > 50000) return; }
  timeout = 0;
  while(digitalRead(DHpin) == HIGH) { if(timeout++ > 50000) return; }
  for(int i = 0; i < 5; i++) dat[i] = read_data();
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      // Subscribe to topics here
      client.subscribe("esp32/output");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(DHpin, OUTPUT);
  digitalWrite(DHpin, HIGH); 
  pinMode(MQ135_PIN, INPUT);
  pinMode(KY018_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi!");

  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  start_test(); 
  
  // Sensor Readings (Rain is now Digital!)
  rawGasValue   = analogRead(MQ135_PIN);
  rawLightValue = analogRead(KY018_PIN);
  rawRainValue  = digitalRead(RAIN_PIN);

  // Math & Logic
  gasPercentage = (rawGasValue / 4095.0) * 100.0;
  lightPercentage = map(rawLightValue, SENSOR_LUZ_MAXIMA, SENSOR_ESCURO_TOTAL, 100, 0);
  if(lightPercentage < 0.0)   lightPercentage = 0.0;
  if(lightPercentage > 100.0) lightPercentage = 100.0;

  byte checksum = dat[0] + dat[1] + dat[2] + dat[3];
  bool dataValid = (dat[4] == checksum) && (checksum != 0);

  // Construct JSON Payload
// Construct JSON Payload manually using standard Strings
  String jsonString = "{";
  
  if (dataValid) {
    jsonString += "\"temperature\":\"" + String(dat[2]) + "." + String(dat[3]) + "\",";
    jsonString += "\"humidity\":\"" + String(dat[0]) + "." + String(dat[1]) + "\",";
  }
  
  jsonString += "\"light_level\":" + String(lightPercentage) + ",";
  jsonString += "\"light_raw\":" + String(rawLightValue) + ",";
  jsonString += "\"rain_raw\":" + String(rawRainValue) + ",";
  jsonString += "\"rain_status\":\"" + String(rawRainValue == HIGH ? "Raining" : "Dry") + "\",";
  jsonString += "\"air_quality_raw\":" + String(rawGasValue);
  jsonString += "}"; // Close the JSON object

  // Publish to MQTT
  client.publish("esp32/telemetry", jsonString.c_str());
  Serial.println("Success: Telemetry successfully published to MQTT!");

  delay(3000); 
}