import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as rds from 'aws-cdk-lib/aws-rds';


const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyWebApp12125');

const vpc = new ec2.Vpc(stack, 'webApp12Vpc', {
  maxAzs: 2,
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'public',
      subnetType: ec2.SubnetType.PUBLIC,
    },
  ]
});

// Create EBS volume
const ebsVolume = ec2.BlockDeviceVolume.ebs(30, {
  deleteOnTermination: true, // Change as needed
});

const cluster = new ecs.Cluster(stack, 'webApp12Cluster', { vpc });

// Create launch template for Auto Scaling Group
const launchTemplate = new ec2.LaunchTemplate(stack, 'webApp12LaunchTemplate', {
  blockDevices: [{
    deviceName: '/dev/xvdf', // Change device name as needed
    volume: ebsVolume,
  }],
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
  machineImage: ec2.MachineImage.latestAmazonLinux()
});

cluster.addCapacity('AutoScalingGroups', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
  desiredCapacity: 1,
});

const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'webApp12TaskDef');
const container = taskDefinition.addContainer('webApp12', {
  image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
  memoryLimitMiB: 256,
  
});
container.addPortMappings({
  containerPort: 80,
  hostPort: 0,
  protocol: ecs.Protocol.TCP
});

const service = new ecs.Ec2Service(stack, "webApp12Service", {
  cluster,
  taskDefinition,
  desiredCount: 4
});

// const rdsInstance = new rds.DatabaseInstance(stack, 'MyRDSInstance', {
//   engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0 }),
//   instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.SMALL),
//   vpc,
//   allocatedStorage: 20,
//   storageType: rds.StorageType.GP2,
//   credentials: rds.Credentials.fromGeneratedSecret('admin'), // Specify username as 'admin'
//   removalPolicy: cdk.RemovalPolicy.DESTROY, // Not recommended for production use
// });


const lb = new elbv2.ApplicationLoadBalancer(stack, 'webApp12LB', {
  vpc,
  internetFacing: true
});

const listener = lb.addListener('webApp12Listener', {
  port: 80,
  open: true
});

listener.addTargets('webApp12Target', {
  port: 80,
  targets: [service],
  healthCheck: {
    interval: cdk.Duration.seconds(60),
    path: "/health",
    timeout: cdk.Duration.seconds(5),
  }
});

const highCpuAlarm = new cloudwatch.Alarm(stack, 'HighCpuAlarm', {
  metric: service.metricCpuUtilization(),
  threshold: 80, // 80% threshold
  evaluationPeriods: 1,
  datapointsToAlarm: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

const lowCpuAlarm = new cloudwatch.Alarm(stack, 'LowCpuAlarm', {
  metric: service.metricCpuUtilization(),
  threshold: 20, // 20% threshold
  evaluationPeriods: 1,
  datapointsToAlarm: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

const scaling = service.autoScaleTaskCount({
  minCapacity: 1,
  maxCapacity: 10,
});

scaling.scaleOnMetric('HighCpuScaling', {
  metric: service.metricCpuUtilization(),
  scalingSteps: [
    { upper: 80, change: +1 },
    { lower: 20, change: -1 } // Scaling in when CPU utilization drops below 20%
  ],
});

new cdk.CfnOutput(stack, 'webApp12ALBDNS', {
  value: lb.loadBalancerDnsName,
});

app.synth();
