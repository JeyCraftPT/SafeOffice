// =========================================================================
//   MASTER ECO-STATION: MQ-135, KY-015 & KY-018 DIAGNOSTIC MONITOR
// =========================================================================

// Configuração dos Pinos
const int KY018_PIN = A0;  // KY-018 Fotorresistor no Analog A0
const int MQ135_PIN = A2;  // MQ-135 Sensor de Gás no Analog A2
const int DHpin = 8;       // KY-015 Data Pin no Digital 8

// CALIBRAÇÃO ADAPTATIVA DO SENSOR DE LUZ (KY-018)
// Com base nos teus testes, o sensor lê valores muito baixos com luz normal.
// Ajustamos os limites reais aqui:
const int SENSOR_LUZ_MAXIMA = 15;   // O valor bruto lido com luz ambiente normal
const int SENSOR_ESCURO_TOTAL = 850; // O valor bruto lido ao tapar com o dedo

// Variáveis Globais de Sensores
int rawGasValue = 0;
float gasPercentage = 0.0;
int rawLightValue = 0;
float lightPercentage = 0.0;

// Variáveis para o Bit-Banging do KY-015
byte dat[5]; 

// Função de leitura de bits de baixa definição para o KY-015
byte read_data() {
  byte result = 0;
  for (byte i = 0; i < 8; i++) {
    while (digitalRead(DHpin) == LOW); 
    delayMicroseconds(35);             
    
    if (digitalRead(DHpin) == HIGH) {
      result |= (1 << (7 - i));        
    }
    while (digitalRead(DHpin) == HIGH); 
  }
  return result;
}

// Inicializa a sequência de transmissão do KY-015
void start_test() {
  for(int i = 0; i < 5; i++) dat[i] = 0;

  pinMode(DHpin, OUTPUT);
  digitalWrite(DHpin, LOW);  
  delay(25);                 
  digitalWrite(DHpin, HIGH);
  delayMicroseconds(30);     
  
  pinMode(DHpin, INPUT);
  
  unsigned int timeout = 0;
  while(digitalRead(DHpin) == HIGH) { if(timeout++ > 10000) return; }
  timeout = 0;
  while(digitalRead(DHpin) == LOW)  { if(timeout++ > 10000) return; }
  timeout = 0;
  while(digitalRead(DHpin) == HIGH) { if(timeout++ > 10000) return; }
  
  for(int i = 0; i < 5; i++) {
    dat[i] = read_data();
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(DHpin, OUTPUT);
  digitalWrite(DHpin, HIGH); 
  pinMode(MQ135_PIN, INPUT);
  pinMode(KY018_PIN, INPUT);
  
  Serial.println("=================================================");
  Serial.println("     MASTER STATION: ALL SENSORS INITIALIZING    ");
  Serial.println("=================================================");
  delay(2000); 
}

void loop() {
  // -----------------------------------------------------------
  // ZONA DE LEITURA CRÍTICA (Foco total no timing)
  // -----------------------------------------------------------
  start_test(); 
  
  // Leituras Analógicas
  rawGasValue = analogRead(MQ135_PIN);
  rawLightValue = analogRead(KY018_PIN);

  // -----------------------------------------------------------
  // PROCESSAMENTO DE DADOS
  // -----------------------------------------------------------
  gasPercentage = (rawGasValue / 1023.0) * 100.0;
  
  // Nova calibração proporcional usando a escala real do teu sensor (Mapeamento)
  // Converte a gama [SENSOR_LUZ_MAXIMA para SENSOR_ESCURO_TOTAL] em [100% para 0%]
  lightPercentage = map(rawLightValue, SENSOR_LUZ_MAXIMA, SENSOR_ESCURO_TOTAL, 100, 0);

  // Proteção para garantir que a percentagem fica estritamente entre 0 e 100%
  if(lightPercentage < 0.0) lightPercentage = 0.0;
  if(lightPercentage > 100.0) lightPercentage = 100.0;

  // Validação do clima (KY-015)
  byte checksum = dat[0] + dat[1] + dat[2] + dat[3];
  bool dataValid = (dat[4] == checksum) && (checksum != 0);

  // -----------------------------------------------------------
  // PAINEL DE IMPRESSÃO (Formatado e Visual)
  // -----------------------------------------------------------
  Serial.println("┌───────────────────────────────────────────────┐");
  Serial.println("│          ENVIRONMENTAL LIVE READINGS          │");
  Serial.println("├───────────────────────────────────────────────┤");

  // 1. CLIMA (KY-015)
  if (!dataValid) {
    Serial.println("│  CLIMATE (KY-015): [!] Checksum Sync Error   │");
  } else {
    Serial.print("│  Humidity   : ");
    Serial.print(dat[0], DEC); Serial.print("."); Serial.print(dat[1], DEC); Serial.println(" %                       │");
    Serial.print("│  Temperature: ");
    Serial.print(dat[2], DEC); Serial.print("."); Serial.print(dat[3], DEC); Serial.println(" °C                      │");
  }

  Serial.println("├───────────────────────────────────────────────┤");

  // 2. LUZ AMBIENTE (KY-018)
  Serial.print("│  Light Level: ");
  Serial.print(lightPercentage, 0);
  Serial.print("% [");
  
  // Desenha uma pequena barra visual de brilho (5 níveis)
  if (lightPercentage < 20)      Serial.print("░░░░");
  else if (lightPercentage < 40) Serial.print("▓░░░");
  else if (lightPercentage < 60) Serial.print("▓▓░░");
  else if (lightPercentage < 80) Serial.print("▓▓▓░");
  else                           Serial.print("▓▓▓▓");
  
  Serial.print("] (Raw: ");
  Serial.print(rawLightValue);
  
  // Ajuste de espaçamento para manter o alinhamento da caixa perfeito
  if(rawLightValue < 10) Serial.println(")             │");
  else if(rawLightValue < 100) Serial.println(")            │");
  else if(rawLightValue < 1000) Serial.println(")           │");
  else Serial.println(")          │");

  Serial.println("├───────────────────────────────────────────────┤");

  // 3. QUALIDADE DO AR (MQ-135)
  Serial.print("│  Air Quality: ");
  Serial.print(rawGasValue);
  Serial.print(" raw (");
  Serial.print(gasPercentage, 1);
  Serial.println("%)                    │");

  Serial.print("│  Air Status : ");
  if (rawGasValue < 150) {
    Serial.println("[Excellent / Clean Air]        │");
  } else if (rawGasValue < 350) {
    Serial.println("[Normal / Moderate Indoor]     │");
  } else if (rawGasValue < 600) {
    Serial.println("[Poor / Air Contaminated]      │");
  } else {
    Serial.println("[WARNING: HIGH DANGER ALERT]   │");
  }

  Serial.println("└───────────────────────────────────────────────┘\n");

  delay(2000); 
}