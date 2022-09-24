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

AWS_DEFAULT_REGION="us-east-1"
AWS.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_ACCESS_KEY,region:AWS_DEFAULT_REGION});
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
var sqs_input_params = {
    QueueName: 'input_queue'
  };
var sqs_output_params = {
    QueueName: 'output_queue'
  };
sqs.createQueue(sqs_input_params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success - Input Queue - ", data.QueueUrl);
    }
  });
var OUTPUT_QUEUE_URL = {}
sqs.createQueue(sqs_output_params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success - Output Queue - ", data.QueueUrl);
      OUTPUT_QUEUE_URL["QueueUrl"]=data.QueueUrl;
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
            sqs.getQueueUrl(sqs_input_params,function(err,q){
                console.log("URL is ",q.QueueUrl)
                USERDATA=`#!/bin/bash
sudo snap install aws-cli --classic
export AWS_ACCESS_KEY_ID=AKIAX2IBDEAOZYPIM4P4
export AWS_SECRET_ACCESS_KEY=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
export AWS_DEFAULT_REGION=us-east-1
echo "export AWS_ACCESS_KEY_ID=AKIAX2IBDEAOZYPIM4P4" >> /etc/profile.d/startup.sh
echo "export AWS_SECRET_ACCESS_KEY=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" >> /etc/profile.d/startup.sh
echo "export AWS_DEFAULT_REGION=us-east-1" >> /etc/profile.d/startup.sh
sudo apt install jq -y
echo $AWS_DEFAULT_REGION
cd /home/ubuntu/classifier
aws sqs receive-message --queue-url ${q.QueueUrl} --attribute-names All --message-attribute-names All > sqs.json
echo "Message Received"
image_name=$(jq -r '.Messages' sqs.json | jq -r '.[]' | jq -r '.Body')
echo $image_name
base64 -d <<< $(jq -r '.Messages' sqs.json | jq -r '.[]' | jq -r '.MessageAttributes.encoded_img.StringValue') > "$image_name"
echo "I am " whoami
output=$(sudo -u ubuntu python3 image_classification.py $image_name)
echo $output
IFS=',' read -ra vals <<< "$output"
input_queue_url=$(jq -r '.Messages' sqs.json | jq -r '.[]' | jq -r '.MessageAttributes.input_queue_url.StringValue')
handle=$(jq -r '.Messages' sqs.json | jq -r '.[]' | jq -r '.ReceiptHandle')
aws sqs delete-message --queue-url $input_queue_url --receipt-handle $handle
aws sqs get-queue-url --queue-name $(jq -r '.Messages' sqs.json | jq -r '.[]' | jq -r '.MessageAttributes.output_queue_name.StringValue') > url.json
url=$(jq -r ".QueueUrl" url.json)
echo $url
jq --null-input --arg key ${vals[0]} --arg val ${vals[1]} '{($key):{"StringValue": $val, "DataType": "String"}}' > msg.json
aws sqs send-message --queue-url $url --message-body ${vals[0]} --message-attributes file://msg.json
`;
USERDATA_ENCODED=new Buffer.from(USERDATA).toString('base64');
                var msg_params = {
                MessageAttributes: {'encoded_img': {'StringValue':response, 'DataType':'String'},'input_queue_url':{'StringValue':q.QueueUrl, 'DataType':'String'},'output_queue_name':{'StringValue':sqs_output_params.QueueName, 'DataType':'String'}},
                MessageBody: request.file.originalname,
                QueueUrl: q.QueueUrl
                };
                // console.log(response); // "cGF0aC90by9maWxlLmpwZw=="
                sqs.sendMessage(msg_params, function(err, data) {
                    if (err) {
                    console.log("Error", err);
                    } else {
                    console.log("Success", data.MessageId)
                    SecurityGroupID(USERDATA_ENCODED)
                    sqs.receiveMessage(OUTPUT_QUEUE_URL, function(err, data) {
                        if (err) {
                          console.log("Receive Error", err);
                        } else if (data.Messages) {
                            console.log(data)
                            var key = data.Messages[0].Body
                            var val = data.Messages[0].MessageAttributes[key]["StringValue"]
                          var deleteParams = {
                            QueueUrl: queueURL,
                            ReceiptHandle: data.Messages[0].ReceiptHandle
                          };
                          sqs.deleteMessage(deleteParams, function(err, data) {
                            if (err) {
                              console.log("Delete Error", err);
                            } else {
                              console.log("Message Deleted", data);
                            }
                          });
                          respond.end(val);
                        }
                      });
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
  respond.end(request.file.originalname + ' failed!');
});

const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
function Create_Instance(sg,USERDATA_ENCODED){
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
function SecurityGroupID(USERDATA_ENCODED){
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
            Create_Instance(sg,USERDATA_ENCODED)
        }         // successful response
       
       });
}

// SecurityGroupID(); 
// You need to configure node.js to listen on 0.0.0.0 so it will be able to accept connections on all the IPs of your machine
const hostname = '0.0.0.0';
server.listen(PORT, hostname, () => {
    console.log(`Server running at http://${hostname}:${PORT}/`);
  });