import * as cdk from 'aws-cdk-lib/core';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';


class MyCodebuld extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
  
const app = new cdk.App();

const stack = new cdk.Stack(app, 'CodeBuildCronStack');

// CodeBuild Project
const project = new codebuild.Project(stack, 'MyCodeBuildProject', {
  source: codebuild.Source.gitHub({
    owner: 'VishalVinayRam',
    repo: 'Report_generation',
    webhook: true, // enable webhook to trigger builds on GitHub push events
  }),
  buildSpec: codebuild.BuildSpec.fromObject({
    version: '0.2',
    phases:{
      "version": "0.2",
      "phases": {
        "install": {
          "runtime-versions": {
            "python": "3.8"
          },
          "commands": [
            "apt-get update",
            "apt-get install -y python3 python3-pip",
            "apt intall -r requirements.txt",
            "apt python main.py"

          ]
        }
      }
    }
    
  }),
  environment: {
    buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
  },

});

// CloudWatch Event Rule
const rule = new events.Rule(stack, 'RunCodeBuildWeekly', {
  schedule: events.Schedule.cron({
    weekDay: 'FRI', // Run every Friday
    hour: '0',      // at 00:00 UTC
  }),
});
    }}


const app = new cdk.App();
new MyCodebuld(app, 'MyWebApp');