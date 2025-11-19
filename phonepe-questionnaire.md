# PhonePe Payment Gateway Integration - Merchant Questionnaire

**Date**: November 13, 2025  
**Business**: CloudNetsle Marketplace  
**Integration**: AWS Solution Finder Pro Upgrade Payments

---

## 1. Business & Financial Terms

### Transaction Fees & Costs
- [ ] What are the transaction fees (percentage + fixed charges)?
- [ ] **CRITICAL**: Is there a fixed monthly/annual charge regardless of transaction volume?
- [ ] **CRITICAL**: What is the variable/per-transaction charge structure?
- [ ] Settlement cycle - T+1, T+2, or longer?
- [ ] Minimum settlement amount thresholds?
- [ ] Currency conversion charges for international transactions?
- [ ] Refund processing fees and timelines?
- [ ] Chargeback fees and dispute resolution costs?
- [ ] Setup fees, annual maintenance charges?
- [ ] Volume-based pricing tiers and discounts?
- [ ] Penalty charges for low transaction volumes?

### GST & Tax Implications
- [ ] **CRITICAL**: Will I be charged GST during trial period? If yes, what rate (18%)?
- [ ] **CRITICAL**: Will I be charged GST after trial period? What rate?
- [ ] **CRITICAL**: Is GST charged on fixed charges, variable charges, or both?
- [ ] **CRITICAL**: Since I registered as GST-exempt, will PhonePe still charge GST on service fees?
- [ ] What documentation do you need for my GST-exempt status?
- [ ] What happens to GST charges when I cross GST registration threshold (₹20 lakh turnover)?
- [ ] GST invoice generation and delivery process?
- [ ] GST registration requirements for merchant?
- [ ] TDS (Tax Deducted at Source) implications on settlements?
- [ ] Tax compliance documentation required from merchant?
- [ ] GST input credit eligibility for merchant business?

### Revenue & Settlement
- [ ] Any revenue sharing requirements with PhonePe?
- [ ] Who bears the cost of failed transactions?
- [ ] What happens to pending settlements if contract terminates?
- [ ] Prorated billing if going live mid-month?

---

## 2. Trial Period & Production Keys

### Trial Terms
- [ ] Do you offer a free trial period for new merchants?
- [ ] **CRITICAL**: What is my exact trial start date?
- [ ] **CRITICAL**: What is my exact trial end date and cutoff time (IST)?
- [ ] Trial duration (30/60/90 days) - calendar or business days?
- [ ] Free transaction volume allowance during trial?
- [ ] **CRITICAL**: Are trial transactions completely free (no charges + no GST)?
- [ ] **CRITICAL**: If trial has charges, what are fixed vs variable costs during trial?
- [ ] **CRITICAL**: GST applicability during trial period - exempt or charged?
- [ ] Can trial period be extended? Process and fees?
- [ ] Grace period after trial expiry before service suspension?

### Trial Constraints
- [ ] Transaction amount limits during trial (max per transaction)?
- [ ] Daily/monthly transaction count restrictions?
- [ ] Restricted payment methods during trial (UPI only, no cards)?
- [ ] Geographic restrictions (India-only during trial)?
- [ ] Can you test real money transactions or only dummy transactions?

### Production Keys
- [ ] Production key activation timeline after merchant approval?
- [ ] Production key expiry dates and renewal process?
- [ ] Key rotation policies and advance notification?
- [ ] Technical integration checklist before production keys?
- [ ] Business verification documents needed for production?

---

## 3. Technical & Operational Requirements

### API Reliability & SLA
- [ ] What's your uptime SLA (99.9%, 99.99%)?
- [ ] **CRITICAL**: Compensation policy for downtime beyond SLA?
- [ ] Maintenance windows and advance notification policy?
- [ ] Rate limiting policies and fair usage limits?
- [ ] API versioning and deprecation policies?
- [ ] Webhook reliability guarantees and retry policies?

### Transaction Handling
- [ ] Retry mechanisms for failed transactions?
- [ ] Timeout handling - what happens to stuck payments?
- [ ] Double deduction scenarios and resolution process?
- [ ] Real-time status APIs for payment verification?
- [ ] Webhook failure handling and manual reconciliation?

### Integration Requirements
- [ ] IP whitelisting requirements?
- [ ] SSL/TLS version requirements?
- [ ] Sandbox environment limitations vs production?
- [ ] Performance testing allowances (load/stress testing)?

---

## 4. Transaction Limits & Customer Experience

### Limits & Restrictions
- [ ] Per transaction limits (min/max amounts)?
- [ ] Daily/monthly transaction limits per customer?
- [ ] Supported payment methods (UPI, cards, wallets)?
- [ ] International customer support and card acceptance?
- [ ] Customer verification requirements?

### Subscription & Recurring Payments
- [ ] **CRITICAL**: Recurring payment support for Pro subscriptions?
- [ ] Failed recurring payment retry logic?
- [ ] Subscription cancellation and prorated refund handling?
- [ ] Auto-renewal capabilities?

