import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import cdk = require('aws-cdk-lib');
import { AsgCapacityProvider, Ec2Service } from 'aws-cdk-lib/aws-ecs';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyWebApp1214');

// Create a cluster
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2, subnetConfiguration: [
  {
    cidrMask: 24,
    name: 'public',
    subnetType: ec2.SubnetType.PUBLIC,
  }
] });

// /home/linuxlite/ECS/package.json

const cluster = new ecs.Cluster(stack, 'EcsClusters', { vpc });
cluster.addCapacity('DefaultAutoScalingGroup', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
  desiredCapacity: 1, // Create only 1 EC2 instance
});

const ebsVolume = ec2.BlockDeviceVolume.ebs(30, {
  deleteOnTermination: true, // Change as needed
});

const role = new cdk.aws_iam.Role(stack, 'webApp1212Role', {
  assumedBy: new cdk.aws_iam.ServicePrincipal('ec2.amazonaws.com'),
});
const launchTemplate = new ec2.LaunchTemplate(stack, 'webApp1212LaunchTemplate', {
  blockDevices: [{
    deviceName: '/dev/xvdf', // Change device name as needed
    volume: ebsVolume,
  }],
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
  machineImage: ec2.MachineImage.latestAmazonLinux2(),
  role: role // Specify the IAM role for the launch template

});

// Create Task Definition
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDefs');
const container = taskDefinition.addContainer('web', {
  image: ecs.ContainerImage.fromRegistry("public.ecr.aws/z9z6i7v1/newapp"),
  memoryLimitMiB: 256,
});

const service = new Ec2Service(stack, "webApp1212Service", {
  cluster,
  taskDefinition,
  desiredCount: 4,
  minHealthyPercent: 100, // Adjust as needed
  maxHealthyPercent: 200, // Adjust as needed
  serviceName: 'my-webApp1212-service', // Give a name to your ECS service
});
let autoScalingGroup = new AutoScalingGroup(stack, 'webApp1212ASG', {
  vpc,
  desiredCapacity: 1,
  maxCapacity: 5,
  minCapacity: 1,
  launchTemplate,
});

cluster.addCapacity('auto_scaling',{
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO)
})

const capacity_provider = new AsgCapacityProvider(stack,"AsgCapacityProvider",
    {autoScalingGroup:autoScalingGroup},
)

cluster.addAsgCapacityProvider(capacity_provider)


cluster.autoscalingGroup?.scaleOnCpuUtilization('cpu_utilization',{
  targetUtilizationPercent: 5,
})

container.addPortMappings({
  containerPort: 3000,
  protocol: ecs.Protocol.TCP
});

// Create Service

// Create ALB
const lb = new elbv2.ApplicationLoadBalancer(stack, 'LB', {
  vpc,
  internetFacing: true
});
const listener = lb.addListener('PublicListener', { port: 80, open: true });

// Attach ALB to ECS Service
listener.addTargets('ECS', {
  port: 8080,
  targets: [service.loadBalancerTarget({
    containerName: 'web',
    containerPort: 80
  })],
  // include health check (default is none)
  healthCheck: {
    interval: cdk.Duration.seconds(60),
    path: "/health",
    timeout: cdk.Duration.seconds(5),
  }
});

new cdk.CfnOutput(stack, 'LoadBalancerDNS', { value: lb.loadBalancerDnsName, });

app.synth();