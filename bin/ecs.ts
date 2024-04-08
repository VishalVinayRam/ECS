import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyWebApp');

const vpc = new ec2.Vpc(stack, 'webappVpc', {
  maxAzs: 2,
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'public',
      subnetType: ec2.SubnetType.PUBLIC,
    }
  ]
});

const cluster = new ecs.Cluster(stack, 'webappCluster', { vpc });
cluster.addCapacity('AutoScalingGroups', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
  desiredCapacity: 1
});

const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'webappTaskDef');
const container = taskDefinition.addContainer('webapp', {
  image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
  memoryLimitMiB: 256,
});
container.addPortMappings({
  containerPort: 80,
  hostPort: 0, 
  protocol: ecs.Protocol.TCP
});

const service = new ecs.Ec2Service(stack, "webappService", {
  cluster,
  taskDefinition,
  desiredCount: 4
});

const lb = new elbv2.ApplicationLoadBalancer(stack, 'webappLB', {
  vpc,
  internetFacing: true
});

const listener = lb.addListener('webappListener', {
  port: 80,
  open: true
});

listener.addTargets('webappTarget', {
  port: 80, 
  targets: [service],
  healthCheck: {
    interval: cdk.Duration.seconds(60),
    path: "/health",
    timeout: cdk.Duration.seconds(5),
  }
});

new cdk.CfnOutput(stack, 'webappALBDNS', {
  value: lb.loadBalancerDnsName,
});

app.synth();

// S3 bucket source 


// import * as cdk from 'aws-cdk-lib';
// import * as codebuild from 'aws-cdk-lib/aws-codebuild';
// import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as iam from 'aws-cdk-lib/aws-iam';
// import * as events from 'aws-cdk-lib/aws-events';
// import * as targets from 'aws-cdk-lib/aws-events-targets';

// const app = new cdk.App();
// const stack = new cdk.Stack(app, 'MyCodeBuildWithS3Stack');

// // Reference an existing S3 bucket
// const sourceBucket = s3.Bucket.fromBucketName(stack, 'MySourceBucket', 'vishal-task-a1');

// // Create a CodeBuild project
// const project = new codebuild.Project(stack, 'MyCodeBuildProject', {
//   source: codebuild.Source.s3({
//     bucket: sourceBucket,
//     path: 'buildspec.yaml', // Path within the bucket
//   }),
//   environment: {
//     buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
//   },
// });

// // Add permissions to access the existing S3 bucket
// sourceBucket.grantRead(project);

// // Optionally, you can define additional IAM policies for the CodeBuild project
// project.addToRolePolicy(new iam.PolicyStatement({
//   actions: ['s3:GetObject'],
//   resources: [`${sourceBucket.bucketArn}/*`],
// }));

// // Schedule CodeBuild project execution every 5 minutes
// const rule = new events.Rule(stack, 'CodeBuildScheduleRule', {
//   schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
// });

// rule.addTarget(new targets.CodeBuildProject(project));

// app.synth();



/// code pipeline

// import * as cdk from 'aws-cdk-lib';
// import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as codebuild from 'aws-cdk-lib/aws-codebuild';
// import * as codecommit from 'aws-cdk-lib/aws-codecommit';
// import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
// import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
// import * as iam from 'aws-cdk-lib/aws-iam';

// const app = new cdk.App();

// const stack = new cdk.Stack(app, 'MyStack');

// // Parameters
// const bucketName = new cdk.CfnParameter(stack, 'BucketName', {
//   type: 'String',
//   description: 'Name of the artifact bucket',
// });

// const repoName = new cdk.CfnParameter(stack, 'RepoName', {
//   type: 'String',
//   description: 'Name of the CodeCommit repository',
// });

// const codeBuildServiceRoleName = 'CodeBuildServiceRole';
// const codePipelineServiceRoleName = 'CodePipelineServiceRole';

// // Create CodeBuild Service Role
// const codeBuildServiceRole = new iam.Role(stack, codeBuildServiceRoleName, {
//   assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
//   roleName: codeBuildServiceRoleName,
// });

// // Attach policies to CodeBuild Service Role
// codeBuildServiceRole.addManagedPolicy(
//   iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
// );

// const codeBuildServiceRoleArn = codeBuildServiceRole.roleArn;

