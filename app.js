// load the things we need
var express = require('express');
var bodyParser = require('body-parser');
var net = require('net');
var dgram = require('dgram');
var udp = dgram.createSocket('udp4');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient
var assert = require('assert');
var dateFormat = require('dateformat');
var sendmail = require('sendmail')({silent: true});

var app = express();
// mongoDB
var mongoUrl = 'mongodb://localhost:27017/bremen';
// httpPort is the port the web browser is listening on. You might open in your browser:
// http://localhost:8080/
var httpPort = 8080;
// tcpPort is the TCP port we listen on from the Photon. This value is encoded in the Photon code
var tcpPort = 8081;
// udpPort is the TCP port we listen on from the Photon. This value is encoded in the Photon code
var udpPort = 8082;
// This array holds the clients (actually http server response objects) to send data to over SSE
var clients = [];
// Use connect method to connect to the server
var db;
MongoClient.connect(mongoUrl, function(err, database) {
  assert.equal(null, err);
  console.log( dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + " - Connected successfully to mongodb");
  db = database;
  // update clients once every second
  setInterval(function() {
    var rt = db.collection('realtime');
    rt.find({}).toArray(function(err, docs) {
      assert.equal(err, null);
      docs.forEach(function(data, index){
        if (data.status != 2 && new Date() - data.lastModified > 30000){
          console.log( dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + " - Device " + data.alias + " (id:" + data._id + ") not seen in the last 30 seconds. Setting offline.");
          data.status = 2;
          upsert(data, insertHistoric);
          pushNotification(data);
        }
        sendToClients(JSON.stringify(data));
      });
    });
  }, 1000);
});

// serve static content under public folder
app.use(express.static('public'));
// set the view engine to ejs
app.set('view engine', 'ejs');
// parse POST data
// create application/json parser
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// realtime page
app.get('/', function(req, res) {
    getDevices(function(err,devices){
      assert.equal(err, null);
      res.render('pages/index', {
          devices: devices,
      });
    });
});

// hystory page
app.get('/storico', function(req, res) {
  res.render('pages/storico');
});

app.get('/storico.txt', function(req, res) {
  getHistory('txt',function(err,data){
    assert.equal(err, null);
    res.setHeader('Content-disposition', 'attachment; filename=storico.txt');
    res.setHeader('Content-type', 'text/plain');
    res.charset = 'UTF-8';
    res.write(data);
    res.end();
  });
});

app.get('/storico.csv', function(req, res) {
  getHistory('csv',function(err,data){
    assert.equal(err, null);
    res.setHeader('Content-disposition', 'attachment; filename=storico.csv');
    res.setHeader('Content-type', 'text/plain');
    res.charset = 'UTF-8';
    res.write(data);
    res.end();
  });
});

// notifications configuration/edit page
app.get('/notifiche', function(req, res) {
  getDevices(function(err,devices){
    assert.equal(err, null);
    getNotifications(function(err,notifications){
      assert.equal(err, null);
      var editNotif = notifications.filter(function(value){ return value._id == req.query._id;})[0];
      res.render('pages/notifiche', {
          devices: devices,
          notifications: notifications,
          editNotif : editNotif
      });
    });
  });
});

// Return SSE data
// http://www.html5rocks.com/en/tutorials/eventsource/basics/
app.get('/stream', function(req, res) {
  var headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
  };
  res.writeHead(200, headers);
  console.log( dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + " - starting sse");
  clients.push(res);
});

// edit machine-name
app.post('/edit-machine-name', function (req, res) {
  alias(req.body, function(){
    var status = 200;
    res.status(status).send(req.body);
  });
});

// CRUD notification
app.post('/add-notification', function (req, res) {
  addNotifications(req.body, function(){
    res.redirect("/notifiche");
  })
});

app.post('/remove-notification', function (req, res) {
  removeNotifications(req.body, function(result){
    var status = 200;
    res.status(status).send(result);
  })
});

app.listen(httpPort);
console.log( dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + ' - ' + httpPort + ' is the magic port');

// Start a TCP Server. This is what receives data from the Particle Photon
// https://gist.github.com/creationix/707146
net.createServer(function (socket) {

  socket.on('error', function (err) {
    console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + " - Caught tcp server socket error: ")
    console.log(err.stack)
  });

	socket.on('data', function (packet) {
    console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + ' - tcp://' + rinfo.address + ':' + rinfo.port + ' ' + packet.toString());
    dataManage(packet)
	});
}).listen(tcpPort);

udp.on('error', function (err) {
  console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + " - Caught udp server socket error: ")
  console.log(err.stack)
});

udp.on('message', function (packet, rinfo) {
  console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + ' - udp://' + rinfo.address + ':' + rinfo.port + ' ' + packet.toString());
  dataManage(packet);
});

udp.on('listening', function() {
  var address = udp.address();
  console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + ' - udp server listening');
});

udp.bind(udpPort);

function dataManage(packet){
  try {
    dataObj = JSON.parse(packet);
    deviceManage(dataObj);
  } catch (e) {
    console.error(e);
  }
}

