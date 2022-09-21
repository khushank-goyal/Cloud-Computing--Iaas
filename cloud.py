import boto3
from configparser import ConfigParser

#Read config.ini file
config = ConfigParser()
config.read("config.ini")
userinfo = config["USERINFO"]

# Create EC2 instance
ec2 = boto3.resource(
                    'ec2', 
                    region_name='REGION',
                    aws_access_key_id= userinfo['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key= userinfo['AWS_SECRET_ACCESS_KEY'])

# Setup SQS
sqs = boto3.client('sqs',
                    region_name='us-east-1',
                    aws_access_key_id=userinfo['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=userinfo['AWS_SECRET_ACCESS_KEY'])