### Refunds & Disputes
- [ ] Refund processing SLA and merchant obligations?
- [ ] Partial refund capabilities?
- [ ] Customer dispute escalation process?
- [ ] Merchant role in chargeback defense?

---

## 5. Legal & Compliance Obligations

### Regulatory Compliance
- [ ] PCI DSS compliance requirements on merchant end?
- [ ] RBI guidelines merchant must follow?
- [ ] Data localization requirements for transaction data?
- [ ] KYC/AML obligations for merchant business?
- [ ] GST implications on payment processing?

### Liability & Security
- [ ] Who's liable for fraudulent transactions?
- [ ] Data breach liability and insurance coverage?
- [ ] Customer dispute resolution responsibilities?
- [ ] Regulatory penalty sharing in case of violations?
- [ ] Security audit requirements for merchant?
- [ ] Incident reporting obligations to PhonePe?

### Data Handling
- [ ] Customer data handling and retention policies?
- [ ] Breach notification timelines and procedures?
- [ ] Data deletion obligations post-contract termination?

---

## 6. Contract & Risk Management

### Contract Terms
- [ ] Contract duration and renewal terms?
- [ ] Termination notice period and exit procedures?
- [ ] Non-compete or exclusivity clauses?
- [ ] Minimum transaction volume commitments?
- [ ] Pricing change policies based on volume growth?

### Risk Mitigation
- [ ] **CRITICAL**: Backup payment options during PhonePe downtime?
- [ ] Transaction monitoring and fraud detection capabilities?
- [ ] Customer communication protocols during payment issues?
- [ ] Alternative payment gateway integration support during exit?
- [ ] Customer data migration support during contract termination?

---

## 7. Notification & Support

### Communication
- [ ] How many days advance notice before trial expiry?
- [ ] Reminder notifications timeline (7 days, 3 days, 1 day)?
- [ ] Maintenance and downtime notification process?
- [ ] Emergency contact procedures for critical issues?

### Support
- [ ] Technical support availability (24/7, business hours)?
- [ ] Escalation matrix for payment failures?
- [ ] Account manager assignment for merchant support?
- [ ] Integration assistance and developer support?

---

## 9. Common Integration & Technical Issues

### Webhook & API Reliability
- [ ] **CRITICAL**: What happens if webhooks fail to deliver payment confirmations?
- [ ] Webhook retry mechanism - how many attempts and what intervals?
- [ ] Webhook timeout settings and failure handling?
- [ ] Alternative methods to verify payment status if webhooks fail?
- [ ] API rate limiting - requests per minute/hour allowed?
- [ ] API downtime notification system and advance warnings?
- [ ] Fallback mechanisms during API maintenance windows?

### Transaction Reconciliation
- [ ] **CRITICAL**: How to handle "payment successful but webhook not received" scenarios?
- [ ] Manual reconciliation process for failed webhook deliveries?
- [ ] Transaction status polling API availability and limits?
- [ ] Duplicate transaction prevention mechanisms?
- [ ] How to handle partial payments or payment failures?
- [ ] Settlement file format and automated reconciliation support?

### Technical Integration Challenges
- [ ] SSL certificate requirements and supported versions?
- [ ] IP whitelisting requirements for production environment?
- [ ] Sandbox vs production environment differences?
- [ ] Testing transaction limits and dummy payment methods?
- [ ] Integration testing support and developer assistance?
- [ ] Code samples and SDK availability for different platforms?

---

## 10. Business Continuity & Risk Management

### Service Reliability
- [ ] **CRITICAL**: Historical uptime statistics for last 12 months?
- [ ] Planned maintenance frequency and advance notice period?
- [ ] Emergency contact procedures for critical payment failures?
- [ ] Backup payment routing during PhonePe system failures?
- [ ] Service level agreement penalties and compensation structure?

### Fraud & Risk Management
- [ ] **CRITICAL**: Who bears liability for fraudulent transactions?
- [ ] Fraud detection algorithms and false positive rates?
- [ ] Chargeback protection and dispute resolution support?
- [ ] Risk scoring criteria that might affect your account?
- [ ] Account suspension triggers and resolution process?
- [ ] Transaction monitoring and suspicious activity alerts?

### Data Security & Compliance
- [ ] Data breach notification timeline and procedures?
- [ ] Customer data retention policies and deletion rights?
- [ ] GDPR compliance for international customers?
- [ ] PCI DSS audit requirements for merchants?
- [ ] Data localization requirements within India?
- [ ] Third-party data sharing policies and opt-out options?

---

## 11. Vendor Lock-in & Exit Strategy

### Contract Flexibility
- [ ] **CRITICAL**: Contract termination notice period and penalties?
- [ ] Data export capabilities during contract termination?
- [ ] Customer payment data migration support to new gateway?
- [ ] Pending settlement handling during account closure?
- [ ] Non-compete clauses or exclusivity requirements?
- [ ] Contract renewal terms and price change policies?

### Integration Dependencies
- [ ] Effort required to switch to alternative payment gateway?
- [ ] API compatibility with other payment providers?
- [ ] Custom integration code portability?
- [ ] Customer experience impact during gateway migration?
- [ ] Parallel gateway testing capabilities?

