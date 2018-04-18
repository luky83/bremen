# dependencies:
* node.js
* mogodb

# installation:
* git clone

# startup:
* cd bremen
* npm install
* node app.js

# install as a service with pm2 on debian
* sudo npm install -g pm2
* pm2 start bremon-server.js
* pm2 startup systemd
* copy, paste and execute command line from the previous command's output
* pm2 save

# start, stop, monitor process status
* pm2 list
* pm2 start bremon-server
* pm2 stop bremon-server
* pm2 restart bremon-server
* pm2 info bremon-server
* pm2 monit
