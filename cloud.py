import boto3
from configparser import ConfigParser
import botocore.exceptions

#Read config.ini file
config = ConfigParser()
config.read("config.ini")
userinfo = config["USERINFO"]

# Create EC2 instance
ec2 = boto3.resource(
                    'ec2', 
                    region_name='us-east-1',
                    aws_access_key_id= userinfo['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key= userinfo['AWS_SECRET_ACCESS_KEY'])
security_group_id = ""
user_data = '''#!/bin/bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt install nodejs -y
sudo apt install npm -y
sudo apt install build-essential -y
sudo npm install -g express -y
sudo npm install -g multer -y
sudo npm install aws-sdk
echo "test" > /tmp/test.txt
sudo npm i -S image-to-base64
sudo reboot'''
security_group_name = "Web"
vpc = "default"
SQS_INPUT_QUEUE_NAME="input_queue"
SQS_OUTPUT_QUEUE_NAME="output_queue"
instance_attributes = {
    "Name":"Web Tier Worker",
    "Key_Name":"cc",
    "Image_ID":"ami-0bb1040fdb5a076bc",
    "Instance_Type":"t2.micro"
}
SECURITY_GROUP = None
try:
    response = ec2.create_security_group(GroupName=security_group_name,Description="Security Group for Web instance")
    security_group_id = response.group_id
    SECURITY_GROUP = ec2.SecurityGroup(security_group_id)
    SECURITY_GROUP.authorize_ingress(
        IpPermissions=[
            {'IpProtocol': '-1',
             'FromPort': -1,
             'ToPort': -1,
             'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
        ])
except botocore.exceptions.ClientError as e:
    response = ec2.security_groups.all()
    for sg in response:
        if sg.group_name == security_group_name:
            SECURITY_GROUP = ec2.SecurityGroup(sg.id)
            break
    print("Security Group Already Exists - {} - {}.\nSecurity Group Imported.".format(security_group_name, SECURITY_GROUP.id))


WEB_INSTANCE = None
instances = ec2.instances.filter(
    Filters=[
        {
            'Name': 'tag:Name',
            'Values': [
                instance_attributes["Name"]
            ]
        },
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]
)
for x in instances:
    WEB_INSTANCE = ec2.Instance(x.id)
    print("Web Instance already exists - {} - {}.\nInstance Imported.".format(WEB_INSTANCE.tags[0]['Value'],WEB_INSTANCE.id))
    break
if WEB_INSTANCE==None:
    WEB_INSTANCE = ec2.create_instances(
        ImageId=instance_attributes["Image_ID"],
        MinCount=1,
        MaxCount=1,
        InstanceType=instance_attributes["Instance_Type"],
        SecurityGroupIds=[ SECURITY_GROUP.id ] ,
        KeyName=instance_attributes["Key_Name"],
        TagSpecifications=[{'ResourceType': 'instance',
                                	'Tags': [
                                    	{
                                        	'Key': 'Name',
                                        	'Value': instance_attributes["Name"]
                                    	}
                                	]}],
        UserData=user_data,
                
    )
    print("Created Instance - {} - {}.".format(instance_attributes["Name"],WEB_INSTANCE[0].id))
# # Setup SQS
# sqs = boto3.client('sqs',region_name='us-east-1',
#                     aws_access_key_id= userinfo['AWS_ACCESS_KEY_ID'],
#                     aws_secret_access_key= userinfo['AWS_SECRET_ACCESS_KEY'])
# input_queue=None
# try:
#     input_queue = sqs.create_queue(QueueName=SQS_INPUT_QUEUE_NAME)
#     print("Created Input Queue")
# except sqs.Client.exceptions.QueueNameExists as e:
#     input_queue = sqs.get_queue_url(
#     QueueName=SQS_INPUT_QUEUE_NAME
# )
#     print("Input Queue Exists")
# print(input_queue)
# output_queue = None
# try:
#     output_queue = sqs.create_queue(QueueName=SQS_OUTPUT_QUEUE_NAME)
#     print("Created Output Queue")
# except sqs.Client.exceptions.QueueNameExists as e:
#     output_queue = sqs.get_queue_url(
#     QueueName=SQS_OUTPUT_QUEUE_NAME
# )
#     print("Output Queue Exists")
# print(output_queue)

# sqs = boto3.client('sqs',
#                     region_name='us-east-1',
#                     aws_access_key_id=userinfo['AWS_ACCESS_KEY_ID'],
#                     aws_secret_access_key=userinfo['AWS_SECRET_ACCESS_KEY'])

