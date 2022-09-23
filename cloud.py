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
security_group_name = "Web"
vpc = "default"
instance_attributes = {
    "Name":"Web Tier Worker",
    "Key_Name":"cc",
    "Image_ID":"ami-0bb1040fdb5a076bc",
    "Inctance_Type":"t2.micro"
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
        }
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
        SecurityGroupIds=[ security_group_id ] ,
        KeyName=instance_attributes["Key_Name"],
        TagSpecifications=[{'ResourceType': 'instance',
                                	'Tags': [
                                    	{
                                        	'Key': 'Name',
                                        	'Value': instance_attributes["Name"]
                                    	}
                                	]}]
                
    )
# # Setup SQS
# sqs = boto3.client('sqs',
#                     region_name='us-east-1',
#                     aws_access_key_id=userinfo['AWS_ACCESS_KEY_ID'],
#                     aws_secret_access_key=userinfo['AWS_SECRET_ACCESS_KEY'])

