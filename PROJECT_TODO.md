# Ticketing Serverless API - TODO

## Project Setup

- [x] Create GitHub repository
- [x] Initialize Node.js project
- [x] Configure TypeScript
- [x] Configure Serverless Framework v4
- [x] Configure AWS credentials
- [x] Configure initial Serverless deployment
- [x] Create health check endpoint
- [x] Deploy initial Lambda successfully

---

## Infrastructure as Code (IaC)

### Core Infrastructure

- [x] Create DynamoDB Events table
- [x] Configure IAM permissions for DynamoDB access
- [x] Configure environment variables
- [ ] Create DynamoDB Orders table
- [ ] Configure stage-based resource naming
- [ ] Configure production stage
- [ ] Configure CloudWatch log retention
- [ ] Configure Lambda environment separation (dev/prod)

### Serverless Organization

- [x] Separate serverless configuration files
- [ ] Separate functions by domain
- [ ] Separate resources by domain
- [ ] Separate IAM statements by domain

---

## Events Domain

### Entity & Validation

- [ ] Create Event entity
- [ ] Create Event types/interfaces
- [ ] Add Event validation rules
- [ ] Validate event price
- [ ] Validate available tickets
- [ ] Validate required fields

### Repository Layer

- [ ] Create EventRepository
- [ ] Implement create event
- [ ] Implement list events
- [ ] Implement get event by id
- [ ] Implement update event
- [ ] Implement delete event

### Service Layer

- [ ] Create EventService
- [ ] Implement business rules
- [ ] Handle domain errors
- [ ] Handle validation errors

### Lambda Handlers

- [ ] Create createEvent handler
- [ ] Create listEvents handler
- [ ] Create getEvent handler
- [ ] Create updateEvent handler
- [ ] Create deleteEvent handler

### API Gateway Routes

- [ ] POST /events
- [ ] GET /events
- [ ] GET /events/{id}
- [ ] PUT /events/{id}
- [ ] DELETE /events/{id}

### Testing Events API

- [ ] Test create event
- [ ] Test list events
- [ ] Test get event
- [ ] Test update event
- [ ] Test delete event

---

## Orders Domain

### Entity & Validation

- [ ] Create Order entity
- [ ] Create Order types/interfaces
- [ ] Create order statuses
- [ ] Validate order creation
- [ ] Validate ticket quantity

### Repository Layer

- [ ] Create OrderRepository
- [ ] Implement create order
- [ ] Implement get order
- [ ] Implement update order status

### Service Layer

- [ ] Create OrderService
- [ ] Implement payment flow logic
- [ ] Reserve tickets on order creation

### Lambda Handlers

- [ ] Create createCheckoutSession handler
- [ ] Create getOrder handler
- [ ] Create stripeWebhook handler

### API Gateway Routes

- [ ] POST /orders/checkout
- [ ] GET /orders/{id}
- [ ] POST /webhooks/stripe

---

## Stripe Integration

### Stripe Setup

- [ ] Create Stripe account
- [ ] Generate Stripe secret key
- [ ] Configure Stripe webhook secret
- [ ] Configure Stripe environment variables

### Checkout Flow

- [ ] Create Stripe Checkout Session
- [ ] Return checkout URL
- [ ] Persist Stripe session ID
- [ ] Persist Stripe payment intent ID

### Webhooks

- [ ] Validate Stripe webhook signature
- [ ] Handle checkout.session.completed
- [ ] Update order status to PAID
- [ ] Reduce available tickets
- [ ] Handle failed payments

### Local Testing

- [ ] Install Stripe CLI
- [ ] Test Stripe webhook locally
- [ ] Test successful payment flow

---

## CI/CD

### GitHub Actions

- [ ] Create GitHub Actions workflow
- [ ] Configure deploy on push to master
- [ ] Configure dev deployment
- [ ] Configure prod deployment
- [ ] Configure Node.js setup
- [ ] Configure dependency cache

### GitHub Secrets

- [ ] Add AWS_ACCESS_KEY_ID
- [ ] Add AWS_SECRET_ACCESS_KEY
- [ ] Add AWS_REGION
- [ ] Add STRIPE_SECRET_KEY
- [ ] Add STRIPE_WEBHOOK_SECRET

### Deployment Validation

- [ ] Validate automatic deployment
- [ ] Validate stage deployment
- [ ] Validate environment variables

---

## Observability

- [ ] Add structured logging
- [ ] Add error handling middleware
- [ ] Add request validation
- [ ] Add CloudWatch log monitoring

---

## Testing

### Unit Tests

- [ ] Add Jest
- [ ] Test EventService
- [ ] Test OrderService
- [ ] Test repositories

### Integration Tests

- [ ] Test Events API integration
- [ ] Test Orders API integration
- [ ] Test Stripe integration

---

## Documentation

### README

- [ ] Add project overview
- [ ] Add architecture explanation
- [ ] Add infrastructure explanation
- [ ] Add setup instructions
- [ ] Add deployment instructions
- [ ] Add environment variables
- [ ] Add API documentation
- [ ] Add example requests/responses
- [ ] Add CI/CD screenshots
- [ ] Add Stripe flow explanation

### Loom Video

- [ ] Record Loom walkthrough
- [ ] Explain architecture
- [ ] Explain Serverless Framework setup
- [ ] Explain DynamoDB design
- [ ] Explain Stripe integration
- [ ] Explain CI/CD pipeline

---

## Final Review

- [ ] Review folder structure
- [ ] Review naming consistency
- [ ] Remove dead code
- [ ] Review security basics
- [ ] Review environment variables
- [ ] Validate production deployment
- [ ] Final README review
- [ ] Final API test
