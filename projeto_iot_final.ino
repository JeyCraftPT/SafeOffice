#include <WiFi.h>
#include <FirebaseESP32.h>

// Wi-Fi Credentials
#define WIFI_SSID "Palhaco"
#define WIFI_PASSWORD "aaaaaaab"

// Firebase Credentials (FIXED: No https:// and no trailing /)
#define FIREBASE_HOST "iot1-46d86-default-rtdb.europe-west1.firebasedatabase.app"

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

// Firebase Data Objects
FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

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

  // -----------------------------------------------------------
  // FIREBASE CONFIGURATION (FIXED)
  // -----------------------------------------------------------
  config.database_url = FIREBASE_HOST; 
  
  // Enable Test Mode for open database rules (bypasses auth requirement)
  config.signer.test_mode = true; 
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  start_test(); 
  
  rawGasValue   = analogRead(MQ135_PIN);
  rawLightValue = analogRead(KY018_PIN);
  rawRainValue  = analogRead(RAIN_PIN);

  gasPercentage = (rawGasValue / 4095.0) * 100.0;
  lightPercentage = map(rawLightValue, SENSOR_LUZ_MAXIMA, SENSOR_ESCURO_TOTAL, 100, 0);
  if(lightPercentage < 0.0)   lightPercentage = 0.0;
  if(lightPercentage > 100.0) lightPercentage = 100.0;

  byte checksum = dat[0] + dat[1] + dat[2] + dat[3];
  bool dataValid = (dat[4] == checksum) && (checksum != 0);

  // Construct JSON Payload
  FirebaseJson json;
  if (dataValid) {
    json.set("temperature", String(dat[2]) + "." + String(dat[3]));
    json.set("humidity", String(dat[0]) + "." + String(dat[1]));
  }
  json.set("light_level", lightPercentage);
  json.set("light_raw", rawLightValue);
  json.set("rain_raw", rawRainValue);
  json.set("rain_status", rawRainValue > 3500 ? "Dry" : (rawRainValue > 1800 ? "Drizzle" : "Heavy Rain"));
  json.set("air_quality_raw", rawGasValue);
  
  // Stream data over the active path link
  if (Firebase.setJSON(firebaseData, "/Telemetry", json)) {
    Serial.println("Success: Telemetry successfully pushed to Firebase Cloud!");
  } else {
    Serial.print("Firebase Send Failed: ");
    Serial.println(firebaseData.errorReason());
  }

  delay(3000); 
}