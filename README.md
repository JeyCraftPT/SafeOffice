# SafeOffice IoT - Sistema Inteligente de Monitorização Ambiental

O **SafeOffice IoT** é uma solução tecnológica baseada em Internet of Things (IoT) desenhada para transformar escritórios comuns em ambientes inteligentes e responsivos. Através de uma rede de sensores centralizada num microcontrolador ESP32, o sistema monitoriza continuamente as condições físicas do espaço para garantir a saúde, o conforto e a segurança patrimonial da empresa.

## Visão Geral e Funcionalidades

O sistema opera de forma contínua, recolhendo dados vitais e alertando para perigos em tempo real:
* **Conforto Térmico:** Monitorização de Temperatura e Humidade (Sensor DHT11 / KY-015).
* **Eficiência Energética:** Deteção de níveis de luz natural/artificial (Sensor LDR / KY-018).
* **Qualidade do Ar e Incêndios:** Deteção de gases voláteis (VOCs) e fumo (Sensor MQ-135).
* **Segurança Patrimonial:** Deteção imediata de fugas de água ou infiltrações (Sensor Raindrop).

### Arquitetura do Sistema
A arquitetura utiliza uma abordagem híbrida (Edge-to-Cloud Serverless):
1. **Edge Node (ESP32):** Lê os sensores e publica os dados em formato JSON via Wi-Fi.
2. **Broker MQTT Local:** Um servidor Mosquitto recebe as mensagens leves do ESP32.
3. **Gateway Python:** Um script no PC que subscreve o Broker e injeta os dados na Nuvem.
4. **Cloud (Firebase):** O Firebase Realtime Database armazena o histórico em segurança.
5. **Frontend Web:** Uma Dashboard moderna que consome os dados em tempo real via WebSockets.

---

## Guia de Instalação e Execução

Para executar o projeto localmente no teu computador, deve seguir os passos abaixo.

### Passo 1: Inicializar o Broker MQTT (Mosquitto)
O microcontrolador ESP32 envia os dados para o teu PC através do protocolo MQTT. Para que o PC consiga ouvir esses dados, precisas de iniciar o Eclipse Mosquitto.
1. Abrir o terminal ou a linha de comandos.
2. Executar o seguinte comando para inicializar o broker:
   ```bash
   mosquitto

> Deixar esta janela do terminal aberta a correr em segundo plano. Se o ESP32 não se conseguir ligar, verificar se a tua firewall está a bloquear a porta 1883 e se o ficheiro mosquitto.conf permite ligações anónimas.

### Passo 2: Configurar a Gateway Python

O script gateway.py atua como ponte entre o teu PC e a nuvem Firebase.

1. Abre um novo terminal e navega até à pasta do projeto.
2. Cria um Ambiente Virtual (venv) para manter as dependências limpas:

```bash
python -m venv venv
```

3. Ativar o Ambiente Virtual
    - No windows: `venv\Scripts\activate`
    - No macOS/Linux: `venv/bin/activate`
4. Instalar as bibliotecas necassárias (Cliente MQTT e Firebase Admin SDK):

```bash
pip install paho-mqtt firebase-admin
```

5. Autenticação: Certificar que o ficheiro `serviceAccountKey.json` está na mesma pasta do script.
6. Iniciar a Gateway:

```bash
python gateway.py 
```

> A gateway está agora à escuta. Assim que ligar o ESP32, verá os dados a serem enviados para o Firebase!

### Passo 3: Ligar a Dashboard Web (Localhost)
Por questões de segurança (CORS), os browsers modernos bloqueiam ficheiros JavaScript (módulos) se abrir o ficheiro `index.html` com duplo clique. Precisas de usar um servidor local.

1. Abrir um terceiro terminal na pasta do seu projeto.
2. Executar o servidor nativo do Python:

```bash
python -m http.server 8000
```

3. Abrir o browser de preferência (Chrome, Firefox, etc.) e acede a:

```bash
http://localhost:8000
```

### Passo 4: O Microcontrolador (ESP32)
1. Abrir o código `projeto_iot.ino` no **Arduino IDE**.
2. Certifica-se de que alterou as variáveis de rede:
    - `WIFI_SSID` e `WIFI_PASSWORD` para a sua rede Wi-Fi.
    - `mqtt_server` para o IP IPv4 do seu PC (onde o Mosquitto está a correr).
3. Compilar e fazer o *upload* para o ESP32.

## Tecnologias Utilizadas
- **C++ (Arduino IDE)** - Controlo de *hardware* e sensores.
- **Python 3** - Lógica de processamento intermédio (Gateway).
- **Mosquitto** - Broker MQTT para a comunicação M2M.
- **Firebase (Realtime Database)** - Armazenamento NoSQL na nuvem.
- **HTML5/CSS3/JavaScript (E26+)** - Frontend da aplicação.