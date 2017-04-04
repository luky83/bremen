#!/usr/bin/python

import sys
import socket

clientsocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
clientsocket.connect(('localhost', 8081))
clientsocket.send("{\"_id\":\"" + sys.argv[1] + "\",\"status\":" + sys.argv[2] + "}")
