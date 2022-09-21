import boto3

AWS_ACCESS_KEY_ID= 'AKIAVQ4DZR4MUWS4GF2E'
AWS_SECRET_ACCESS_KEY = '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'
ec2 = boto3.resource(
'ec2', 
region_name='us-east-1',     aws_access_key_id= AWS_ACCESS_KEY_ID , aws_secret_access_key= 'AWS_SECRET_ACCESS_KEY')
