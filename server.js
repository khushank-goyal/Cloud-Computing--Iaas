const express = require('express');
const multer = require('multer');
const server = express();
const PORT = 3000;

// uploaded images are saved in the folder "/upload_images"
const upload = multer({dest: __dirname + '/upload_images'});

server.use(express.static('public'));
server.get('/', (req, res) => {
    res.send('<h1>Auto Scaling Demo App</h1> <h4>Message: Success</h4> <p>Version: 1.0.0</p>');
  })
// "myfile" is the key of the http payload
server.post('/', upload.single('myfile'), function(request, respond) {
  if(request.file) console.log(request.file);
  
  // save the image
  var fs = require('fs');
  fs.rename(__dirname + '/upload_images/' + request.file.filename, __dirname + '/upload_images/' + request.file.originalname, function(err) {
    if ( err ) console.log('ERROR: ' + err);
  });


  respond.end(request.file.originalname + ' uploaded!');
});

// You need to configure node.js to listen on 0.0.0.0 so it will be able to accept connections on all the IPs of your machine
const hostname = '0.0.0.0';
server.listen(PORT, hostname, () => {
    console.log(`Server running at http://${hostname}:${PORT}/`);
  });