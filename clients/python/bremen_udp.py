#!/usr/bin/python

import sys
import socket

clientsocket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
clientsocket.sendto("{\"_id\":\"" + sys.argv[1] + "\",\"status\":" + sys.argv[2] + "}", ('localhost', 8082))
