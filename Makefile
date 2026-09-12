.PHONY: install backend frontend test build check

install:
	cd frontend && npm ci

backend:
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && python -m unittest discover -s tests -p 'test_*.py'

build:
	cd frontend && npm run build

check:
	cd backend && python -m compileall -q app && python -m unittest discover -s tests -p 'test_*.py'
	cd frontend && npm run lint && npx tsc --noEmit && npm audit --audit-level=high
