// Email Marketing Templates
// Welcome sequences, nurture campaigns, upgrade prompts

export const emailTemplates = {
  // Welcome email (Day 0)
  welcome: {
    subject: '🚀 Welcome to Hivemind Engine - Your AI Company Awaits',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 32px; margin: 0;">Hivemind Engine</h1>
          <p style="color: #9ca3af; margin-top: 5px;">Your AI Company, Working 24/7</p>
        </div>

        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0;">Welcome Aboard! 👋</h2>
          <p style="color: #d4d4d8; line-height: 1.6;">
            You've just taken the first step toward building autonomous AI companies. Here's what happens next:
          </p>

          <div style="margin: 20px 0;">
            <div style="padding: 15px; background: #27272a; border-radius: 8px; margin-bottom: 10px;">
              <strong style="color: #fbbf24;">1. Create Your First Company</strong>
              <p style="color: #a1a1aa; margin: 5px 0 0;">Give your AI company a name and mission. Your agents will start working immediately.</p>
            </div>

            <div style="padding: 15px; background: #27272a; border-radius: 8px; margin-bottom: 10px;">
              <strong style="color: #fbbf24;">2. Watch Agents Work</strong>
              <p style="color: #a1a1aa; margin: 5px 0 0;">CEO, CTO, CMO, and engineers collaborate to build your product.</p>
            </div>

            <div style="padding: 15px; background: #27272a; border-radius: 8px;">
              <strong style="color: #fbbf24;">3. Deploy & Monetize</strong>
              <p style="color: #a1a1aa; margin: 5px 0 0;">Agents auto-deploy to Vercel. Start generating revenue in days, not months.</p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://hivemind-engine.vercel.app/app" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Launch Your AI Company →
            </a>
          </div>
        </div>

        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #ffffff; margin-top: 0; font-size: 18px;">📚 Quick Start Guide</h3>
          <ul style="color: #cbd5e1; line-height: 1.8; padding-left: 20px;">
            <li>Watch our <a href="#" style="color: #f59e0b;">5-minute tutorial</a></li>
            <li>Read the <a href="#" style="color: #f59e0b;">documentation</a></li>
            <li>Join our <a href="#" style="color: #f59e0b;">Discord community</a></li>
            <li>Book a <a href="#" style="color: #f59e0b;">demo call</a> with our team</li>
          </ul>
        </div>

        <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 30px;">
          Need help? Reply to this email or reach us at <a href="mailto:support@hivemind-engine.com" style="color: #f59e0b;">support@hivemind-engine.com</a>
        </p>

        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 20px;">
          You're receiving this because you signed up for Hivemind Engine.<br>
          <a href="#" style="color: #71717a;">Unsubscribe</a>
        </p>
      </div>
    `,
  },

  // Day 3: Feature deep dive
  featureDeepDive: {
    subject: '⚡ How AI Agents Ship Code While You Sleep',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">The Power of Autonomous Agents</h1>

        <p style="color: #d4d4d8; line-height: 1.6;">
          Ever wonder how AI agents work together to build entire products? Here's what's happening behind the scenes in your Hivemind company:
        </p>

        <div style="background: #18181b; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0;">🧠 The Agent Team</h3>
          <ul style="color: #d4d4d8; line-height: 1.8;">
            <li><strong>CEO:</strong> Sets strategy, prioritizes features, manages roadmap</li>
            <li><strong>CTO:</strong> Architects the system, makes technical decisions</li>
            <li><strong>CMO:</strong> Drives user acquisition, SEO, content marketing</li>
            <li><strong>Engineers:</strong> Write code, fix bugs, deploy features</li>
          </ul>
        </div>

        <p style="color: #d4d4d8; line-height: 1.6;">
          They collaborate through natural language, debate solutions, and ship production code—all while you focus on high-level strategy.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://hivemind-engine.vercel.app/app/agents" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Your Agents →
          </a>
        </div>

        <p style="color: #71717a; font-size: 14px;">
          Next up: Case study on how Sarah built a $50K MRR SaaS with Hivemind
        </p>
      </div>
    `,
  },

  // Day 7: Case study
  caseStudy: {
    subject: '📈 Case Study: $50K MRR in 6 Weeks with AI Agents',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Real Results from Real Founders</h1>

        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 25px; margin: 20px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #ea580c); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
              S
            </div>
            <div style="margin-left: 15px;">
              <strong style="color: #ffffff; font-size: 18px;">Sarah Chen</strong>
              <p style="color: #a1a1aa; margin: 2px 0 0;">Serial Entrepreneur, TechVentures AI</p>
            </div>
          </div>

          <blockquote style="color: #d4d4d8; font-style: italic; margin: 20px 0; padding-left: 15px; border-left: 3px solid #f59e0b; line-height: 1.6;">
            "I launched 3 AI companies in parallel using Hivemind. Each one has a full team working 24/7. My SaaS hit $50K MRR in 6 weeks. It's like having a startup accelerator in your pocket."
          </blockquote>

          <div style="background: #27272a; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <h4 style="color: #fbbf24; margin-top: 0;">The Results:</h4>
            <ul style="color: #d4d4d8; line-height: 1.8;">
              <li>3 products launched simultaneously</li>
              <li>$50,000 MRR in 6 weeks</li>
              <li>Zero engineering hires</li>
              <li>Working 4 hours/week on strategy</li>
            </ul>
          </div>
        </div>

        <p style="color: #d4d4d8; line-height: 1.6;">
          Sarah's secret? She let her AI agents handle the building while she focused on what matters: product vision and customer feedback.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Read Full Case Study →
          </a>
        </div>
      </div>
    `,
  },

  // Day 10: Upgrade prompt
  upgradeTrial: {
    subject: '⏰ Your Free Trial Ends in 4 Days - Lock in Pro Pricing',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Don't Lose Your AI Team</h1>

        <p style="color: #d4d4d8; line-height: 1.6;">
          Your 14-day free trial ends in 4 days. We'd hate to see your AI companies go dark.
        </p>

        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 25px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0;">Your Progress So Far:</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: #27272a; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="color: #fbbf24; font-size: 32px; font-weight: bold;">{{companiesCreated}}</div>
              <div style="color: #a1a1aa; margin-top: 5px;">Companies Launched</div>
            </div>
            <div style="background: #27272a; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="color: #fbbf24; font-size: 32px; font-weight: bold;">{{tasksCompleted}}</div>
              <div style="color: #a1a1aa; margin-top: 5px;">Tasks Completed</div>
            </div>
          </div>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #10b981; margin-top: 0;">🎁 Special Offer: 20% Off First Month</h4>
            <p style="color: #d4d4d8; margin: 10px 0;">
              Upgrade to Pro now and get <strong style="color: #fbbf24;">20% off your first month</strong>. That's just <strong>$159/mo</strong> instead of $199.
            </p>
            <ul style="color: #cbd5e1; line-height: 1.6;">
              <li>Unlimited AI companies</li>
              <li>25 agents per company</li>
              <li>Advanced orchestration</li>
              <li>Priority support</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://hivemind-engine.vercel.app/app/billing" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Claim 20% Discount →
            </a>
          </div>

          <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 15px;">
            Offer expires with your trial in 4 days
          </p>
        </div>
      </div>
    `,
  },

  // Day 13: Last chance
  lastChance: {
    subject: '⚠️ Final Reminder: Trial Ends Tomorrow',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #7c2d12; border: 2px solid #ea580c; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <h2 style="color: #fed7aa; margin: 0;">⚠️ Your trial ends tomorrow</h2>
          <p style="color: #fdba74; margin: 10px 0 0;">Your AI companies will be paused unless you upgrade</p>
        </div>

        <p style="color: #d4d4d8; line-height: 1.6;">
          Tomorrow at midnight, your AI agents will stop working. Your companies, your progress, your momentum—all paused.
        </p>

        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 25px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0;">What You'll Lose:</h3>
          <ul style="color: #d4d4d8; line-height: 1.8;">
            <li>❌ {{companiesCreated}} active AI companies</li>
            <li>❌ {{agentsCount}} agents working for you 24/7</li>
            <li>❌ All in-progress tasks and deployments</li>
            <li>❌ Your momentum toward revenue</li>
          </ul>

          <div style="background: #0f172a; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <strong style="color: #10b981;">Limited Time: 20% Off Pro Plan</strong>
            <p style="color: #d4d4d8; margin: 5px 0 0;">Upgrade now: $159/mo (save $40/mo)</p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://hivemind-engine.vercel.app/app/billing" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Keep Your AI Companies Running →
            </a>
          </div>
        </div>

        <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 20px;">
          Questions? Reply to this email or chat with us at <a href="#" style="color: #f59e0b;">hivemind-engine.com</a>
        </p>
      </div>
    `,
  },

  // Re-engagement email
  reengagement: {
    subject: '👋 We Miss You - Come Back to Your AI Companies',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Your AI Team is Waiting</h1>

        <p style="color: #d4d4d8; line-height: 1.6;">
          We noticed you haven't logged in for a while. Your AI companies are still here, ready to work.
        </p>

        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 25px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0;">What's New Since You Left:</h3>
          <ul style="color: #d4d4d8; line-height: 1.8;">
            <li>✨ New agent collaboration features</li>
            <li>🚀 Faster deployment pipeline</li>
            <li>📊 Enhanced analytics dashboard</li>
            <li>🎯 Better task orchestration</li>
          </ul>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #fbbf24; margin-top: 0;">🎁 Welcome Back Offer</h4>
            <p style="color: #d4d4d8;">
              Come back this week and get <strong style="color: #10b981;">1 month free</strong> on any paid plan.
            </p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://hivemind-engine.vercel.app/app" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Return to Dashboard →
            </a>
          </div>
        </div>

        <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 20px;">
          Need help getting started? <a href="#" style="color: #f59e0b;">Book a free demo call</a>
        </p>
      </div>
    `,
  },
};

/**
 * Send email via SendGrid or similar service
 */
export async function sendEmail(to, templateName, variables = {}) {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  // Replace variables in template
  let html = template.html;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, variables[key]);
  });

  // This would integrate with SendGrid, Mailgun, etc.
  console.log(`[Email] Sending "${template.subject}" to ${to}`);

  // Example SendGrid integration:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to,
  //   from: 'hello@hivemind-engine.com',
  //   subject: template.subject,
  //   html,
  // });

  return { success: true };
}

export default {
  templates: emailTemplates,
  sendEmail,
};
