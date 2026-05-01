# Security Pipeline

This project uses four security gates:

1. `CI` workflow: `npm run build`, `npm test`, and `npm audit --audit-level=high`
2. `SAST and Secret Scan` workflow: CodeQL + Gitleaks
3. `DAST - OWASP ZAP Baseline` workflow
4. `Dependency Policy Gate` workflow: blocks merge when high/critical vulnerabilities are found

## Required repository configuration

- Add repository variable: `DAST_TARGET_URL`
  - Example: `https://staging-api.example.com`
- In branch protection rules, mark these checks as **required**:
  - `Build, Test, Audit`
  - `CodeQL`
  - `Gitleaks`
  - `ZAP baseline scan`
  - `Block high/critical vulnerabilities`

Without required status checks in branch protection, workflows run but cannot enforce merge blocking by themselves.