---

## 12. Subscription & Recurring Payment Specifics

### Recurring Payment Management
- [ ] **CRITICAL**: Subscription payment failure retry logic and schedule?
- [ ] Customer notification system for failed recurring payments?
- [ ] Subscription modification capabilities (amount, frequency)?
- [ ] Prorated billing support for mid-cycle changes?
- [ ] Subscription cancellation and refund handling?
- [ ] Customer self-service portal for subscription management?

### Dunning Management
- [ ] Failed payment retry attempts and intervals?
- [ ] Grace period before subscription suspension?
- [ ] Customer communication during payment failures?
- [ ] Automatic subscription reactivation after successful payment?
- [ ] Partial payment acceptance for subscriptions?

---

## 13. Regulatory & Compliance Updates

### Regulatory Changes
- [ ] **CRITICAL**: How are RBI guideline changes communicated to merchants?
- [ ] Compliance update implementation timeline and merchant responsibilities?
- [ ] Impact of new regulations on existing integrations?
- [ ] Merchant training and support during regulatory changes?
- [ ] Cost implications of compliance updates?

### International Regulations
- [ ] **CRITICAL**: Do you accept international Visa/Mastercard payments?
- [ ] Which international card networks are supported (Visa/Mastercard/Amex/Discover)?
- [ ] Are there country restrictions for international payments (blocked countries list)?
- [ ] What are international transaction fees (percentage + fixed charges)?
- [ ] **CRITICAL**: Currency conversion markup percentage above interbank rates?
- [ ] Cross-border transaction fees (separate from regular transaction fees)?
- [ ] International card processing fees vs domestic card fees?
- [ ] Foreign exchange fluctuation risk - who bears it?
- [ ] International settlement charges and timeline?
- [ ] Correspondent banking charges for international transactions?
- [ ] SWIFT charges for international settlements?
- [ ] 3D Secure authentication support for international cards?
- [ ] International card transaction limits (min/max amounts)?
- [ ] KYC requirements for international transactions above certain amounts?
- [ ] Anti-money laundering (AML) checks for international payments?
- [ ] **CRITICAL**: TCS (Tax Collected at Source) on international transactions - rates and thresholds?
- [ ] International chargeback and dispute resolution process?
- [ ] Fraud protection for international transactions?
- [ ] Currency display options for international customers (USD, EUR, etc.)?
- [ ] International customer support availability and languages?
- [ ] Payment failure rates for international cards vs domestic?
- [ ] Impact of international payment regulations on cross-border transactions?
- [ ] Currency conversion compliance and reporting requirements?
- [ ] International tax implications and reporting support?
- [ ] Cross-border transaction monitoring and reporting?

---

## 14. Performance & Scalability

### Transaction Volume Handling
- [ ] **CRITICAL**: Transaction volume limits and scaling policies?
- [ ] Performance degradation during high-traffic periods?
- [ ] Load balancing and redundancy measures?
- [ ] Peak traffic handling capabilities (festival seasons, sales)?
- [ ] Volume-based pricing changes and notification policies?

### Geographic Coverage
- [ ] Service availability across all Indian states and territories?
- [ ] Performance variations in different geographic regions?
- [ ] Local payment method support by region?
- [ ] Regional compliance requirements and variations?

---

## 15. Competitive Analysis Questions

### Market Position
- [ ] How does PhonePe compare to Razorpay/Paytm in terms of reliability?
- [ ] Unique features or advantages over competitors?
- [ ] Market share and merchant satisfaction ratings?
- [ ] Innovation roadmap and upcoming features?
- [ ] Partnership ecosystem and third-party integrations?

### Pricing Competitiveness
- [ ] Price matching policies with competitors?
- [ ] Volume discount negotiations and criteria?
- [ ] Hidden cost comparison with other providers?
- [ ] Total cost of ownership analysis support?

---

## Action Items

### Immediate Clarifications Needed:
1. **Trial start and end dates** (exact dates and times)
2. **Fixed vs Variable charges** (monthly fees + per-transaction fees)
3. **GST during trial and post-trial** (rates and applicability)
4. **Webhook failure handling** (critical for payment confirmation)
5. **SLA compensation terms** (critical for business continuity)
6. **Recurring payment capabilities** (essential for Pro subscriptions)
7. **Contract termination terms** (exit strategy planning)
8. **Fraud liability coverage** (risk management)
9. **API reliability statistics** (uptime and performance data)
10. **Backup payment options** (risk mitigation)

### Documentation Required:
- [ ] Merchant agreement with all terms
- [ ] Technical integration guide
- [ ] API documentation with rate limits
- [ ] Compliance checklist
- [ ] Emergency contact information

---

**Notes**: Get all responses in writing. Consider legal review of merchant agreement before signing. Plan backup payment gateway integration for business continuity.

**Contact**: PhonePe Merchant Support  
**Follow-up Date**: ___________  
**Reviewed By**: ___________
