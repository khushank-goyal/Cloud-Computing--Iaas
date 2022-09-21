import boto3
from configparser import ConfigParser

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

response = ec2.create_security_group(GroupName='Web',Description="Security Group for Web instance")
security_group_id = response.group_id
sg = ec2.SecurityGroup(security_group_id)

data = sg.authorize_ingress(
        IpPermissions=[
            {'IpProtocol': 'tcp',
             'FromPort': 22,
             'ToPort': 22,
             'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
        ])

instance = ec2.create_instances(
        ImageId="ami-0bb1040fdb5a076bc",
        MinCount=1,
        MaxCount=1,
        InstanceType="t2.micro",
        SecurityGroupIds=[ security_group_id ] ,
        KeyName="cc",
        TagSpecifications=[{'ResourceType': 'instance',
                                	'Tags': [
                                    	{
                                        	'Key': 'Name',
                                        	'Value': 'Web Tier Worker'
                                    	}
                                	]}]
                
    )
# # Setup SQS
# sqs = boto3.client('sqs',
#                     region_name='us-east-1',
#                     aws_access_key_id=userinfo['AWS_ACCESS_KEY_ID'],
#                     aws_secret_access_key=userinfo['AWS_SECRET_ACCESS_KEY'])

