const express = require('express');
const multer = require('multer');
const server = express();
const PORT = 3000;
var AWS = require('aws-sdk');
var MAX_INSTANCE_COUNT=20

// uploaded images are saved in the folder "/upload_images"
const upload = multer({dest: __dirname + '/upload_images'});
var INPUT_BUCKET="cc-input-bucket-assignment1"
var OUTPUT_BUCKET="cc-output-bucket-assignment1"
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
    QueueName: 'output_queue',
    // Attributes: {
    //   ReceiveMessageWaitTimeSeconds: '20'
    // }
  };
var Input_QUEUE_URL = {}
sqs.createQueue(sqs_input_params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success - Input Queue - ", data.QueueUrl);
      Input_QUEUE_URL["QueueUrl"]=data.QueueUrl;
    }
  });
var OUTPUT_QUEUE_URL = {}
sqs.createQueue(sqs_output_params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success - Output Queue - ", data.QueueUrl);
      OUTPUT_QUEUE_URL["QueueUrl"]=data.QueueUrl;
      OUTPUT_QUEUE_URL["MessageAttributeNames"]=["All"]
    }
  });
var instance_number={}
var instance_userdata={}
var userdt={}
var instance_count=0
// "myfile" is the key of the http payload
server.post('/', upload.single('myfile'),async function(request, respond) {
  // if(request.file) console.log();
  // save the image
  var fs = require('fs');
  fs.rename(__dirname + '/upload_images/' + request.file.filename, __dirname + '/upload_images/' + request.file.originalname,async function(err) {
    if ( err ) console.log('ERROR: ' + err);
    else{
      while(1){
        if(instance_count<20){
      console.log("Processing---------------")
  const imageToBase64 = require('image-to-base64');
  console.log("Working on image : ",request.file.originalname)
  
  var image_name=request.file.originalname
  console.log("Image name is ",image_name)
    q = Input_QUEUE_URL.QueueUrl;
    
  // var msgSent=false
await  imageToBase64( __dirname + '/upload_images/' + request.file.originalname) // Path to the image
    .then(
         async (response) => {
                var msg_params = {
                MessageAttributes: {'encoded_img': {'StringValue':response, 'DataType':'String'},'input_queue_url':{'StringValue':q, 'DataType':'String'},'output_queue_url':{'StringValue':OUTPUT_QUEUE_URL["QueueUrl"], 'DataType':'String'}},
                MessageBody: request.file.originalname,
                QueueUrl: q
                };
                // console.log(response); // "cGF0aC90by9maWxlLmpwZw=="
                await sqs.sendMessage(msg_params,  function(err, data) {
                    if (err) {
                    console.log("Error", err);
                    } else {
                      // msgSent=true
                    console.log("Success", data.MessageId)
                    console.log("SG : ",sg)
                    instance_number[request.file.originalname]=instance_count
                    console.log("Instance : ",instance_count)
                  Create_Instance(sg,respond,request.file.originalname)
                    instance_count++;
                    return 1;
                    }
                });
                
                

                return 1;
            });
        // if(msgSent){
          
            
            break;
          }
          
        }
        
        // }
            
    }
    setTimeout(()=>{},1200000)
  });
  // console.log(sqs)
  // respond.setTimeout(600000, function(){
  //   console.log('Request has timed out.');
  //       respond.send(408);
  //   });
  
            // respond.end(request.file.originalname + ' failed!');
});
  

