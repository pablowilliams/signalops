.PHONY: install dev test backtest api build

install:
	npm install
	python3 -m pip install -e '.[dev]'

dev:
	npm run dev

test:
	npm test

backtest:
	npm run backtest

api:
	PYTHONPATH=services/analytics uvicorn signalops.api:app --reload --port 8000

build:
	npm run build
