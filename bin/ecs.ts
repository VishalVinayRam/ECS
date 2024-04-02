import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import cdk = require('aws-cdk-lib');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyWebApp');

// Create a cluster
const vpc = new ec2.Vpc(stack, 'Vpc', { maxAzs: 2, subnetConfiguration: [
  {
    cidrMask: 24,
    name: 'public',
    subnetType: ec2.SubnetType.PUBLIC,
  }
] });

const cluster = new ecs.Cluster(stack, 'NodeCluster7', { vpc });
cluster.addCapacity('AutoScalingGroups', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
  desiredCapacity: 4
});

// Create Task Definition
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDef');
const container = taskDefinition.addContainer('web', {
  image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
  memoryLimitMiB: 256,
});

container.addPortMappings({
  containerPort: 80,
  hostPort: 8080,
  protocol: ecs.Protocol.TCP
});

// Create Service
const service = new ecs.Ec2Service(stack, "Service", {
  cluster,
  taskDefinition,
});

// Create ALB
const lb = new elbv2.ApplicationLoadBalancer(stack, 'LBS', {
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

new cdk.CfnOutput(stack, 'ALBNodeCluster7', { value: lb.loadBalancerDnsName, });

app.synth();