import { Stack, type StackProps } from 'aws-cdk-lib';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import type { Construct } from 'constructs';

export const DEFAULT_BUDGET_LIMIT_USD = 10;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface TeemGolfBudgetsProps extends StackProps {
  readonly limitUsd: number;
  readonly email?: string;
}

export function budgetLimitUsdFrom(context: Readonly<Record<string, unknown>>): number {
  return positiveInteger(context, 'budgetLimitUsd', DEFAULT_BUDGET_LIMIT_USD);
}

export function budgetEmailFrom(context: Readonly<Record<string, unknown>>): string | undefined {
  if (!Object.hasOwn(context, 'budgetEmail')) {
    return undefined;
  }
  const value = context.budgetEmail;
  if (value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !emailPattern.test(value)) {
    throw new Error('budgetEmail must be an email address.');
  }
  return value;
}

export class TeemGolfBudgets extends Stack {
  constructor(scope: Construct, id: string, props: TeemGolfBudgetsProps) {
    super(scope, id, props);

    const notifications =
      props.email === undefined
        ? []
        : [emailNotification(props.email, 80), emailNotification(props.email, 100)];

    new CfnBudget(this, 'Monthly', {
      budget: {
        budgetName: 'teem-golf-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: props.limitUsd,
          unit: 'USD',
        },
      },
      ...(notifications.length === 0 ? {} : { notificationsWithSubscribers: notifications }),
    });
  }
}

function emailNotification(
  address: string,
  threshold: number,
): CfnBudget.NotificationWithSubscribersProperty {
  return {
    notification: {
      comparisonOperator: 'GREATER_THAN',
      notificationType: 'ACTUAL',
      threshold,
      thresholdType: 'PERCENTAGE',
    },
    subscribers: [
      {
        address,
        subscriptionType: 'EMAIL',
      },
    ],
  };
}

function positiveInteger(
  context: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  if (!Object.hasOwn(context, key)) {
    return fallback;
  }
  const value = context[key];
  if (value === undefined) {
    return fallback;
  }
  let parsed = Number.NaN;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    parsed = Number(value);
  }
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}
