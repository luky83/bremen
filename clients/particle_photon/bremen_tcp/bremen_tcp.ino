#include "Particle.h"
SYSTEM_MODE(SEMI_AUTOMATIC);
// How often to check for connection
const unsigned long CONN_PERIOD_MS = 10000;
// How often to send samples in milliseconds
const unsigned long SEND_PERIOD_MS = 5000;

const int INPUT_PIN = D0;
const int DRAIN_PIN = D1;
// IP address and port of the server. Note that the node server uses two ports - one for the web browser
// and a raw TCP port for receiving data. This is the port number for the data port, not the web server port!
IPAddress serverAddress(192,168,1,151);
int serverPort = 8081;

// Finite state machine states
enum {CONNECT_STATE, CONNECT_CLOUD, CONNECT_SERVER, SEND_DATA_STATE};

TCPClient client;
unsigned long lastSend = 0;
unsigned long lastConn = 0;
int state = CONNECT_STATE;

void setup() {
	Serial.begin(9600);
	pinMode(INPUT_PIN, INPUT_PULLUP);
	pinMode(DRAIN_PIN, OUTPUT);
	digitalWrite(DRAIN_PIN, LOW);
	Serial.println("setup wifi...");
	WiFi.on();
    while(!WiFi.ready()) WiFi.connect();
    // Print your device IP Address via serial
    Serial.println(WiFi.localIP());
}

void loop() {
    
	switch(state) {
	case CONNECT_STATE:
	    Serial.println("CONNECT_STATE");
	    if (!WiFi.ready()) {
	        while(!WiFi.ready()) {
	        	Serial.println("connecting to wifi...");
	            WiFi.connect();
	            delay(1000);
	        }
	    }
	    state = CONNECT_CLOUD;
	    break;

    case CONNECT_CLOUD:
	    Serial.println("CONNECT_CLOUD");
    	if (Particle.connected() == false){
    	    // if have access to the internet, try to connect to the cloud
    	    if (WiFi.resolve("particle.io")){
    	    	Serial.println("connecting to cloud...");
    	        Particle.connect();
    	    }
    	}
    	state = CONNECT_SERVER;
    	break;

	case CONNECT_SERVER:
		Serial.println("CONNECT_SERVER");
		Serial.println("connecting to tcp server...");
		if (client.connect(serverAddress, serverPort)) {
			state = SEND_DATA_STATE;
		}
		else {
			Serial.println("connection failed");
			delay(15000);
			state = CONNECT_STATE;
		}
		break;

	case SEND_DATA_STATE:
		if (millis() - lastConn >= CONN_PERIOD_MS) {
	        lastConn = millis();
	        Serial.println("Checking for wifi and internet connections");
		    if (Particle.connected() == false){
	    	    // if have access to the internet, try to connect to the cloud
	    	    if (WiFi.resolve("particle.io")){
	    	    	Serial.println("connecting to cloud...");
	    	        Particle.connect();
	    	    }
	    	}
		    if (!WiFi.ready()) {
				// Disconnected
				Serial.println("disconnected...");
				client.stop();
				state = CONNECT_STATE;
				delay(5000);
			}
		}	
		if (client.connected()) {
			// Discard any incoming data; there shouldn't be any
			while(client.available()) {
				client.read();
			}

			// Send data up to the server
			if (millis() - lastSend >= SEND_PERIOD_MS) {
			    Serial.println("sending to server...");
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