const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
var  deleteInstance = {}
function Create_Instance(sg,respond,image_name){
  console.log(image_name)
  ud=null
  userdt=`#!/bin/bash
  sudo snap install aws-cli --classic
  export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}
  export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
  echo "export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}" >> /etc/profile.d/startup.sh
  echo "export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}" >> /etc/profile.d/startup.sh
  echo "export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}" >> /etc/profile.d/startup.sh
  sudo apt install jq -y
  echo $AWS_DEFAULT_REGION
  cd /home/ubuntu/classifier
  sleep 10
  len=0
  image_name=${image_name}
  while [ $len -eq 0 ];do $(aws sqs receive-message --queue-url ${Input_QUEUE_URL.QueueUrl} --attribute-names All --message-attribute-names All > sqs.json); cor=$(jq  '.Messages' sqs.json | jq '.[] | select(.Body=="${image_name}")'); len=\`expr length "$cor"\`; if [ $len -gt 0 ]; then  $(jq  '.Messages' sqs.json | jq '.[] | select(.Body=="${image_name}")' > sel.json); break; fi;done
  echo "Message Received"
  echo $image_name
  jq  '.Messages' sqs.json | jq '.[] | select(.Body=="${image_name}")' > sel.json
  base64 -d <<< $(jq -r '.MessageAttributes.encoded_img.StringValue' sel.json) > "$image_name"
  echo "I am " whoami
  output=$(sudo -u ubuntu python3 image_classification.py $image_name)
  echo $output
  IFS=',' read -ra vals <<< "$output"
  url=$(jq -r '.MessageAttributes.output_queue_url.StringValue' sel.json)
  echo $url
  jq --null-input --arg val "$\{vals[1]}" '{"Output":{"StringValue": $val, "DataType": "String"}}' > msg.json
  jq --null-input --arg key $\{vals[0]} --arg val "$\{vals[1]}" '{$key:($key,$val)}' > s3.json
  aws s3api put-object --bucket ${OUTPUT_BUCKET} --key "$\{vals[0]}" --body s3.json
  aws s3api put-object --bucket ${INPUT_BUCKET} --key "$\{vals[0]}" --body ${image_name}
  cat msg.json
  input_queue_url=$(jq -r '.MessageAttributes.input_queue_url.StringValue' sel.json)
  handle=$( jq -r '.ReceiptHandle' sel.json)
  aws sqs delete-message --queue-url $input_queue_url --receipt-handle $handle
  aws sqs send-message --queue-url $url --message-body $\{vals[0]} --message-attributes file://msg.json
  `;
          ud=new Buffer.from(userdt).toString('base64');
          console.log("encode : ",ud)
  console.log(image_name," : ",instance_userdata[image_name])
  deleteInstance = {}
    console.log("sg is ",sg)
        const params = {
            ImageId: 'ami-0bb1040fdb5a076bc',
            InstanceType: 't2.micro',
            KeyName: 'cc',
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds:[ sg ] ,
            UserData:ud,
            TagSpecifications: [
              {
                ResourceType: "instance",
                Tags: [
                  {
                    Key: "Name",
                    Value: "App Instance "+(instance_count+1)
                  }
                ]
              }
            ]
          };
        
        ec2.runInstances(params, function(err, ins) {
            if (err) {
              console.log(err, err.stack); // an error occurred
            } else {
              console.log("Created Instance : ",ins.Instances[0].InstanceId);
                         // successful response
                         console.log("Output url is ",OUTPUT_QUEUE_URL["QueueUrl"])
                var deleteParams= {}
                deleteParams["QueueUrl"]=OUTPUT_QUEUE_URL["QueueUrl"]
                var val;
                var t=setInterval( () => {
                  console.log("Waiting")
                  // while(1){
                    sqs.receiveMessage(OUTPUT_QUEUE_URL, function(err, data) {
                      if (err) {
                        console.log("Receive Error", err);
                      } else if (data.Messages) {
                          data.Messages.forEach(msg => {
                            if(msg.Body==image_name){
                              console.log("Received Message is ",data)
                          var key = msg.Body
                          val = msg.MessageAttributes["Output"]["StringValue"]
                          deleteParams["ReceiptHandle"] = msg.ReceiptHandle
                          respond.status(200).send(String(val))
                          console.log(deleteParams)
                          console.log(val)
                          sqs.deleteMessage(deleteParams, function(err, data) {
                            if (err) {
                              console.log("Delete Error", err);
                            } else {
                              console.log("Message Deleted", data);
                              respond.end();
                              deleteInstance["InstanceIds"]=[
                                ins.Instances[0].InstanceId
                             ]
                             clearInterval(t)
                              deleteInstances(deleteInstance)
                              console.log("Current Instance Count is : ",instance_count)
                              instance_count--;
                              delete instance_number[image_name]
                            }
                          });
                            }
                          });
                          
                      }
                    });
                  // }
                  
          
                }, 3000);
            }  
          });
}
async function deleteInstances(deleteInstance){
  console.log(deleteInstance)
  await ec2.terminateInstances(deleteInstance,function(err,d){
    if(err) console.log(err)
    else{
      console.log("Instance deleted")
    }
  })
}

var sg;
var sg_params = {
    GroupNames: [
        "Web"
    ]
    };
ec2.describeSecurityGroups(sg_params,function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     {console.log(data);
        sg=data["SecurityGroups"][0].GroupId
        console.log("sg is --  ",sg)
    }         // successful response
    
    });

// SecurityGroupID(); 
// You need to configure node.js to listen on 0.0.0.0 so it will be able to accept connections on all the IPs of your machine
const hostname = '0.0.0.0';
server.listen(PORT, hostname, () => {
    console.log(`Server running at http://${hostname}:${PORT}/`);
  });