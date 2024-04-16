import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameters
    const bucketName = new cdk.CfnParameter(this, 'BucketName', {
      type: 'String',
      description: 'Name of the artifact bucket',
    });

    const repoName = new cdk.CfnParameter(this, 'RepoName', {
      type: 'String',
      description: 'Name of the CodeCommit repository',
    });

    const codeBuildServiceRoleName = 'CodeBuildServiceRole';
    const codePipelineServiceRoleName = 'CodePipelineServiceRole';

    // Create CodeBuild Service Role
    const codeBuildServiceRole = new iam.Role(this, codeBuildServiceRoleName, {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      roleName: codeBuildServiceRoleName,
    });

    // Attach policies to CodeBuild Service Role
    codeBuildServiceRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
    );

    const codeBuildServiceRoleArn = codeBuildServiceRole.roleArn;

    // Create CodePipeline Service Role
    const codePipelineServiceRole = new iam.Role(this, codePipelineServiceRoleName, {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      roleName: codePipelineServiceRoleName,
    });

    // Attach policies to CodePipeline Service Role
    codePipelineServiceRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
    );

    const codePipelineServiceRoleArn = codePipelineServiceRole.roleArn;

    // Create S3 Artifact Bucket
    const myArtifactStore = new s3.Bucket(this, 'MyArtifactStore', {
      bucketName: bucketName.valueAsString,
    });

    // Create CodeCommit Repository
    const myCodeCommitRepository = codecommit.Repository.fromRepositoryName(
      this,
      'MyCodeCommitRepository',
      repoName.valueAsString,
    );

    // Create CodeBuild Project
    const myCodeBuildProject = new codebuild.PipelineProject(this, 'MyCodeBuildProject', {
      projectName: `${this.stackName}-CodeBuildProject`,
      role: codeBuildServiceRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
      },
    });

    // Create CodePipeline Pipeline
    const myCodePipeline = new codepipeline.Pipeline(this, 'MyCodePipeline', {
      pipelineName: `${this.stackName}-CodePipeline`,
      role: codePipelineServiceRole,
      artifactBucket: myArtifactStore,
    });

    // Add Source Stage to CodePipeline
    const sourceStage = myCodePipeline.addStage({
      stageName: 'Source',
    });

    sourceStage.addAction(new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'SourceAction',
      repository: myCodeCommitRepository,
      branch: 'main',
      output: new codepipeline.Artifact('SourceOutput'),
    }));

    // Add Build Stage to CodePipeline
    const buildStage = myCodePipeline.addStage({
      stageName: 'Build',
    });

    buildStage.addAction(new codepipeline_actions.CodeBuildAction({
      actionName: 'BuildAction',
      project: myCodeBuildProject,
      input: new codepipeline.Artifact('SourceOutput'),
      outputs: [new codepipeline.Artifact('BuildOutput')],
    }));

    // Output Role ARNs
    new cdk.CfnOutput(this, 'CodeBuildServiceRoleArn', {
      value: codeBuildServiceRoleArn,
    });

    new cdk.CfnOutput(this, 'CodePipelineServiceRoleArn', {
      value: codePipelineServiceRoleArn,
    });
  }
}

const app = new cdk.App();
new MyStack(app, 'MyStack');