
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

var MongoClient = require("mongodb").MongoClient;

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var users, rebrays;

MongoClient.connect("mongodb://138.100.9.10:8081/aaa", function(err, db) { if(err) { return console.dir(err); } users = db.collection('users');rebrays = db.collection('rebrays');});


var postRebray = function(req, res){
    
   // Parte Usuario
	 var date = new Date();
	  users.findOne({id_u: req.body.id_u.toString()},{'id_u':1}, function(e,i){
		if (i == null){
		var new_u = {id_u : req.body.id_u, rebrays_c : 1, rebrayed_c : 0, reg_date: date, last_date: date, rebrays:[{id_t: req.body.id_t, date: date}]};
		users.insert(new_u, function(e,j){});
	  }
         else{
		users.update({id_u: req.body.id_u},{$push: {rebrays:{id_t: req.body.id_t, date: date}},$inc: {rebrays_c:1}},function(e,j){});
	  }
         }); 

   // Parte Rebuzno

	  rebrays.findOne({id_t: req.body.id_t.toString()},{'id_t':1}, function(e,i){
		if (i == null){
		var new_r = {id_t: req.body.id_t, id_u: req.body.id_u, id_d: req.body.id_d, rebrayed_c: 1, rebrayers : [req.body.id_u], date: date};
		rebrays.insert(new_r, function(e,j){});
	  }
	  else{
		rebrays.update({id_t: req.body.id_t},{$push: {rebrayers: req.body.id_u},$inc: {rebrayed_c:1}},function(e,j){});
	  }
	  }); 
	  
	  // Parte Rebuznado

	users.findOne({id_u: req.body.id_d}, function(e,i){
	if (i==null) {
		var new_u = {id_u : req.body.id_d, rebrays_c : 0, rebrayed_c : 1, reg_date: date, last_date: null, rebrays:[], rebrayed:[req.body.id_t]};  
		users.insert(new_u, function(e,j){});
		}
	else{
	users.update({id_u: req.body.id_d}, {$inc: {rebrayed_c:1}, $push: {rebrayed:req.body.id_t}}, function(e,j){});
		}
	});
	
    res.send('OK');
};

var date_sort = function (date1, date2) {
if (date1.date > date2.date) return -1;
if (date1.date < date2.date) return 1;
return 0;
};

var getFollows = function(req, res){
	users.find({id_u: {$in : req.body}}, {rebrays: 1, _id:0}, {$orderby : { 'rebrays.date' : 1 }}, function(e,i){

	i.toArray((function(err, items) {
		var toSend = [];
		for(var x = 0; x < items.length; x++){
			for(var y = 0; y < items[x].rebrays.length; y++){
				toSend.push(items[x].rebrays[y]);}
		}
		items = [];
		toSend = toSend.filter(function(elem, pos) {
			if (items.indexOf(elem.id_t) == -1 ){
				items.push(elem.id_t);
				return toSend.indexOf(elem) == pos;
				}
		})
		toSend.sort(date_sort);
		toSend = toSend.slice(0,9);
		toSend = JSON.stringify(toSend); 
		res.send(toSend);
		}));
	});
};

var getTops = function(req, res){
	var usersRes;
	var rebraysRes;
	users.find({$query: {}, $orderby : {'rebrayed_c' : -1 }}, {'_id':0, 'rebrayed_c' :1, 'id_u':1}, {limit : 5},  function(e,i){
		i.toArray((function(err, items) {
		usersRes = items; 

	rebrays.find({$query: {}, $orderby : {'rebrayed_c' : -1 }}, {'_id':0, 'rebrayed_c' :1, 'id_t':1}, {limit : 5},  function(e,ii){
		ii.toArray((function(err, items) {
		rebraysRes = items; 
		
	var finalRes = JSON.stringify({users: usersRes, rebrays: rebraysRes}); 
	res.send(finalRes);	
		}));
		});
	}));
	});
};

app.get('/', routes.index);
app.get('/users', user.list);
app.post('/rebray', postRebray);
app.post('/follows', getFollows);
app.get('/tops', getTops);

server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

