import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

class MyCodeBuildWithS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference an existing S3 bucket
    const sourceBucket = s3.Bucket.fromBucketName(this, 'MySourceBucket', 'vishal-task-a1');

    // Create a CodeBuild project
    const project = new codebuild.Project(this, 'MyCodeBuildProject', {
      source: codebuild.Source.s3({
        bucket: sourceBucket,
        path: 'buildspec.yaml', // Path within the bucket
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
    });

    // Add permissions to access the existing S3 bucket
    sourceBucket.grantRead(project);

    // Optionally, you can define additional IAM policies for the CodeBuild project
    project.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${sourceBucket.bucketArn}/*`],
    }));

    // Schedule CodeBuild project execution every 5 minutes
    const rule = new events.Rule(this, 'CodeBuildScheduleRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });

    rule.addTarget(new targets.CodeBuildProject(project));
  }
}

const app = new cdk.App();
new MyCodeBuildWithS3Stack(app, 'MyCodeBuildWithS3Stack');