// // Create CodePipeline Service Role
// const codePipelineServiceRole = new iam.Role(stack, codePipelineServiceRoleName, {
//   assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
//   roleName: codePipelineServiceRoleName,
// });

// // Attach policies to CodePipeline Service Role
// codePipelineServiceRole.addManagedPolicy(
//   iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
// );

// const codePipelineServiceRoleArn = codePipelineServiceRole.roleArn;

// // Create S3 Artifact Bucket
// const myArtifactStore = new s3.Bucket(stack, 'MyArtifactStore', {
//   bucketName: bucketName.valueAsString,
// });

// // Create CodeCommit Repository
// const myCodeCommitRepository = codecommit.Repository.fromRepositoryName(
//   stack,
//   'MyCodeCommitRepository',
//   repoName.valueAsString,
// );

// // Create CodeBuild Project
// const myCodeBuildProject = new codebuild.PipelineProject(stack, 'MyCodeBuildProject', {
//   projectName: `${stack.stackName}-CodeBuildProject`,
//   role: codeBuildServiceRole,
//   environment: {
//     buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
//   },
// });

// // Create CodePipeline Pipeline
// const myCodePipeline = new codepipeline.Pipeline(stack, 'MyCodePipeline', {
//   pipelineName: `${stack.stackName}-CodePipeline`,
//   role: codePipelineServiceRole,
//   artifactBucket: myArtifactStore,
// });

// // Add Source Stage to CodePipeline
// const sourceStage = myCodePipeline.addStage({
//   stageName: 'Source',
// });

// sourceStage.addAction(new codepipeline_actions.CodeCommitSourceAction({
//   actionName: 'SourceAction',
//   repository: myCodeCommitRepository,
//   branch: 'main',
//   output: new codepipeline.Artifact('SourceOutput'),
// }));

// // Add Build Stage to CodePipeline
// const buildStage = myCodePipeline.addStage({
//   stageName: 'Build',
// });

// buildStage.addAction(new codepipeline_actions.CodeBuildAction({
//   actionName: 'BuildAction',
//   project: myCodeBuildProject,
//   input: new codepipeline.Artifact('SourceOutput'),
//   outputs: [new codepipeline.Artifact('BuildOutput')],
// }));

// // Output Role ARNs
// new cdk.CfnOutput(stack, 'CodeBuildServiceRoleArn', {
//   value: codeBuildServiceRoleArn,
// });

// new cdk.CfnOutput(stack, 'CodePipelineServiceRoleArn', {
//   value: codePipelineServiceRoleArn,
// });

// app.synth();

//   only code build 

// import * as cdk from 'aws-cdk-lib/core';
// import * as codebuild from 'aws-cdk-lib/aws-codebuild';
// import * as events from 'aws-cdk-lib/aws-events';
// import * as targets from 'aws-cdk-lib/aws-events-targets';


// const app = new cdk.App();

// const stack = new cdk.Stack(app, 'CodeBuildCronStack');

// // CodeBuild Project
// const project = new codebuild.Project(stack, 'MyCodeBuildProject', {
//   source: codebuild.Source.gitHub({
//     owner: 'VishalVinayRam',
//     repo: 'Report_generation',
//     webhook: true, // enable webhook to trigger builds on GitHub push events
//   }),
//   buildSpec: codebuild.BuildSpec.fromObject({
//     version: '0.2',
//     phases:{
//       "version": "0.2",
//       "phases": {
//         "install": {
//           "runtime-versions": {
//             "python": "3.8"
//           },
//           "commands": [
//             "apt-get update",
//             "apt-get install -y python3 python3-pip",
//             "apt intall -r requirements.txt",
//             "apt python main.py"

//           ]
//         }
//       }
//     }
    
//   }),
//   environment: {
//     buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
//   },

// });

// // CloudWatch Event Rule
// const rule = new events.Rule(stack, 'RunCodeBuildWeekly', {
//   schedule: events.Schedule.cron({
//     weekDay: 'FRI', // Run every Friday
//     hour: '0',      // at 00:00 UTC
//   }),
// });

// // Add CodeBuild as a target for the CloudWatch Event Rule
// rule.addTarget(new targets.CodeBuildProject(project));
