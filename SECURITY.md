# Security Policy

## Reporting a Vulnerability

Please report security issues privately to the repository owner through
GitHub. Do not open a public issue for vulnerabilities that expose secrets,
private documents, or user data.

When reporting, include:

- A short description of the issue.
- Steps to reproduce it.
- The affected area, such as backend API, frontend upload flow, local storage,
  SQLite persistence, or LLM integration.
- Any suggested mitigation, if known.

## Sensitive Data

HireMe.AI processes resumes, job descriptions, interview messages, and AI
generated feedback. Treat all of that content as sensitive.

Do not commit:

- Real resumes or job descriptions.
- DeepSeek API keys or other credentials.
- `.env` files.
- SQLite database files such as `backend/hireme.db`.
- Generated logs or exports containing personal data.

## LLM and Privacy Notes

Local usage sends resume, JD, interview, and related prompt content to the
configured DeepSeek-compatible API endpoint. Users are responsible for
reviewing their LLM provider's privacy and retention policies before using
real personal data.
