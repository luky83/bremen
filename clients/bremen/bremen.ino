#include "Particle.h"
SYSTEM_MODE(SEMI_AUTOMATIC);
// How often to send samples in milliseconds
const unsigned long SEND_PERIOD_MS = 5000;

const int INPUT_PIN = D0;
const int DRAIN_PIN = D1;
// IP address and port of the server. Note that the node server uses two ports - one for the web browser
// and a raw TCP port for receiving data. This is the port number for the data port, not the web server port!
IPAddress serverAddress(10,28,28,69);
int serverPort = 8081;

// Finite state machine states
enum {CONNECT_STATE, SEND_DATA_STATE};

TCPClient client;
unsigned long lastSend = 0;
int state = CONNECT_STATE;

void setup() {
	Serial.begin(9600);
	pinMode(INPUT_PIN, INPUT_PULLUP);
	pinMode(DRAIN_PIN, OUTPUT);
	digitalWrite(DRAIN_PIN, LOW);
	WiFi.on();
    while(!WiFi.ready()) WiFi.connect();
}

void loop() {
    
    if (Particle.connected() == false){
	    // if have access to the internet, try to connect to the cloud
	    if (WiFi.resolve("particle.io")){
	        Particle.connect();
	    }
	}
	
	switch(state) {
	case CONNECT_STATE:
		Serial.println("connecting...");
		if (client.connect(serverAddress, serverPort)) {
			state = SEND_DATA_STATE;
		}
		else {
			Serial.println("connection failed");
			delay(15000);
			WiFi.connect();
		}
		break;

	case SEND_DATA_STATE:
		if (client.connected()) {
			// Discard any incoming data; there shouldn't be any
			while(client.available()) {
				client.read();
			}

			// Send data up to the server
			if (millis() - lastSend >= SEND_PERIOD_MS) {
				lastSend = millis();

				// analogRead returns 0 - 4095; remove the low bits so we got 0 - 255 instead.
				int val = digitalRead(INPUT_PIN);

				String data = "{\"_id\":\"" + System.deviceID() + "\",\"status\":" + (unsigned char)val + "}";
				client.write(data);
			}
		}
		else {
			// Disconnected
			Serial.println("disconnected...");
			client.stop();
			state = CONNECT_STATE;
			delay(5000);
		}
		break;
	}
}
