#include "Particle.h"
SYSTEM_MODE(SEMI_AUTOMATIC);
// How often to check for connection
const unsigned long CONN_PERIOD_MS = 10000;
// How often to send samples in milliseconds
const unsigned long SEND_PERIOD_MS = 1000;

const int INPUT_PIN = D0;
const int DRAIN_PIN = D1;
// IP address and port of the server. Note that the node server uses two ports - one for the web browser
// and a raw UDP port for receiving data. This is the port number for the data port, not the web server port!
IPAddress serverAddress(192,168,1,151);
int serverPort = 8082;

// UDP Port used for two way communication
unsigned int localPort = 8888;

// An UDP instance to let us send and receive packets over UDP
UDP Udp;

unsigned long lastConn = 0;
unsigned long lastSend = 0;

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
    // start the UDP
    Udp.begin(localPort);
}

void loop() {
    // Check if data has been received
    if (Udp.parsePacket() > 0) {
        // Read first char of data received
        char c = Udp.read();
        // Ignore other chars
        while(Udp.available())
            Udp.read();
    }

    // Send data up to the server
	if (millis() - lastSend >= SEND_PERIOD_MS) {
		lastSend = millis();

		// analogRead returns 0 - 4095; remove the low bits so we got 0 - 255 instead.
		int val = digitalRead(INPUT_PIN);

		String data = "{\"_id\":\"" + System.deviceID() + "\",\"status\":" + (unsigned char)val + "}";
		    // Echo back data to sender
        Serial.println("sending to udp server...");
        Udp.beginPacket(serverAddress, serverPort);
        Udp.write(data);
        Udp.endPacket();
    
	}
	
	if (millis() - lastConn >= CONN_PERIOD_MS) {
        lastConn = millis();
        Serial.println("Checking for wifi and internet connections");
		if (!WiFi.ready()) {
	        while(!WiFi.ready()) {
                Serial.println("connecting to wifi...");
	            WiFi.connect();
	            delay (1000);
	        }
	    }
	    if (Particle.connected() == false){
    	    // if have access to the internet, try to connect to the cloud
    	    if (WiFi.resolve("particle.io")){
                Serial.println("connecting to cloud...");
    	        Particle.connect();
    	    }
    	}
	}	
}
