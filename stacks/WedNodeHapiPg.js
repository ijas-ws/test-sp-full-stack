import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as elasticloadbalancing from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
  Credentials,
} from "aws-cdk-lib/aws-rds";
import { CfnOutput } from "aws-cdk-lib";
import * as elasticcache from "aws-cdk-lib/aws-elasticache";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";

export function WedNodeHapiPg({ stack }) {
  const clientName = "wed";
  const environment = "develop";
  const dbName = `wed_database_${environment}`;
  const dbUsername = "username";

  const vpc = new ec2.Vpc(stack, `${clientName}-vpc-${environment}`, {
    maxAzs: 3,
    natGateways: 1,
    subnetConfiguration: [
      {
        name: "public-subnet",
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
      {
        cidrMask: 24,
        name: "private-subnet",
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    ],
  });

  // Load Balancer Security groups
  const elbSG = new ec2.SecurityGroup(
    stack,
    `${clientName}-elb-security-group-${environment}`,
    {
      vpc,
      allowAllOutbound: true,
    }
  );

  elbSG.addIngressRule(
    ec2.Peer.anyIpv4(),
    ec2.Port.tcp(80),
    "Allow http traffic"
  );

  // ECS Security groups
  const ecsSG = new ec2.SecurityGroup(
    stack,
    `${clientName}-ecs-security-group-${environment}`,
    {
      vpc,
      allowAllOutbound: true,
    }
  );

  ecsSG.connections.allowFrom(
    elbSG,
    ec2.Port.allTcp(),
    "Application load balancer"
  );

  // Database security group
  const databaseSecurityGroup = new ec2.SecurityGroup(
    stack,
    `${clientName}-database-security-group-${environment}`,
    {
      vpc,
      allowAllOutbound: false,
    }
  );

  databaseSecurityGroup.addIngressRule(
    ecsSG,
    ec2.Port.tcp(5432),
    "Permit the database to accept requests from the fargate service"
  );

  const databaseCredentialsSecret = new secretsManager.Secret(
    stack,
    `${clientName}-database-credentials-secret-${environment}`,
    {
      secretName: `${clientName}-database-credentials-${environment}`,
      description: `Database credentials for ${clientName}-${environment}`,
      generateSecretString: {
        excludeCharacters: "'\\;@$\"`!/ ",
        generateStringKey: "password",
        passwordLength: 30,
        secretStringTemplate: JSON.stringify({ username: dbUsername }),
        excludePunctuation: true,
      },
    }
  );

  const databaseCredentials = Credentials.fromSecret(
    databaseCredentialsSecret,
    dbUsername
  );

  const database = new DatabaseInstance(
    stack,
    `${clientName}-database-instance-${environment}`,
    {
      vpc,
      securityGroups: [databaseSecurityGroup],
      credentials: databaseCredentials,
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_14_2,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY, // CHANGE TO .SNAPSHOT FOR PRODUCTION
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      backupRetention: cdk.Duration.days(1),
      allocatedStorage: 10,
      maxAllocatedStorage: 30,
      databaseName: dbName,
    }
  );

  // Elasticache
  const redisSubnetGroup = new elasticcache.CfnSubnetGroup(
    stack,
    `${clientName}-redis-subnet-group-${environment}`,
    {
      description: "Subnet group for the redis cluster",
      subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
      cacheSubnetGroupName: `${clientName}-redis-subnet-group-${environment}`,
    }
  );

  const redisSecurityGroup = new ec2.SecurityGroup(
    stack,
    `${clientName}-redis-security-group-${environment}`,
    {
      vpc,
      allowAllOutbound: true,
      description: "Security group for the redis cluster",
    }
  );

  redisSecurityGroup.addIngressRule(
    ecsSG,
    ec2.Port.tcp(6379),
    "Permit the redis cluster to accept requests from the fargate service"
  );

  const redisCache = new elasticcache.CfnCacheCluster(
    stack,
    `${clientName}-redis-cache-${environment}`,
    {
      engine: "redis",
      cacheNodeType: "cache.t3.micro",
      numCacheNodes: 1,
      clusterName: `${clientName}-redis-cluster-${environment}`,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
      engineVersion: "6.2",
    }
  );

  redisCache.addDependency(redisSubnetGroup);

  // Creating your ECS
  const cluster = new ecs.Cluster(stack, `${clientName}-cluster`, {
    clusterName: `${clientName}-cluster-${environment}`,
    vpc,
  });

  // Creating your Load Balancer
  const elb = new elasticloadbalancing.ApplicationLoadBalancer(
    stack,
    `${clientName}-elb-${environment}`,
    {
      vpc,
      vpcSubnets: { subnets: vpc.publicSubnets },
      internetFacing: true,
      loadBalancerName: `${clientName}-elb-${environment}`,
    }
  );

  elb.addSecurityGroup(elbSG);

  // Creating your target group
  const targetGroupHttp = new elasticloadbalancing.ApplicationTargetGroup(
    stack,
    `${clientName}-target-${environment}`,
    {
      port: 80,
      vpc,
      protocol: elasticloadbalancing.ApplicationProtocol.HTTP,
      targetType: elasticloadbalancing.TargetType.IP,
    }
  );

  targetGroupHttp.configureHealthCheck({
    path: "/",
    protocol: elasticloadbalancing.Protocol.HTTP,
  });

  // Adding your listeners
  const listener = elb.addListener("Listener", {
    open: true,
    port: 80,
  });

  listener.addTargetGroups(`${clientName}-target-group-${environment}`, {
    targetGroups: [targetGroupHttp],
  });

  const taskRole = new iam.Role(
    stack,
    `${clientName}-ecs-task-role-${environment}`,
    {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: `${clientName}-task-role-${environment}`,
    }
  );

  const executionRole = new iam.Role(
    stack,
    `${clientName}-ecs-execution-role-${environment}`,
    {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: `${clientName}-ecs-execution-role-${environment}`,
    }
  );

  databaseCredentialsSecret.grantRead(taskRole);
  databaseCredentialsSecret.grantRead(executionRole);

  const taskDefinition = new ecs.TaskDefinition(
    stack,
    `${clientName}-task-${environment}`,
    {
      family: `${clientName}-task-definition-${environment}`,
      compatibility: ecs.Compatibility.EC2_AND_FARGATE,
      cpu: "512",
      memoryMiB: "1024",
      networkMode: ecs.NetworkMode.AWS_VPC,
      taskRole: taskRole,
      executionRole: executionRole,
    }
  );

  const username = databaseCredentialsSecret
    .secretValueFromJson("username")
    .toString();
  const password = databaseCredentialsSecret
    .secretValueFromJson("password")
    .toString();

  const dbURI = `postgres://${username}:${password}@${database.dbInstanceEndpointAddress}/${dbName}`;

  const image = ecs.ContainerImage.fromAsset("wed-node-hapi-pg/", {
    exclude: ["node_modules", ".git"],
    platform: Platform.LINUX_AMD64,
    buildArgs: {
      ENVIRONMENT_NAME: "development",
    },
  });

  const container = taskDefinition.addContainer(
    `${clientName}-container-${environment}`,
    {
      image,
      memoryLimitMiB: 1024,
      environment: {
        BUILD_NAME: "develop",
        ENVIRONMENT_NAME: "development",
        DB_URI: dbURI,
        DB_HOST: database.dbInstanceEndpointAddress,
        REDIS_HOST: redisCache.attrRedisEndpointAddress,
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: `${clientName}-log-group-${environment}`,
      }),
    }
  );

  container.addPortMappings({ containerPort: 9000 });

  const service = new ecs.FargateService(
    stack,
    `${clientName}-service-${environment}`,
    {
      cluster,
      desiredCount: 1,
      taskDefinition,
      securityGroups: [ecsSG],
      assignPublicIp: true,
      serviceName: `${clientName}-service-${environment}`,
    }
  );

  service.attachToApplicationTargetGroup(targetGroupHttp);

  new CfnOutput(stack, "databaseHost", {
    value: database.dbInstanceEndpointAddress,
  });

  new CfnOutput(stack, "databaseName", {
    value: dbName,
  });

  new CfnOutput(stack, "redisHost", {
    value: redisCache.attrRedisEndpointAddress,
  });

  new CfnOutput(stack, "loadBalancerDns", {
    value: elb.loadBalancerDnsName,
  });

  new CfnOutput(stack, "awsRegion", {
    value: stack.region,
  });

  new CfnOutput(stack, "elasticContainerRegistryRepo", {
    value: stack.synthesizer.repositoryName,
  });

  new CfnOutput(stack, "image", {
    value: container.imageName,
  });

  new CfnOutput(stack, "taskDefinition", {
    value: taskDefinition.taskDefinitionArn,
  });

  new CfnOutput(stack, "taskRole", {
    value: taskRole.roleArn,
  });

  new CfnOutput(stack, "executionRole", {
    value: executionRole.roleArn,
  });

  new CfnOutput(stack, "family", {
    value: taskDefinition.family,
  });

  new CfnOutput(stack, "containerName", {
    value: container.containerName,
  });

  new CfnOutput(stack, "containerPort", {
    value: container.containerPort.toString(),
  });

  new CfnOutput(stack, "logDriver", {
    value: container.logDriverConfig.logDriver,
  });

  new CfnOutput(stack, "logDriverOptions", {
    value: JSON.stringify(container.logDriverConfig.options),
  });

  new CfnOutput(stack, "serviceName", {
    value: service.serviceName,
  });

  new CfnOutput(stack, "clusterName", {
    value: cluster.clusterName,
  });

  new CfnOutput(stack, "secretName", {
    value: databaseCredentialsSecret.secretName,
  });

  new CfnOutput(stack, "secretArn", {
    value: databaseCredentialsSecret.secretArn,
  });
}
