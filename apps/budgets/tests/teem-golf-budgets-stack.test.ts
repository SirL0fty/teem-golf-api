import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'bun:test';
import { createApp } from '../bin/budgets.js';
import { TeemGolfBudgets } from '../src/stacks/teem-golf-budgets-stack.js';

describe('TeemGolfBudgets', () => {
  it('creates a 10 USD monthly cost budget and no email subscriber', () => {
    const template = templateFor();

    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: {
        BudgetName: 'teem-golf-monthly',
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: {
          Amount: 10,
          Unit: 'USD',
        },
      },
    });
    const budgets = Object.values(template.findResources('AWS::Budgets::Budget'));
    const budget = budgets[0];
    if (budget === undefined) {
      throw new Error('Expected one budget.');
    }
    expect(budget.Properties).not.toHaveProperty('NotificationsWithSubscribers');
    expect(JSON.stringify(template.toJSON())).not.toContain('@');
  });

  it('notifies the context email at 80 and 100 percent', () => {
    const template = templateFor({
      budgetEmail: 'budget-alerts@example.com',
      budgetLimitUsd: '25',
    });

    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: {
        BudgetLimit: {
          Amount: 25,
          Unit: 'USD',
        },
      },
      NotificationsWithSubscribers: [
        {
          Notification: {
            ComparisonOperator: 'GREATER_THAN',
            NotificationType: 'ACTUAL',
            Threshold: 80,
            ThresholdType: 'PERCENTAGE',
          },
          Subscribers: [
            {
              Address: 'budget-alerts@example.com',
              SubscriptionType: 'EMAIL',
            },
          ],
        },
        {
          Notification: {
            ComparisonOperator: 'GREATER_THAN',
            NotificationType: 'ACTUAL',
            Threshold: 100,
            ThresholdType: 'PERCENTAGE',
          },
          Subscribers: [
            {
              Address: 'budget-alerts@example.com',
              SubscriptionType: 'EMAIL',
            },
          ],
        },
      ],
    });
  });

  it('rejects an address that is not an email', () => {
    expect(() => createApp({ budgetEmail: 'not-an-email' })).toThrow('budgetEmail must be an email address.');
  });
});

function templateFor(overrides: Readonly<Record<string, unknown>> = {}): Template {
  const app = createApp(overrides);
  const child = app.node.tryFindChild('TeemGolfBudgets');
  if (!(child instanceof TeemGolfBudgets)) {
    throw new Error('Expected the TeemGolfBudgets stack.');
  }
  return Template.fromStack(child);
}
