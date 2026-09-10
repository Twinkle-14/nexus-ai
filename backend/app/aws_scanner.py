import boto3
import os
from dotenv import load_dotenv

load_dotenv()

def scan_ec2_instances():
    """
    Scans all EC2 instances and flags ones that are running continuously
    (a common hidden cost).
    """
    ec2 = boto3.client(
        "ec2",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_DEFAULT_REGION"),
    )

    response = ec2.describe_instances()
    findings = []

    for reservation in response["Reservations"]:
        for instance in reservation["Instances"]:
            state = instance["State"]["Name"]
            instance_id = instance["InstanceId"]
            instance_type = instance["InstanceType"]

            if state == "running":
                findings.append({
                    "resource_name": instance_id,
                    "resource_type": instance_type,
                    "status": state,
                    "recommendation": "Instance is running continuously. Verify it's still needed.",
                })

    return findings


def scan_unused_ebs_volumes():
    """
    Scans EBS volumes and flags ones that aren't attached to anything
    (pure wasted cost).
    """
    ec2 = boto3.client(
        "ec2",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_DEFAULT_REGION"),
    )

    response = ec2.describe_volumes()
    findings = []

    for volume in response["Volumes"]:
        if volume["State"] == "available":
            findings.append({
                "resource_name": volume["VolumeId"],
                "resource_type": f"{volume['Size']}GB EBS Volume",
                "status": "unattached",
                "recommendation": "This volume is not attached to any instance. Consider deleting it.",
            })

    return findings


def run_full_scan():
    return {
        "ec2_findings": scan_ec2_instances(),
        "ebs_findings": scan_unused_ebs_volumes(),
    }
