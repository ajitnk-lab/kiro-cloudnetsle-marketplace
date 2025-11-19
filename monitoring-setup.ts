import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import { Construct } from 'constructs'

interface MonitoringStackProps extends cdk.StackProps {
  apiGatewayName: string
  notificationEmail: string
}

export class MarketplaceMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props)

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'MarketplaceAlerts', {
      displayName: 'Marketplace API Alerts',
    })

    alertTopic.addSubscription(
      new subscriptions.EmailSubscription(props.notificationEmail)
    )

    // API Gateway Metrics
    const apiMetrics = {
      requests: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Count',
        dimensionsMap: {
          ApiName: props.apiGatewayName,
          Stage: 'prod',
        },
        statistic: 'Sum',
      }),
      
      latency: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: props.apiGatewayName,
          Stage: 'prod',
        },
        statistic: 'Average',
      }),
      
      errors4xx: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '4XXError',
        dimensionsMap: {
          ApiName: props.apiGatewayName,
          Stage: 'prod',
        },
        statistic: 'Sum',
      }),
      
      errors5xx: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: props.apiGatewayName,
          Stage: 'prod',
        },
        statistic: 'Sum',
      }),
    }

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'MarketplaceDashboard', {
      dashboardName: 'Marketplace-API-Performance',
    })

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Request Volume',
        left: [apiMetrics.requests],
        width: 12,
        height: 6,
      }),
      
      new cloudwatch.GraphWidget({
        title: 'Response Times (ms)',
        left: [apiMetrics.latency],
        width: 12,
        height: 6,
      }),
      
      new cloudwatch.GraphWidget({
        title: 'Error Rates',
        left: [apiMetrics.errors4xx, apiMetrics.errors5xx],
        width: 12,
        height: 6,
      })
    )

    // CloudWatch Alarms
    new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: 'Marketplace-API-High-Error-Rate',
      metric: new cloudwatch.MathExpression({
        expression: '(errors4xx + errors5xx) / requests * 100',
        usingMetrics: {
          requests: apiMetrics.requests,
          errors4xx: apiMetrics.errors4xx,
          errors5xx: apiMetrics.errors5xx,
        },
      }),
      threshold: 5,
      evaluationPeriods: 2,
    }).addAlarmAction(new cloudwatch.SnsAction(alertTopic))

    new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      alarmName: 'Marketplace-API-High-Latency',
      metric: apiMetrics.latency,
      threshold: 5000,
      evaluationPeriods: 3,
    }).addAlarmAction(new cloudwatch.SnsAction(alertTopic))
  }
}
