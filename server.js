const express = require('express');
const multer = require('multer');
const server = express();
const PORT = 3000;
var AWS = require('aws-sdk');


// uploaded images are saved in the folder "/upload_images"
const upload = multer({dest: __dirname + '/upload_images'});

server.use(express.static('public'));
server.get('/', (req, res) => {
    res.send('<h1>Auto Scaling Demo App</h1> <h4>Message: Success</h4> <p>Version: 1.0.0</p>');
  })
AWS_ACCESS_KEY="AKIAUPAUVVJ7LL533TVN"
AWS_SECRET_ACCESS_KEY="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"
AWS_DEFAULT_REGION="us-east-1"
AWS.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_ACCESS_KEY,region:AWS_DEFAULT_REGION});
USERDATA=`#!/bin/bash
snap install aws-cli --classic
echo "export AWS_ACCESS_KEY_ID=AKIAUPAUVVJ7LL533TVN" >> /etc/profile.d/startup.sh
echo "export AWS_SECRET_ACCESS_KEY=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" >> /etc/profile.d/startup.sh
echo "export AWS_DEFAULT_REGION=us-east-1" >> /etc/profile.d/startup.sh
sudo apt-get install jq
echo $AWS_DEFAULT_REGION
sudo reboot
`;
USERDATA_ENCODED=new Buffer.from(USERDATA).toString('base64');
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
var sqs_params = {
    QueueName: 'input_queue'
  };
sqs.createQueue(sqs_params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.QueueUrl);
    }
  });
// "myfile" is the key of the http payload
server.post('/', upload.single('myfile'), function(request, respond) {
  if(request.file) console.log(request.file);
  
  // save the image
  var fs = require('fs');
  fs.rename(__dirname + '/upload_images/' + request.file.filename, __dirname + '/upload_images/' + request.file.originalname, function(err) {
    if ( err ) console.log('ERROR: ' + err);
  });
  console.log(sqs)
  const imageToBase64 = require('image-to-base64');
  imageToBase64( __dirname + '/upload_images/' + request.file.originalname) // Path to the image
    .then(
        (response) => {
            sqs.getQueueUrl(sqs_params,function(err,q){
                console.log("URL is ",q.QueueUrl)
                var msg_params = {
                MessageAttributes: {'encoded_img': {'StringValue':response, 'DataType':'String'}},
                MessageBody: request.file.originalname,
                QueueUrl: q.QueueUrl
                };
                // console.log(response); // "cGF0aC90by9maWxlLmpwZw=="
                sqs.sendMessage(msg_params, function(err, data) {
                    if (err) {
                    console.log("Error", err);
                    } else {
                    console.log("Success", data.MessageId);
                    }
                });
            })
            
        }
    )
    .catch(
        (error) => {
            console.log(error); // Logs an error if there was one
        }
    )
  respond.end(request.file.originalname + ' uploaded!');
});

const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
function Create_Instance(sg){
    console.log("sg is ",sg)
        const params = {
            ImageId: 'ami-0bb1040fdb5a076bc',
            InstanceType: 't2.micro',
            KeyName: 'cc',
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds:[ sg ] ,
            UserData:USERDATA_ENCODED,
            TagSpecifications: [
              {
                ResourceType: "instance",
                Tags: [
                  {
                    Key: "Name",
                    Value: "App Tier 1"
                  }
                ]
              }
            ]
          };
          ec2.runInstances(params, function(err, data) {
            if (err) {
              console.log(err, err.stack); // an error occurred
            } else {
              console.log(data);           // successful response
            }  
          });
        
    
    
}
function SecurityGroupID(){
    var sg;
    var sg_params = {
        GroupNames: [
           "Web"
        ]
       };
     ec2.describeSecurityGroups(sg_params, function(err, data) {
         if (err) console.log(err, err.stack); // an error occurred
         else     {console.log(data);
            sg=data["SecurityGroups"][0].GroupId
            console.log("sg is --  ",sg)
            //Create_Instance(sg)
        }         // successful response
       
       });
}

SecurityGroupID(); 
// You need to configure node.js to listen on 0.0.0.0 so it will be able to accept connections on all the IPs of your machine
const hostname = '0.0.0.0';
server.listen(PORT, hostname, () => {
    console.log(`Server running at http://${hostname}:${PORT}/`);
  });