// Send data to all SSE web browser clients. data must be a string.
function sendToClients(data) {
	var failures = [];
	clients.forEach(function (client) {
		if (!client.write('data: ' + data + '\n\n')) {
			failures.push(client);
		}
	});
	failures.forEach(function (client) {
		console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + " - ending sse");
		removeClient(client);
		client.end();
	});
}

// Remove client (actually a HttpServer response object) from the list of active clients
function removeClient(client) {
	var index = clients.indexOf(client);
	if (index >= 0) {
		clients.splice(index, 1);
	}
}

// Mongo DAO functions
var update = function(packet) {
  var collection = db.collection('realtime');
  collection.update({ _id : packet._id }
    , { $set: { lastModified: new Date() }}, function(err, result) {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
  });
}

var upsert = function(packet, callback) {
  var rt = db.collection('realtime');
  rt.update({ _id : packet._id }
    , { $set: { status : packet.status, lastModified: new Date() }},  {upsert: true}, function(err, result) {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
  });
	callback(packet);
}

var insertHistoric = function(packet) {
  // Get the documents collection
  var collection = db.collection('history');
  // Insert some documents
  collection.insert({ id : packet._id, status : packet.status, lastModified : new Date() }, function(err, result) {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
    assert.equal(1, result.ops.length);
  });
}

var deviceManage = function(packet) {
	var rt = db.collection('realtime');
	rt.find({ _id : packet._id, status : packet.status }).toArray(function(err, device) {
    assert.equal(err, null);
		if (device.length > 0){
			// status not changed - update time only in realtime table
			update(packet);
		} else {
			// new device or status changed - update or insert device-status and update history
			upsert(packet, insertHistoric);
      pushNotification(packet);
		}
  });
}

var getDevices = function(callback) {
  var rt = db.collection('realtime');
  rt.find({}).toArray(function(err, docs) {
		callback(err,docs);
	});
}

var getHistory = function(type,callback) {
  var rt = db.collection('realtime');
  rt.find({},{alias: 1}).toArray(function(err, machineNames) {
    var lookupTable = new Object();
    machineNames.forEach(function(e){
      lookupTable[e._id] = e.alias;
    });
    var ht = db.collection('history');
    ht.find({}).toArray(function(err, docs) {
      var str="";
      docs.forEach(function(e){
        var name = lookupTable[e.id] ? lookupTable[e.id] : e.id;
        var status = '';
        switch (e.status) {
          case 0:
            status = 'START';
            break;
          case 1:
            status = 'STOP';
            break;
          case 2:
            status = 'OFF';
            break;
          default:
        }
        var time = dateFormat(new Date(e.lastModified), "dd/mm/yyyy HH:MM:ss");
        if (type === 'txt') str += name +'\t'+ e.status +'\t'+ time +'\n';
        if (type === 'csv') str += name +','+ status +','+ time +'\n';
      });
      callback(err,str);
    });
	});
}

var getNotifications = function(callback){
  var rt = db.collection('notifications');
  rt.find({}).toArray(function(err, docs) {
    callback(err,docs);
  });
}

var addNotifications = function(data,callback){
  db.collection('notifications').save(data, function(err, result){
    if (err) return console.log(err);
    console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + ' - saved to database');
    callback();
  })
}

var removeNotifications = function (data,callback){
  console.log(data);
  db.collection('notifications').deleteOne({ _id: new mongodb.ObjectID(data._id) }, function(err, result){
    if (err) return console.log(err);
    console.log(dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss") + ' - removed from database');
    callback(result);
  })
}

var alias = function(data, callback){
  var rt = db.collection('realtime');
  rt.update({ _id : data.pk }
    , { $set: { alias: data.value }}, function(err, result) {
    assert.equal(err, null);
    assert.equal(1, result.result.n);
    callback();
  });
}

var pushNotification = function(packet, callback){
  var status = '';
  switch (packet.status) {
    case 0:
      status = 'START';
      break;
    case 1:
      status = 'STOP';
      break;
    case 2:
      status = 'OFF';
      break;
    default:
  }
  var query = {};
  query[packet._id] = status;
  var nt = db.collection('notifications');
  nt.find(query).toArray(function(err, notifications) {
    var rt = db.collection('realtime');
    rt.find({_id : packet._id}).toArray(function(err, device) {
      packet.alias = device[0].alias;
      notifications.forEach(function(notification){
        pushMail(notification, packet);
        sendSMS(notification, packet);
      });
    });
  });
}

var pushMail = function(notification, packet){
  var status = '';
  switch (packet.status) {
    case 0:
      status = 'START';
      break;
    case 1:
      status = 'STOP';
      break;
    case 2:
      status = 'OFF';
      break;
    default:
  }
  var time = dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss");
  var mailParm = {
      from: 'monitor@bre-men.it',
      subject: status + ' : ' + (packet.alias?packet.alias:packet._id) + ' - ' + time,
      html: 'La macchina ' + (packet.alias?packet.alias:packet._id) + ' è passata allo stato ' + status + '\r\n' + 'al tempo ' + time
  }
  mailParm.to = notification.email;

  sendmail(mailParm, function(err, reply) {
      //console.log(err && err.stack);
      //console.dir(reply);
    });
}

var sendSMS = function(notification, packet){
  // to be implemented
}
